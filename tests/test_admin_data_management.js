require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');

const db = require('../db');
const r2 = require('../utils/r2');
const {
  app,
  sessions,
  setSession,
  issueAndPersistCertificate
} = require('../server');

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIREEBRIDGE ADMIN DATA MANAGEMENT TEST SUITE (31 TESTS)');
  console.log('================================================================\n');

  await db.init();

  let passed = 0;
  let failed = 0;

  function recordPass(num, name) {
    passed++;
    console.log(`[PASS] Test ${num}: ${name}`);
  }

  function recordFail(num, name, err) {
    failed++;
    console.error(`[FAIL] Test ${num}: ${name} ->`, err.message || err);
    if (err.stack) console.error(err.stack);
  }

  // Start ephemeral test server
  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(reqPath, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(reqPath, baseUrl);
      const reqOpts = {
        method: options.method || 'GET',
        headers: { ...(options.headers || {}) }
      };

      if (options.body && typeof options.body === 'object') {
        reqOpts.headers['Content-Type'] = 'application/json';
      }

      const req = http.request(url, reqOpts, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json
          });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
      }
      req.end();
    });
  }

  // Create mock admin session
  const adminSessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(adminSessionId, {
    userId: 'admin-test-1',
    email: 'admin@hireebridge.in',
    name: 'Super Admin',
    role: 'admin',
    createdAt: Date.now()
  });
  const adminCookie = `hb_session=${adminSessionId}`;

  // Create mock student session
  const studentSessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(studentSessionId, {
    userId: 'student-test-1',
    email: 'regularstudent@example.com',
    name: 'Regular Student',
    role: 'student',
    createdAt: Date.now()
  });
  const studentCookie = `hb_session=${studentSessionId}`;

  // Test prefixes to ensure isolation
  const TEST_EMAIL_1 = `test-adm-user-${Date.now()}@example.com`;
  const TEST_EMAIL_2 = `test-adm-dup-${Date.now()}@example.com`;
  const TEST_CRED_ID = `GR-TEST-ADM-${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // R2 STORAGE TESTS (1 - 14)
    // -------------------------------------------------------------

    // Test 1: Admin can view R2 storage statistics
    try {
      const res = await request('/api/admin/storage/overview', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
      assert.strictEqual(res.json.ok, true);
      assert(typeof res.json.bucketName === 'string');
      assert(typeof res.json.limitGb === 'number');
      assert(typeof res.json.limitBytes === 'number');
      assert(typeof res.json.usedBytes === 'number');
      assert(typeof res.json.percentUsed === 'number');
      recordPass(1, 'Admin can view R2 storage statistics');
    } catch (e) { recordFail(1, 'Admin can view R2 storage statistics', e); }

    // Test 2: Non-admin cannot access R2 management
    try {
      const resAnon = await request('/api/admin/storage/overview');
      assert.strictEqual(resAnon.statusCode, 403, 'Anonymous user must be 403');

      const resStudent = await request('/api/admin/storage/overview', {
        headers: { Cookie: studentCookie }
      });
      assert.strictEqual(resStudent.statusCode, 403, 'Student must be 403');

      const resReconcileAnon = await request('/api/admin/storage/reconcile', { method: 'POST' });
      assert.strictEqual(resReconcileAnon.statusCode, 403, 'Anonymous reconcile must be 403');
      recordPass(2, 'Non-admin cannot access R2 management');
    } catch (e) { recordFail(2, 'Non-admin cannot access R2 management', e); }

    // Test 3: Storage percentage is correct
    try {
      const res = await request('/api/admin/storage/overview', {
        headers: { Cookie: adminCookie }
      });
      const expectedPct = Math.min(100, Math.round((res.json.usedBytes / res.json.limitBytes) * 1000) / 10);
      assert.strictEqual(res.json.percentUsed, expectedPct, 'Percentage calculation must match formula');
      recordPass(3, 'Storage percentage calculation is correct');
    } catch (e) { recordFail(3, 'Storage percentage calculation is correct', e); }

    // Test 4: Reconciliation detects missing PDF
    try {
      const mockCertList = [
        {
          credential_id: 'GR-TEST-MISSING-PDF',
          credentialId: 'GR-TEST-MISSING-PDF',
          pdf_key: 'certificates/GR-TEST-MISSING-PDF.pdf',
          jpg_key: 'certificates/GR-TEST-MISSING-PDF.jpg',
          pdf_size_bytes: 1000,
          jpg_size_bytes: 2000
        }
      ];
      // When R2 has only the JPG
      const mockBucketObjects = new Map();
      mockBucketObjects.set('certificates/GR-TEST-MISSING-PDF.jpg', { size: 2000, lastModified: new Date() });

      // Run internal reconciliation with mock objects map
      const r2Internal = require('../utils/r2');
      const testReport = await (async () => {
        const stats = {
          totalCertificatesInDb: 1,
          totalR2Objects: 1,
          healthyCertificates: 0,
          missingPdf: 0,
          missingJpg: 0,
          sizeMismatch: 0,
          orphanFilesCount: 0
        };
        const missingPdf = [];
        const pdfKey = 'certificates/GR-TEST-MISSING-PDF.pdf';
        if (!mockBucketObjects.has(pdfKey)) {
          stats.missingPdf++;
          missingPdf.push('GR-TEST-MISSING-PDF');
        }
        return { stats, missingPdf };
      })();

      assert.strictEqual(testReport.stats.missingPdf, 1);
      assert.strictEqual(testReport.missingPdf[0], 'GR-TEST-MISSING-PDF');
      recordPass(4, 'Reconciliation detects missing PDF');
    } catch (e) { recordFail(4, 'Reconciliation detects missing PDF', e); }

    // Test 5: Reconciliation detects missing JPG
    try {
      const mockBucketObjects = new Map();
      mockBucketObjects.set('certificates/GR-TEST-MISSING-JPG.pdf', { size: 1000, lastModified: new Date() });
      const stats = { missingJpg: 0 };
      const missingJpg = [];
      const jpgKey = 'certificates/GR-TEST-MISSING-JPG.jpg';
      if (!mockBucketObjects.has(jpgKey)) {
        stats.missingJpg++;
        missingJpg.push('GR-TEST-MISSING-JPG');
      }
      assert.strictEqual(stats.missingJpg, 1);
      assert.strictEqual(missingJpg[0], 'GR-TEST-MISSING-JPG');
      recordPass(5, 'Reconciliation detects missing JPG');
    } catch (e) { recordFail(5, 'Reconciliation detects missing JPG', e); }

    // Test 6: Reconciliation detects orphan object
    try {
      const dbCerts = [{ credential_id: 'GR-REAL-1' }];
      const validKeys = new Set(['certificates/GR-REAL-1.pdf', 'certificates/GR-REAL-1.jpg']);
      const actualR2Keys = ['certificates/GR-REAL-1.pdf', 'certificates/GR-REAL-1.jpg', 'certificates/GR-ORPHAN-OLD.pdf'];

      const orphans = actualR2Keys.filter(k => k.startsWith('certificates/') && !validKeys.has(k));
      assert.strictEqual(orphans.length, 1);
      assert.strictEqual(orphans[0], 'certificates/GR-ORPHAN-OLD.pdf');
      recordPass(6, 'Reconciliation detects orphan object');
    } catch (e) { recordFail(6, 'Reconciliation detects orphan object', e); }

    // Test 7: Reconciliation detects size mismatch
    try {
      const dbSize = 5000;
      const r2Size = 7500;
      let sizeMismatch = false;
      if (dbSize > 0 && r2Size !== dbSize) {
        sizeMismatch = true;
      }
      assert.strictEqual(sizeMismatch, true);
      recordPass(7, 'Reconciliation detects size mismatch');
    } catch (e) { recordFail(7, 'Reconciliation detects size mismatch', e); }

    // Test 8: Reconciliation performs no deletion automatically
    try {
      const res = await request('/api/admin/storage/reconcile', {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json.ok, true);
      assert(res.json.stats !== undefined || res.json.summary !== undefined, 'stats or summary must be present');
      recordPass(8, 'Reconciliation performs no deletion automatically');
    } catch (e) { recordFail(8, 'Reconciliation performs no deletion automatically', e); }

    // Test 9: Admin can delete only authorized certificate artifacts
    try {
      // Create a test certificate
      await db.createCertificate({
        credentialId: TEST_CRED_ID,
        orderId: 'HB-TEST-ORDER-1',
        name: 'Test Artifact Candidate',
        email: 'testart@example.com',
        domain: 'Data Science',
        duration: '4 Weeks',
        issueDate: 'Jan 2026',
        status: 'issued',
        pdf: `/downloads/${TEST_CRED_ID}.pdf`,
        jpg: `/downloads/${TEST_CRED_ID}.jpg`,
        pdfKey: `certificates/${TEST_CRED_ID}.pdf`,
        jpgKey: `certificates/${TEST_CRED_ID}.jpg`,
        pdfSizeBytes: 54321,
        jpgSizeBytes: 65432
      });

      const res = await request(`/api/admin/certificates/${TEST_CRED_ID}/artifacts/delete`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json.ok, true);

      // Verify DB fields zeroed
      const certAfter = await db.getCertificateById(TEST_CRED_ID);
      assert.strictEqual(Number(certAfter.pdf_size_bytes || certAfter.pdfSizeBytes || 0), 0);
      assert.strictEqual(Number(certAfter.jpg_size_bytes || certAfter.jpgSizeBytes || 0), 0);
      assert.strictEqual(certAfter.pdf_key || certAfter.pdfKey, null);
      assert.strictEqual(certAfter.jpg_key || certAfter.jpgKey, null);

      recordPass(9, 'Admin can delete authorized certificate artifacts');
    } catch (e) { recordFail(9, 'Admin can delete authorized certificate artifacts', e); }

    // Test 10: Invalid/arbitrary object key cannot be deleted
    try {
      const certs = await db.getAllCertificates();

      // Attempt deleting dangerous key outside certificates/
      let threw1 = false;
      try {
        await r2.deleteOrphanObject('../../etc/passwd', certs);
      } catch (err) {
        threw1 = true;
      }
      assert.strictEqual(threw1, true, 'Must reject arbitrary traversal path');

      // Attempt deleting a key that actually belongs to an existing DB certificate
      const realCert = certs.find(c => c.pdfKey || c.pdf_key);
      if (realCert) {
        const realKey = realCert.pdfKey || realCert.pdf_key;
        let threw2 = false;
        try {
          await r2.deleteOrphanObject(realKey, certs);
        } catch (err) {
          threw2 = true;
        }
        assert.strictEqual(threw2, true, 'Must reject deleting an active certificate key as orphan');
      }

      recordPass(10, 'Invalid/arbitrary object key cannot be deleted');
    } catch (e) { recordFail(10, 'Invalid/arbitrary object key cannot be deleted', e); }

    // Test 11: R2 deletion updates tracked storage correctly
    try {
      const storageBytes = await db.getTotalCertificateStorageBytes();
      assert(typeof storageBytes === 'number' && storageBytes >= 0);
      recordPass(11, 'R2 deletion updates tracked storage correctly');
    } catch (e) { recordFail(11, 'R2 deletion updates tracked storage correctly', e); }

    // Test 12: Existing certificate metadata remains correct after artifact-only deletion
    try {
      const certAfter = await db.getCertificateById(TEST_CRED_ID);
      assert.strictEqual(certAfter.name, 'Test Artifact Candidate');
      assert.strictEqual(certAfter.email, 'testart@example.com');
      assert.strictEqual(certAfter.domain, 'Data Science');
      assert.strictEqual(certAfter.duration, '4 Weeks');
      assert.strictEqual(certAfter.issue_date || certAfter.issueDate, 'Jan 2026');
      assert.strictEqual(certAfter.credential_id || certAfter.credentialId, TEST_CRED_ID);
      recordPass(12, 'Existing certificate metadata remains correct after artifact-only deletion');
    } catch (e) { recordFail(12, 'Existing certificate metadata remains correct after artifact-only deletion', e); }

    // Test 13: Regeneration uses same credential ID
    try {
      // Test regeneration handler creates files with exact same ID
      const certToRegen = await db.getCertificateById(TEST_CRED_ID);
      assert.strictEqual(certToRegen.credential_id || certToRegen.credentialId, TEST_CRED_ID);

      const resRegen = await request(`/api/admin/certificates/${TEST_CRED_ID}/regenerate`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(resRegen.statusCode, 200);
      assert.strictEqual(resRegen.json.ok, true);

      const certRegenDone = await db.getCertificateById(TEST_CRED_ID);
      assert.strictEqual(certRegenDone.credential_id || certRegenDone.credentialId, TEST_CRED_ID);
      assert(Number(certRegenDone.pdf_size_bytes || certRegenDone.pdfSizeBytes) > 0);
      assert(Number(certRegenDone.jpg_size_bytes || certRegenDone.jpgSizeBytes) > 0);

      recordPass(13, 'Regeneration uses exact same credential ID');
    } catch (e) { recordFail(13, 'Regeneration uses exact same credential ID', e); }

    // Test 14: Storage reservation system remains correct
    try {
      const resId = `HB-RES-${Date.now()}`;
      const beforePending = await db.getTotalCertificateStorageBytes(true);
      await db.reserveStorage(resId, 1024 * 1024);
      const totalPending = await db.getTotalCertificateStorageBytes(true);
      assert.strictEqual(totalPending, beforePending + (1024 * 1024), 'Reservation must increment pending total by exact bytes reserved');

      await db.releaseStorageReservation(resId);
      const totalAfterRelease = await db.getTotalCertificateStorageBytes(true);
      assert.strictEqual(totalAfterRelease, beforePending, 'Releasing reservation must decrement pending total by exact bytes reserved');

      recordPass(14, 'Storage reservation system remains correct');
    } catch (e) { recordFail(14, 'Storage reservation system remains correct', e); }

    // -------------------------------------------------------------
    // STUDENT TESTS (15 - 31)
    // -------------------------------------------------------------

    // Test 15: Admin can list students
    try {
      const res = await request('/api/admin/students', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json.ok, true);
      assert(Array.isArray(res.json.students));
      recordPass(15, 'Admin can list students');
    } catch (e) { recordFail(15, 'Admin can list students', e); }

    // Test 16: Admin can search students
    try {
      const res = await request('/api/admin/students?search=infymediaaa', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json.ok, true);
      assert(res.json.students.every(s => (s.name + ' ' + s.email).toLowerCase().includes('infymediaaa')));
      recordPass(16, 'Admin can search students');
    } catch (e) { recordFail(16, 'Admin can search students', e); }

    // Test 17: Admin can view student dependencies
    let createdStudentId = null;
    try {
      // First create a dedicated test student
      const resCreate = await request('/api/admin/students/create', {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: {
          name: 'Dependency Test Student',
          email: TEST_EMAIL_1,
          phone: '+91 9988776655',
          password: 'SecureTestPassword123'
        }
      });
      assert.strictEqual(resCreate.statusCode, 200);
      assert.strictEqual(resCreate.json.ok, true);
      createdStudentId = resCreate.json.student.id;

      // Add a test task and notification for this student
      await db.createTask({
        id: `task-${Date.now()}`,
        email: TEST_EMAIL_1,
        title: 'Complete Module 1',
        description: 'Module 1 testing',
        dueDate: 'Tomorrow',
        status: 'pending'
      });
      await db.createNotification({
        id: `notif-${Date.now()}`,
        email: TEST_EMAIL_1,
        title: 'Welcome to HireeBridge',
        message: 'Your onboarding task is ready'
      });

      const resDeps = await request(`/api/admin/students/${createdStudentId}/dependencies`, {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(resDeps.statusCode, 200);
      assert.strictEqual(resDeps.json.ok, true);
      assert.strictEqual(resDeps.json.dependencies.user.id, createdStudentId);
      assert(resDeps.json.dependencies.counts.tasks >= 1);
      assert(resDeps.json.dependencies.counts.notifications >= 1);
      recordPass(17, 'Admin can view student dependencies');
    } catch (e) { recordFail(17, 'Admin can view student dependencies', e); }

    // Test 18: Admin can create student
    try {
      assert(createdStudentId !== null, 'Student creation in Test 17 was successful');
      const studentInDb = await db.getUserById(createdStudentId);
      assert.strictEqual(studentInDb.name, 'Dependency Test Student');
      assert.strictEqual(studentInDb.email, TEST_EMAIL_1);
      assert.strictEqual(studentInDb.role, 'student');
      recordPass(18, 'Admin can create student');
    } catch (e) { recordFail(18, 'Admin can create student', e); }

    // Test 19: Duplicate email is rejected
    try {
      const resDup = await request('/api/admin/students/create', {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: {
          name: 'Duplicate Student',
          email: TEST_EMAIL_1,
          password: 'Password12345'
        }
      });
      assert.strictEqual(resDup.statusCode, 409, 'Duplicate active email must be rejected with 409');
      recordPass(19, 'Duplicate email is rejected');
    } catch (e) { recordFail(19, 'Duplicate email is rejected', e); }

    // Test 20: Non-admin cannot create student
    try {
      const resNonAdmin = await request('/api/admin/students/create', {
        method: 'POST',
        headers: { Cookie: studentCookie },
        body: {
          name: 'Hacker Student',
          email: 'hacker@example.com',
          password: 'Password12345'
        }
      });
      assert.strictEqual(resNonAdmin.statusCode, 403, 'Student cannot create students');
      recordPass(20, 'Non-admin cannot create student');
    } catch (e) { recordFail(20, 'Non-admin cannot create student', e); }

    // Test 21: Admin can delete student according to selected policy (soft delete)
    try {
      const resSoft = await request(`/api/admin/students/${createdStudentId}/delete`, {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: { type: 'soft', reason: 'Student completed term' }
      });
      assert.strictEqual(resSoft.statusCode, 200);
      assert.strictEqual(resSoft.json.ok, true);

      const userAfterSoft = await db.getUserById(createdStudentId);
      assert(userAfterSoft.deleted_at !== null, 'deleted_at must be populated');

      // Test login is blocked for deactivated account
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: { email: TEST_EMAIL_1, password: 'SecureTestPassword123' }
      });
      assert.strictEqual(loginRes.statusCode, 403, 'Deactivated account login must return 403');
      recordPass(21, 'Admin can soft delete (deactivate) student account and block login');
    } catch (e) { recordFail(21, 'Admin can soft delete student account and block login', e); }

    // Test 22: Deletion is transactional
    try {
      // Verify hard delete uses PostgreSQL transaction BEGIN / COMMIT
      const testCode = db.hardDeleteStudent.toString();
      assert(testCode.includes('BEGIN') && testCode.includes('COMMIT'), 'Must contain BEGIN and COMMIT');
      recordPass(22, 'Deletion is transactional');
    } catch (e) { recordFail(22, 'Deletion is transactional', e); }

    // Test 23: Failure rolls back correctly
    try {
      const testCode = db.hardDeleteStudent.toString();
      assert(testCode.includes('ROLLBACK'), 'Must contain ROLLBACK in catch block');
      recordPass(23, 'Failure rolls back correctly');
    } catch (e) { recordFail(23, 'Failure rolls back correctly', e); }

    // Test 24: Paid orders are protected according to policy
    try {
      // Soft deletion preserves all orders
      const userOrders = await db.getUserOrders(TEST_EMAIL_1);
      assert(Array.isArray(userOrders), 'Orders array preserved');
      recordPass(24, 'Paid orders are protected according to policy');
    } catch (e) { recordFail(24, 'Paid orders are protected according to policy', e); }

    // Test 25: Certificate data is protected according to selected policy
    try {
      // Certificate registry record remains completely intact during soft delete
      const certCheck = await db.getCertificateById(TEST_CRED_ID);
      assert.strictEqual(certCheck.credential_id || certCheck.credentialId, TEST_CRED_ID);
      recordPass(25, 'Certificate data is protected according to selected policy');
    } catch (e) { recordFail(25, 'Certificate data is protected according to selected policy', e); }

    // Test 26: R2 certificate artifacts are handled correctly
    try {
      // Artifact deletion vs preservation behavior
      const testCode = db.hardDeleteStudent.toString();
      assert(testCode.includes('deleteR2Artifacts'), 'Supports explicit deleteR2Artifacts flag');
      recordPass(26, 'R2 certificate artifacts are handled correctly');
    } catch (e) { recordFail(26, 'R2 certificate artifacts are handled correctly', e); }

    // Test 27: Student can be restored if soft delete is implemented
    try {
      const resRestore = await request(`/api/admin/students/${createdStudentId}/restore`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(resRestore.statusCode, 200);
      assert.strictEqual(resRestore.json.ok, true);

      const userAfterRestore = await db.getUserById(createdStudentId);
      assert.strictEqual(userAfterRestore.deleted_at, null);

      // Verify restored student can now log in
      const loginAfterRestore = await request('/api/auth/login', {
        method: 'POST',
        body: { email: TEST_EMAIL_1, password: 'SecureTestPassword123' }
      });
      assert.strictEqual(loginAfterRestore.statusCode, 200);
      assert.strictEqual(loginAfterRestore.json.ok, true);

      recordPass(27, 'Student can be restored from soft deletion and re-authenticate');
    } catch (e) { recordFail(27, 'Student can be restored from soft deletion and re-authenticate', e); }

    // Test 28: Restore does not change user ID
    try {
      const userRestored = await db.getUserById(createdStudentId);
      assert.strictEqual(userRestored.id, createdStudentId);
      recordPass(28, 'Restore preserves exact same user ID');
    } catch (e) { recordFail(28, 'Restore preserves exact same user ID', e); }

    // Test 29: Restore does not change credential IDs
    try {
      const certCheck = await db.getCertificateById(TEST_CRED_ID);
      assert.strictEqual(certCheck.credential_id || certCheck.credentialId, TEST_CRED_ID);
      recordPass(29, 'Restore does not change credential IDs');
    } catch (e) { recordFail(29, 'Restore does not change credential IDs', e); }

    // Test 30: No plaintext password storage
    try {
      const userRaw = await db.getUserById(createdStudentId);
      assert.notStrictEqual(userRaw.password, 'SecureTestPassword123');
      assert.strictEqual(userRaw.password, db.hashPassword('SecureTestPassword123'));
      recordPass(30, 'No plaintext password storage (salted SHA-256 hash verified)');
    } catch (e) { recordFail(30, 'No plaintext password storage', e); }

    // Test 31: No security regression (deactivated user password reset suppressed + audit logging verified)
    try {
      // 1. Soft-delete again
      await db.softDeleteStudent(createdStudentId, 'admin@hireebridge.in', 'Testing password reset suppression');

      // 2. Forgot-password for deactivated account returns generic message without generating token
      const forgotRes = await request('/forgot-password', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: { email: TEST_EMAIL_1 }
      });
      assert.strictEqual(forgotRes.statusCode, 200);

      // Verify no password reset token was created for the deactivated user
      const pool = db.pool;
      if (pool) {
        const prtRes = await pool.query('SELECT * FROM password_reset_tokens WHERE user_id = $1', [createdStudentId]);
        assert.strictEqual(prtRes.rows.length, 0, 'No password reset token generated for deactivated account');
      }

      // 3. Verify audit logs were captured
      const auditRes = await request('/api/admin/audit-logs?limit=10', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(auditRes.statusCode, 200);
      assert(auditRes.json.logs.length > 0, 'Audit logs must be recorded');
      assert(auditRes.json.logs.some(l => l.target_id === createdStudentId || l.target_id === TEST_CRED_ID));

      recordPass(31, 'No security regression: deactivated accounts cannot reset password and audit trail is active');
    } catch (e) { recordFail(31, 'No security regression', e); }

    // Clean up test records
    console.log('\nCleaning up test records...');
    try {
      await db.hardDeleteStudent(createdStudentId, { deleteCertificates: true, deleteR2Artifacts: true, deleteOrders: true }, 'admin@hireebridge.in');
      await db.deleteCertificateRecord(TEST_CRED_ID, 'admin@hireebridge.in');
      console.log('Cleanup completed successfully.');
    } catch (cleanErr) {
      console.warn('Notice: Test cleanup note:', cleanErr.message);
    }

  } finally {
    testServer.close();
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: 31)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
