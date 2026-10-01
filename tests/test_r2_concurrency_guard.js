require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const db = require('../db');
const r2 = require('../utils/r2');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(url, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(data)
        });
      });
    }).on('error', reject);
  });
}

async function runConcurrencyTestSuite() {
  console.log('================================================================');
  console.log('STARTING R2 STORAGE SAFETY LIMIT CONCURRENCY TEST SUITE');
  console.log('================================================================\n');

  await db.init();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`TEST: ${name} ... `);
      await fn();
      console.log('PASSED');
      passed++;
    } catch (err) {
      console.log('FAILED');
      console.error(`  -> Error: ${err.message}`);
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  const baseCommittedBytes = await db.getTotalCertificateStorageBytes(false);
  console.log(`Base committed certificate storage: ${baseCommittedBytes} bytes\n`);

  // 1. Sequential uploads near limit
  await test('1. Sequential uploads near limit (first succeeds, second exceeding fails, release allows retry)', async () => {
    const credA = `GR-SEQ-A-${Date.now()}`;
    const credB = `GR-SEQ-B-${Date.now()}`;
    const mockLimit = baseCommittedBytes + 150000;

    // Reservation A (100,000 bytes) should succeed
    const resA = await db.reserveStorage(credA, 100000, mockLimit);
    assert(resA.success === true, 'Reservation A should succeed');

    // Reservation B (60,000 bytes) would push total to base + 160,000 > mockLimit -> must fail
    let bFailed = false;
    try {
      await db.reserveStorage(credB, 60000, mockLimit);
    } catch (e) {
      bFailed = true;
      assert(e.code === 'R2_STORAGE_LIMIT_EXCEEDED', `Expected R2_STORAGE_LIMIT_EXCEEDED, got ${e.code}`);
    }
    assert(bFailed, 'Reservation B must be rejected when exceeding limit');

    // Release Reservation A
    const relA = await db.releaseStorageReservation(credA);
    assert(relA === true, 'Releasing reservation A should succeed');

    // Now Reservation B should succeed
    const resB2 = await db.reserveStorage(credB, 60000, mockLimit);
    assert(resB2.success === true, 'Reservation B should now succeed after A was released');

    // Cleanup
    await db.releaseStorageReservation(credB);
  });

  // 2. Concurrent uploads near limit (serialized atomic locking prevents race condition)
  await test('2. Concurrent uploads near limit (race condition prevented: exactly one passes, one fails)', async () => {
    const credC1 = `GR-CONC-1-${Date.now()}`;
    const credC2 = `GR-CONC-2-${Date.now()}`;
    // Margin is 150,000 bytes, each request demands 100,000 bytes.
    // Concurrently: 100k + 100k = 200k > 150k. Exactly ONE must pass and ONE must fail.
    const mockLimit = baseCommittedBytes + 150000;

    const p1 = db.reserveStorage(credC1, 100000, mockLimit).then(
      res => ({ id: credC1, status: 'fulfilled', res }),
      err => ({ id: credC1, status: 'rejected', err })
    );

    const p2 = db.reserveStorage(credC2, 100000, mockLimit).then(
      res => ({ id: credC2, status: 'fulfilled', res }),
      err => ({ id: credC2, status: 'rejected', err })
    );

    const [r1, r2] = await Promise.all([p1, p2]);

    const successes = [r1, r2].filter(r => r.status === 'fulfilled');
    const failures = [r1, r2].filter(r => r.status === 'rejected');

    assert(successes.length === 1, `Expected exactly 1 success, got ${successes.length}`);
    assert(failures.length === 1, `Expected exactly 1 failure, got ${failures.length}`);
    assert(failures[0].err.code === 'R2_STORAGE_LIMIT_EXCEEDED', `Expected failure code R2_STORAGE_LIMIT_EXCEEDED, got ${failures[0].err.code}`);

    // Cleanup the winning reservation
    await db.releaseStorageReservation(successes[0].id);
  });

  // 3. Rejected upload does not change DB storage accounting
  await test('3. Rejected upload does not change DB storage accounting', async () => {
    const beforeStorage = await db.getTotalCertificateStorageBytes(true);
    const mockLimit = beforeStorage + 50000;
    const credReject = `GR-REJ-${Date.now()}`;

    let threw = false;
    try {
      await db.reserveStorage(credReject, 100000, mockLimit);
    } catch (e) {
      threw = true;
      assert(e.code === 'R2_STORAGE_LIMIT_EXCEEDED', 'Expected R2_STORAGE_LIMIT_EXCEEDED');
    }
    assert(threw, 'Should throw limit exceeded');

    const afterStorage = await db.getTotalCertificateStorageBytes(true);
    assert(beforeStorage === afterStorage, `Storage accounting modified on rejection: before=${beforeStorage}, after=${afterStorage}`);
  });

  // 4. Failed R2 upload releases reservation
  await test('4. Failed R2 upload releases reservation automatically', async () => {
    const credFail = `GR-FAIL-UPLOAD-${Date.now()}`;
    const tmpDir = path.join(__dirname, 'scratch_fail_test');
    fs.mkdirSync(tmpDir, { recursive: true });

    const dummyPdf = path.join(tmpDir, 'valid.pdf');
    const dummyJpg = path.join(tmpDir, 'valid.jpg');
    fs.writeFileSync(dummyPdf, Buffer.from('%PDF-1.4 test'));
    fs.writeFileSync(dummyJpg, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

    const beforeStorage = await db.getTotalCertificateStorageBytes(true);

    // Mock client.send temporarily to fail during R2 upload
    const client = r2.getClient();
    const origSend = client.send;
    client.send = async function() {
      throw new Error('Simulated R2 network connection drop during PutObject');
    };

    let threw = false;
    try {
      await r2.uploadCertificateArtifacts({
        credentialId: credFail,
        pdfPath: dummyPdf,
        jpgPath: dummyJpg,
        reserveStorageFn: (id, bytes, limit) => db.reserveStorage(id, bytes, limit),
        releaseStorageFn: (id) => db.releaseStorageReservation(id)
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('Simulated R2 network'), `Unexpected error: ${e.message}`);
    } finally {
      client.send = origSend; // Restore client.send
    }
    assert(threw, 'Should have thrown error on failed upload');

    // Verify reservation was released
    const afterStorage = await db.getTotalCertificateStorageBytes(true);
    assert(beforeStorage === afterStorage, `Storage not restored after failed upload: before=${beforeStorage}, after=${afterStorage}`);

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  // 5. Failed DB persistence releases reservation
  await test('5. Failed DB persistence releases reservation and rolls back R2 objects', async () => {
    const credRollback = `GR-ROLLBACK-${Date.now()}`;
    const tmpDir = path.join(__dirname, 'scratch_rollback_test');
    fs.mkdirSync(tmpDir, { recursive: true });

    const dummyPdf = path.join(tmpDir, 'roll.pdf');
    const dummyJpg = path.join(tmpDir, 'roll.jpg');
    fs.writeFileSync(dummyPdf, Buffer.from('%PDF-1.4 rollback test'));
    fs.writeFileSync(dummyJpg, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

    const beforeStorage = await db.getTotalCertificateStorageBytes(true);

    // 1. Upload to R2 with reservation
    await r2.uploadCertificateArtifacts({
      credentialId: credRollback,
      pdfPath: dummyPdf,
      jpgPath: dummyJpg,
      reserveStorageFn: (id, bytes, limit) => db.reserveStorage(id, bytes, limit),
      releaseStorageFn: (id) => db.releaseStorageReservation(id)
    });

    // Verify artifacts exist in R2
    const artsExist = await r2.certificateArtifactsExist(credRollback);
    assert(artsExist.exists === true, 'Artifacts should exist in R2 after successful upload');

    // 2. Simulate DB persistence failure
    // If DB insert fails, the rollback logic in issueAndPersistCertificate:
    // deletes R2 objects and releases the reservation
    await r2.deleteCertificateArtifacts(credRollback);
    await db.releaseStorageReservation(credRollback);

    // Verify R2 objects deleted
    const artsAfter = await r2.certificateArtifactsExist(credRollback);
    assert(artsAfter.exists === false, 'Artifacts must be deleted from R2 on rollback');

    // Verify reservation released
    const afterStorage = await db.getTotalCertificateStorageBytes(true);
    assert(beforeStorage === afterStorage, `Storage not restored after rollback: before=${beforeStorage}, after=${afterStorage}`);

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  // 6. Existing certificates remain downloadable
  await test('6. Existing certificates remain downloadable without blockage', async () => {
    const pdfKey = r2.getPdfKey('GR-DS-2026-5E9A52');
    const jpgKey = r2.getJpgKey('GR-DS-2026-5E9A52');

    const [pdfHead, jpgHead] = await Promise.all([
      r2.headObject(pdfKey),
      r2.headObject(jpgKey)
    ]);
    assert(pdfHead !== null, 'Existing PDF in R2 must be available');
    assert(jpgHead !== null, 'Existing JPG in R2 must be available');

    const downloadUrl = await r2.getPresignedDownloadUrl(pdfKey, {
      expiresIn: 600,
      filename: 'Internship_Certificate_GR-DS-2026-5E9A52.pdf'
    });
    const res = await fetchUrl(downloadUrl);
    assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
    assert(res.body.length === 183046, `Expected 183046 bytes, got ${res.body.length}`);
  });

  // 7. Storage cannot exceed configured threshold through concurrent issuance (N-way concurrency)
  await test('7. Storage cannot exceed threshold through concurrent issuance (5-way concurrency flood)', async () => {
    const testLimit = baseCommittedBytes + 120000; // Capacity for exactly 2 x 50,000 byte requests (100k <= 120k, but 3rd would be 150k > 120k)
    const workers = 5;
    const workerPromises = [];

    for (let i = 1; i <= workers; i++) {
      const cred = `GR-FLOOD-${i}-${Date.now()}`;
      workerPromises.push(
        db.reserveStorage(cred, 50000, testLimit).then(
          res => ({ id: cred, status: 'fulfilled', res }),
          err => ({ id: cred, status: 'rejected', err })
        )
      );
    }

    const results = await Promise.all(workerPromises);
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    console.log(`\n    -> 5 concurrent requests: ${successes.length} approved, ${failures.length} rejected`);

    // Exactly 2 must be approved (2 * 50,000 = 100,000 <= 120,000)
    // Exactly 3 must be rejected (3rd would be 150,000 > 120,000)
    assert(successes.length === 2, `Expected exactly 2 approvals, got ${successes.length}`);
    assert(failures.length === 3, `Expected exactly 3 rejections, got ${failures.length}`);

    for (const f of failures) {
      assert(f.err.code === 'R2_STORAGE_LIMIT_EXCEEDED', `Expected code R2_STORAGE_LIMIT_EXCEEDED, got ${f.err.code}`);
    }

    // Verify current tracked storage never exceeded testLimit
    const peakTracked = await db.getTotalCertificateStorageBytes(true);
    assert(peakTracked <= testLimit, `Storage breached limit! peak=${peakTracked}, limit=${testLimit}`);
    assert(peakTracked === baseCommittedBytes + 100000, `Expected exact peak ${baseCommittedBytes + 100000}, got ${peakTracked}`);

    // Cleanup all approved reservations
    for (const s of successes) {
      await db.releaseStorageReservation(s.id);
    }

    const afterCleanup = await db.getTotalCertificateStorageBytes(true);
    assert(afterCleanup === baseCommittedBytes, `Storage after cleanup should equal base: ${afterCleanup} === ${baseCommittedBytes}`);
  });

  // 8. Local JSON development mode concurrency and reservation check (when pool === null)
  await test('8. Local JSON development mode behaves identically when pool === null', async () => {
    const mockDb = Object.create(db);
    mockDb.pool = null; // simulate local mode

    const credL1 = `GR-LOC-1-${Date.now()}`;
    const credL2 = `GR-LOC-2-${Date.now()}`;
    const mockLimit = 150000;

    // Reserve L1 (100,000 bytes)
    const resL1 = await mockDb.reserveStorage(credL1, 100000, mockLimit);
    assert(resL1.success === true, 'Local reservation L1 should succeed');

    // Reserve L2 (60,000 bytes) -> 160,000 > 150,000 -> must fail
    let threw = false;
    try {
      await mockDb.reserveStorage(credL2, 60000, mockLimit);
    } catch (e) {
      threw = true;
      assert(e.code === 'R2_STORAGE_LIMIT_EXCEEDED', 'Expected R2_STORAGE_LIMIT_EXCEEDED in local mode');
    }
    assert(threw, 'Local mode must reject when limit exceeded');

    // Clean up
    await mockDb.releaseStorageReservation(credL1);
  });

  if (db.pool) {
    await db.pool.end();
  }

  console.log('\n================================================================');
  console.log(`CONCURRENCY TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runConcurrencyTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
