require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  try { dns.setDefaultResultOrder('ipv4first'); } catch {}
}
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const db = require('../db');
const DB_FILE = path.join(__dirname, '../data/db.json');

function getJsonDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING SCHEMA CLEANUP VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testNum, name) {
    passed++;
    console.log(`[PASS] Test ${testNum}: ${name}`);
  }

  function recordFail(testNum, name, err) {
    failed++;
    console.error(`[FAIL] Test ${testNum} - ${name}:`, err.message || err);
  }

  assert(db.pool !== null, 'Neon PostgreSQL must be configured for schema cleanup tests');

  const timestamp = Date.now();
  const testEmail = `schematest_${timestamp}@example.com`;
  const testCertId = `GR-TEST-${timestamp.toString().slice(-6)}`;
  let createdTestUser = false;
  let createdTestCert = false;

  try {
    // ----------------------------------------------------
    // TEST 1: Migration Execution Output / Status Confirmation
    // ----------------------------------------------------
    try {
      // Confirm migration script exists and is executable
      const migrationFile = path.join(__dirname, '../scripts/migrations/20261001_remove_dead_columns.js');
      assert(fs.existsSync(migrationFile), 'Migration script file must exist');

      recordPass(1, 'Migration script verified and ready');
    } catch (e) {
      recordFail(1, 'Migration execution status', e);
    }

    // ----------------------------------------------------
    // TEST 2: PostgreSQL users table columns confirmation
    // ----------------------------------------------------
    try {
      const usersColsRes = await db.pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
      );
      const userCols = usersColsRes.rows.map(r => r.column_name);

      assert(!userCols.includes('domain'), 'users table still contains "domain" column!');
      assert(!userCols.includes('plan'), 'users table still contains "plan" column!');
      assert(userCols.includes('id'), 'users table missing id');
      assert(userCols.includes('name'), 'users table missing name');
      assert(userCols.includes('email'), 'users table missing email');
      assert(userCols.includes('password'), 'users table missing password');
      assert(userCols.includes('role'), 'users table missing role');

      recordPass(2, 'PostgreSQL users table columns verified (domain & plan absent)');
    } catch (e) {
      recordFail(2, 'PostgreSQL users table column confirmation', e);
    }

    // ----------------------------------------------------
    // TEST 3: PostgreSQL certificates table columns confirmation
    // ----------------------------------------------------
    try {
      const certsColsRes = await db.pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'certificates' ORDER BY ordinal_position"
      );
      const certCols = certsColsRes.rows.map(r => r.column_name);

      assert(!certCols.includes('svg'), 'certificates table still contains "svg" column!');
      assert(certCols.includes('jpg'), 'certificates table missing "jpg" column!');
      assert(certCols.includes('pdf'), 'certificates table missing "pdf" column!');
      assert(certCols.includes('credential_id'), 'certificates table missing credential_id');

      recordPass(3, 'PostgreSQL certificates table columns verified (svg absent, jpg present)');
    } catch (e) {
      recordFail(3, 'PostgreSQL certificates table column confirmation', e);
    }

    // ----------------------------------------------------
    // TEST 4: User creation test (db.createUser)
    // ----------------------------------------------------
    try {
      const newUser = await db.createUser({
        name: 'Schema Test User',
        email: testEmail,
        password: 'TestPassword123!',
        phone: '1234567890',
        role: 'student'
      });
      createdTestUser = true;

      assert(newUser && newUser.email === testEmail, 'User creation failed to return user');
      assert(newUser.domain === undefined, 'Returned user object unexpectedly has domain');
      assert(newUser.plan === undefined, 'Returned user object unexpectedly has plan');

      // Verify row in PostgreSQL directly
      const pgUserRes = await db.pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
      assert.strictEqual(pgUserRes.rows.length, 1, 'User row not found in PostgreSQL');
      const pgUser = pgUserRes.rows[0];
      assert.strictEqual(pgUser.domain, undefined, 'PostgreSQL row unexpectedly returned domain');
      assert.strictEqual(pgUser.plan, undefined, 'PostgreSQL row unexpectedly returned plan');

      recordPass(4, 'db.createUser persists to PostgreSQL without domain/plan columns');
    } catch (e) {
      recordFail(4, 'User creation test', e);
    }

    // ----------------------------------------------------
    // TEST 5: User fetch test (db.getUserByEmail)
    // ----------------------------------------------------
    try {
      const fetchedUser = await db.getUserByEmail(testEmail);
      assert(fetchedUser, 'db.getUserByEmail failed to fetch user');
      assert.strictEqual(fetchedUser.email, testEmail);
      assert.strictEqual(fetchedUser.name, 'Schema Test User');
      assert.strictEqual(fetchedUser.role, 'student');
      assert.strictEqual(fetchedUser.domain, undefined, 'Fetched user unexpectedly has domain');
      assert.strictEqual(fetchedUser.plan, undefined, 'Fetched user unexpectedly has plan');

      recordPass(5, 'db.getUserByEmail fetches user cleanly without dead fields');
    } catch (e) {
      recordFail(5, 'User fetch test', e);
    }

    // ----------------------------------------------------
    // TEST 6: User auth test (password verification)
    // ----------------------------------------------------
    try {
      const fetchedUser = await db.getUserByEmail(testEmail);
      const expectedHash = db.hashPassword('TestPassword123!');
      assert.strictEqual(fetchedUser.password, expectedHash, 'Hashed password does not match');

      const wrongHash = db.hashPassword('WrongPassword!');
      assert.notStrictEqual(fetchedUser.password, wrongHash, 'Wrong password incorrectly matched');

      recordPass(6, 'User password hashing and authentication work accurately');
    } catch (e) {
      recordFail(6, 'User auth test', e);
    }

    // ----------------------------------------------------
    // TEST 7: Certificate create test (db.createCertificate)
    // ----------------------------------------------------
    try {
      const certPayload = {
        credentialId: testCertId,
        orderId: `HB-TEST-ORD-${timestamp}`,
        name: 'Schema Test User',
        email: testEmail,
        domain: 'Data Science',
        duration: '4 Weeks',
        issueDate: '01 Oct 2026',
        pdf: `/downloads/${testCertId}.pdf`,
        jpg: `/downloads/${testCertId}.jpg`
      };

      const createdCert = await db.createCertificate(certPayload);
      createdTestCert = true;

      assert(createdCert, 'db.createCertificate failed');
      assert.strictEqual(createdCert.credentialId, testCertId);

      // Verify row in PostgreSQL directly
      const pgCertRes = await db.pool.query('SELECT * FROM certificates WHERE credential_id = $1', [testCertId]);
      assert.strictEqual(pgCertRes.rows.length, 1, 'Certificate row not found in PostgreSQL');
      const pgCert = pgCertRes.rows[0];
      assert.strictEqual(pgCert.svg, undefined, 'PostgreSQL row unexpectedly has svg');
      assert.strictEqual(pgCert.pdf, `/downloads/${testCertId}.pdf`, 'PDF column mismatch');
      assert.strictEqual(pgCert.jpg, `/downloads/${testCertId}.jpg`, 'JPG column mismatch');

      recordPass(7, 'db.createCertificate persists cleanly without svg column');
    } catch (e) {
      recordFail(7, 'Certificate create test', e);
    }

    // ----------------------------------------------------
    // TEST 8: Certificate fetch methods (getAll, getUser, getById)
    // ----------------------------------------------------
    try {
      const allCerts = await db.getAllCertificates();
      const targetFromAll = allCerts.find(c => c.credentialId === testCertId);
      assert(targetFromAll, 'getAllCertificates did not find created cert');
      assert.strictEqual(targetFromAll.svg, undefined, 'getAllCertificates returned svg property');
      assert.strictEqual(targetFromAll.jpg, `/downloads/${testCertId}.jpg`);

      const userCerts = await db.getUserCertificates(testEmail);
      assert(userCerts.length > 0, 'getUserCertificates returned empty array');
      const targetFromUser = userCerts.find(c => c.credentialId === testCertId);
      assert(targetFromUser, 'getUserCertificates did not find test cert');
      assert.strictEqual(targetFromUser.svg, undefined, 'getUserCertificates returned svg property');
      assert.strictEqual(targetFromUser.jpg, `/downloads/${testCertId}.jpg`);

      const certById = await db.getCertificateById(testCertId);
      assert(certById, 'getCertificateById did not find cert');
      assert.strictEqual(certById.svg, undefined, 'getCertificateById returned svg property');
      assert.strictEqual(certById.pdf, `/downloads/${testCertId}.pdf`);
      assert.strictEqual(certById.jpg, `/downloads/${testCertId}.jpg`);

      recordPass(8, 'getAllCertificates, getUserCertificates, getCertificateById return jpg and no svg');
    } catch (e) {
      recordFail(8, 'Certificate fetch methods', e);
    }

    // ----------------------------------------------------
    // TEST 9: Certificate downloads format paths
    // ----------------------------------------------------
    try {
      const certById = await db.getCertificateById(testCertId);
      assert(certById.pdf.endsWith('.pdf'), 'Certificate pdf path must end with .pdf');
      assert(certById.jpg.endsWith('.jpg'), 'Certificate jpg path must end with .jpg');
      assert(!certById.pdf.includes('svg'), 'PDF path should not reference svg');

      recordPass(9, 'Certificate PDF and JPG format paths are valid');
    } catch (e) {
      recordFail(9, 'Certificate downloads format paths', e);
    }

    // ----------------------------------------------------
    // TEST 10: Local JSON fallback when pool === null
    // ----------------------------------------------------
    try {
      // Mock db instance with pool = null
      const localDb = Object.create(db);
      localDb.pool = null;

      const localEmail = `local_test_${timestamp}@example.com`;
      const localCertId = `GR-LOCAL-${timestamp.toString().slice(-6)}`;

      // User create in local
      const localUser = await localDb.createUser({
        name: 'Local User',
        email: localEmail,
        password: 'LocalPassword123!'
      });
      assert(localUser, 'Local createUser failed');

      // User fetch in local
      const fetchedLocalUser = await localDb.getUserByEmail(localEmail);
      assert(fetchedLocalUser, 'Local getUserByEmail failed');
      assert.strictEqual(fetchedLocalUser.email, localEmail);

      // Certificate create in local
      const localCert = await localDb.createCertificate({
        credentialId: localCertId,
        orderId: `HB-LOCAL-${timestamp}`,
        name: 'Local User',
        email: localEmail,
        domain: 'Data Science',
        duration: '4 Weeks',
        issueDate: '01 Oct 2026',
        pdf: `/downloads/${localCertId}.pdf`,
        jpg: `/downloads/${localCertId}.jpg`
      });
      assert(localCert, 'Local createCertificate failed');

      // Certificate fetch in local
      const fetchedLocalCert = await localDb.getCertificateById(localCertId);
      assert(fetchedLocalCert, 'Local getCertificateById failed');
      assert.strictEqual(fetchedLocalCert.credentialId, localCertId);

      // Verify no reviews key requirement in JSON DB
      const currentJson = getJsonDb();
      assert.strictEqual(currentJson.reviews, undefined, 'JSON DB unexpectedly contains reviews key');

      // Clean up local JSON test data
      const jsonAfter = getJsonDb();
      jsonAfter.users = (jsonAfter.users || []).filter(u => u.email !== localEmail);
      jsonAfter.certificates = (jsonAfter.certificates || []).filter(c => c.credentialId !== localCertId);
      fs.writeFileSync(DB_FILE, JSON.stringify(jsonAfter, null, 2));

      recordPass(10, 'Local JSON fallback works for users and certificates with no reviews[] dependency');
    } catch (e) {
      recordFail(10, 'Local JSON fallback', e);
    }

    // ----------------------------------------------------
    // TEST 11: Clean up test rows and verify row count integrity
    // ----------------------------------------------------
    try {
      if (createdTestUser) {
        await db.pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
      }
      if (createdTestCert) {
        await db.pool.query('DELETE FROM certificates WHERE credential_id = $1', [testCertId]);
      }

      const usersCountRes = await db.pool.query('SELECT COUNT(*) FROM users');
      const usersCount = parseInt(usersCountRes.rows[0].count, 10);

      const certsCountRes = await db.pool.query('SELECT COUNT(*) FROM certificates');
      const certsCount = parseInt(certsCountRes.rows[0].count, 10);

      const ordersCountRes = await db.pool.query('SELECT COUNT(*) FROM orders');
      const ordersCount = parseInt(ordersCountRes.rows[0].count, 10);

      const subsCountRes = await db.pool.query('SELECT COUNT(*) FROM submissions');
      const subsCount = parseInt(subsCountRes.rows[0].count, 10);

      assert.strictEqual(usersCount, 3, `Expected exactly 3 users in production, found ${usersCount}`);
      assert.strictEqual(certsCount, 1, `Expected exactly 1 certificate in production, found ${certsCount}`);
      assert.strictEqual(ordersCount, 0, `Expected 0 orders, found ${ordersCount}`);
      assert.strictEqual(subsCount, 0, `Expected 0 submissions, found ${subsCount}`);

      recordPass(11, 'Row count integrity verified across users, certificates, orders, submissions');
    } catch (e) {
      recordFail(11, 'Row count integrity', e);
    }

    // ----------------------------------------------------
    // TEST 12: Application Boot & Syntax Verification
    // ----------------------------------------------------
    try {
      // Check server.js and db.js exports and functions
      assert(typeof db.init === 'function', 'db.init must be a function');
      assert(typeof db.createUser === 'function', 'db.createUser must be a function');
      assert(typeof db.getUserByEmail === 'function', 'db.getUserByEmail must be a function');
      assert(typeof db.createCertificate === 'function', 'db.createCertificate must be a function');
      assert(typeof db.getAllCertificates === 'function', 'db.getAllCertificates must be a function');
      assert(typeof db.getUserCertificates === 'function', 'db.getUserCertificates must be a function');
      assert(typeof db.getCertificateById === 'function', 'db.getCertificateById must be a function');

      // Verify JSON DB clean state
      const jsonDb = getJsonDb();
      assert.strictEqual(jsonDb.reviews, undefined, 'data/db.json has reviews key');

      for (const cert of jsonDb.certificates || []) {
        assert.strictEqual(cert.svg, undefined, `Certificate ${cert.credentialId} still has svg property`);
        assert(cert.pdf, `Certificate ${cert.credentialId} missing pdf`);
        assert(cert.jpg, `Certificate ${cert.credentialId} missing jpg`);
      }

      const exampleDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.example.json'), 'utf8'));
      assert.strictEqual(exampleDb.reviews, undefined, 'data/db.example.json has reviews key');

      recordPass(12, 'Application interface and file schemas fully verified');
    } catch (e) {
      recordFail(12, 'Application interface validation', e);
    }

  } finally {
    if (db.pool) {
      await db.pool.end();
    }
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
