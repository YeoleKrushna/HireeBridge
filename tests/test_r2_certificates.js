require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  try { dns.setDefaultResultOrder('ipv4first'); } catch {}
}
const { Resolver } = require('dns');
const publicDnsResolver = new Resolver();
try { publicDnsResolver.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
const origDnsLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  origDnsLookup(hostname, options, (err, address, family) => {
    if (!err && address) return callback(null, address, family);
    if (typeof hostname === 'string' && hostname.includes('neon.tech')) {
      return publicDnsResolver.resolve4(hostname, (resErr, addresses) => {
        if (!resErr && addresses && addresses.length > 0) {
          return callback(null, addresses[0], 4);
        }
        callback(err || resErr);
      });
    }
    callback(err, address, family);
  });
};

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const r2 = require('../utils/r2');
const db = require('../db');

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

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING COMPREHENSIVE R2 CERTIFICATE TEST SUITE');
  console.log('================================================================\n');

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
      failed++;
    }
  }

  // 1. R2 configuration validation
  await test('1. R2 configuration validation', () => {
    assert(r2.isConfigured() === true, 'r2.isConfigured() should be true when env variables are present');
    assert(typeof r2.getPdfKey === 'function', 'getPdfKey function must exist');
    assert(typeof r2.getJpgKey === 'function', 'getJpgKey function must exist');
    assert(typeof r2.getStorageLimitBytes === 'function', 'getStorageLimitBytes function must exist');
  });

  // 2. R2 connection test
  await test('2. R2 connection and bucket verification', async () => {
    const client = r2.getClient();
    assert(client !== null, 'R2 client instance should not be null');
    // Verify client can execute command
    const testKey = 'certificates/__test_probe__';
    const head = await r2.headObject(testKey);
    assert(head === null, 'Head probe for nonexistent object should return null');
  });

  // 3 & 4 & 5 & 6 & 9. Upload JPG & PDF with correct keys and content types
  const testCredId = `GR-TEST-${Date.now()}`;
  const testTmpDir = path.join(__dirname, 'scratch_test_r2');
  fs.mkdirSync(testTmpDir, { recursive: true });

  const testPdfPath = path.join(testTmpDir, 'test.pdf');
  const testJpgPath = path.join(testTmpDir, 'test.jpg');
  const dummyPdfContent = Buffer.from('%PDF-1.4 test certificate content for R2 validation');
  const dummyJpgContent = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPEG header
  fs.writeFileSync(testPdfPath, dummyPdfContent);
  fs.writeFileSync(testJpgPath, dummyJpgContent);

  let uploadedKeys = null;

  await test('3, 4, 5, 6, 9. Upload JPG/PDF, correct keys, content types, and verification', async () => {
    uploadedKeys = await r2.uploadCertificateArtifacts({
      credentialId: testCredId,
      pdfPath: testPdfPath,
      jpgPath: testJpgPath
    });

    assert(uploadedKeys.pdfKey === `certificates/${testCredId}/certificate.pdf`, `Unexpected PDF key: ${uploadedKeys.pdfKey}`);
    assert(uploadedKeys.jpgKey === `certificates/${testCredId}/certificate.jpg`, `Unexpected JPG key: ${uploadedKeys.jpgKey}`);
    assert(uploadedKeys.pdfSizeBytes === dummyPdfContent.length, 'PDF size mismatch in returned object');
    assert(uploadedKeys.jpgSizeBytes === dummyJpgContent.length, 'JPG size mismatch in returned object');

    // Head verification
    const pdfHead = await r2.headObject(uploadedKeys.pdfKey);
    assert(pdfHead !== null, 'PDF object must exist in R2');
    assert(pdfHead.contentType === 'application/pdf', `Expected application/pdf, got ${pdfHead.contentType}`);
    assert(pdfHead.size === dummyPdfContent.length, `Expected size ${dummyPdfContent.length}, got ${pdfHead.size}`);

    const jpgHead = await r2.headObject(uploadedKeys.jpgKey);
    assert(jpgHead !== null, 'JPG object must exist in R2');
    assert(jpgHead.contentType === 'image/jpeg', `Expected image/jpeg, got ${jpgHead.contentType}`);
    assert(jpgHead.size === dummyJpgContent.length, `Expected size ${dummyJpgContent.length}, got ${jpgHead.size}`);

    const arts = await r2.certificateArtifactsExist(testCredId);
    assert(arts.exists === true, 'certificateArtifactsExist must return true');
  });

  // 7 & 8. Presigned GET URL generation and expiry
  await test('7, 8. Presigned GET URL generation and functional retrieval', async () => {
    const presignedPdf = await r2.getPresignedDownloadUrl(uploadedKeys.pdfKey, {
      expiresIn: 600,
      filename: `Internship_Certificate_${testCredId}.pdf`
    });
    assert(typeof presignedPdf === 'string' && presignedPdf.startsWith('https://'), 'Presigned URL must be HTTPS');
    assert(presignedPdf.includes('X-Amz-Expires=600'), 'Presigned URL must have 600s expiry');

    // Download content from presigned URL
    const res = await fetchUrl(presignedPdf);
    assert(res.statusCode === 200, `Expected 200 from presigned URL, got ${res.statusCode}`);
    assert(res.body.toString().includes('%PDF-1.4 test certificate'), 'Downloaded body should match uploaded dummy PDF');
  });

  // 10. Same credential ID generates immutable keys
  await test('10. Same credential ID generates immutable keys', () => {
    const key1 = r2.getPdfKey(testCredId);
    const key2 = r2.getPdfKey(testCredId);
    assert(key1 === key2, 'Deterministic PDF key must be identical across calls');
    const jpgKey1 = r2.getJpgKey(testCredId);
    const jpgKey2 = r2.getJpgKey(testCredId);
    assert(jpgKey1 === jpgKey2, 'Deterministic JPG key must be identical across calls');
  });

  // 12. R2 upload failure handling (missing / 0-byte files)
  await test('12. R2 upload failure validation on missing or empty files', async () => {
    const emptyFile = path.join(testTmpDir, 'empty.pdf');
    fs.writeFileSync(emptyFile, '');
    let threw = false;
    try {
      await r2.uploadCertificateArtifacts({
        credentialId: 'GR-TEST-FAIL',
        pdfPath: emptyFile,
        jpgPath: testJpgPath
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('0 bytes'), `Unexpected error message: ${e.message}`);
    }
    assert(threw, 'Should throw error when artifact is 0 bytes');
  });

  // 14. Partial upload cleanup
  await test('14. Partial upload cleanup', async () => {
    // If JPG succeeds but PDF is missing, JPG must be deleted
    const missingPdf = path.join(testTmpDir, 'nonexistent.pdf');
    let threw = false;
    try {
      await r2.uploadCertificateArtifacts({
        credentialId: 'GR-TEST-PARTIAL',
        pdfPath: missingPdf,
        jpgPath: testJpgPath
      });
    } catch {
      threw = true;
    }
    assert(threw, 'Should have thrown on missing PDF');
    const orphanJpg = await r2.headObject(r2.getJpgKey('GR-TEST-PARTIAL'));
    assert(orphanJpg === null, 'Orphaned JPG should have been cleaned up or never uploaded');
  });

  // Clean up test certificate artifacts from R2
  await test('Cleanup test certificate artifacts from R2', async () => {
    const delRes = await r2.deleteCertificateArtifacts(testCredId);
    assert(delRes === true, 'deleteCertificateArtifacts should return true');
    const check = await r2.certificateArtifactsExist(testCredId);
    assert(check.exists === false, 'Artifacts must no longer exist after deletion');
  });

  // 11. Certificate DB record remains correct
  await test('11. Certificate DB record remains correct in PostgreSQL', async () => {
    await db.init();
    const cert = await db.getCertificateById('GR-DS-2026-5E9A52');
    assert(cert !== null, 'Certificate GR-DS-2026-5E9A52 must exist');
    assert(cert.credentialId === 'GR-DS-2026-5E9A52', 'credentialId mismatch');
    assert(cert.pdfKey === 'certificates/GR-DS-2026-5E9A52/certificate.pdf', `pdfKey mismatch: ${cert.pdfKey}`);
    assert(cert.jpgKey === 'certificates/GR-DS-2026-5E9A52/certificate.jpg', `jpgKey mismatch: ${cert.jpgKey}`);
    assert(cert.pdfSizeBytes === 183046, `pdfSizeBytes mismatch: ${cert.pdfSizeBytes}`);
    assert(cert.jpgSizeBytes === 573649, `jpgSizeBytes mismatch: ${cert.jpgSizeBytes}`);
  });

  // 15 & 16. Existing certificate migration and idempotency
  await test('15, 16. Existing certificate in R2 is verified and idempotent', async () => {
    const arts = await r2.certificateArtifactsExist('GR-DS-2026-5E9A52');
    assert(arts.exists === true, 'GR-DS-2026-5E9A52 must exist in R2');
    assert(arts.pdf.size === 183046, 'PDF size in R2 should match exact byte count');
    assert(arts.jpg.size === 573649, 'JPG size in R2 should match exact byte count');
  });

  // 10 (Storage Limit Guard). R2 storage safety limit
  await test('10 (Safety). R2 storage safety limit guard enforcement', async () => {
    const limitBytes = r2.getStorageLimitBytes();
    assert(limitBytes === 9 * 1024 * 1024 * 1024, `Expected 9 GB limit, got ${limitBytes}`);

    // Test rejection when incoming bytes exceed limit
    let limitThrew = false;
    try {
      await r2.checkStorageLimit(10 * 1024 * 1024 * 1024, async () => 0);
    } catch (e) {
      limitThrew = true;
      assert(e.code === 'R2_STORAGE_LIMIT_EXCEEDED', `Expected code R2_STORAGE_LIMIT_EXCEEDED, got ${e.code}`);
    }
    assert(limitThrew, 'checkStorageLimit must reject uploads exceeding configured capacity');

    // Test acceptance under limit
    const check = await r2.checkStorageLimit(1024, async () => 5000);
    assert(check.allowed === true, 'checkStorageLimit should allow normal upload within limits');
  });

  // 18 & 19. Student certificate preview & download redirects
  await test('18, 19. Presigned redirect generation for downloads', async () => {
    const pdfKey = r2.getPdfKey('GR-DS-2026-5E9A52');
    const jpgKey = r2.getJpgKey('GR-DS-2026-5E9A52');

    const pdfUrl = await r2.getPresignedDownloadUrl(pdfKey, {
      expiresIn: 600,
      filename: 'Internship_Certificate_GR-DS-2026-5E9A52.pdf'
    });
    const jpgUrl = await r2.getPresignedDownloadUrl(jpgKey, {
      expiresIn: 600,
      isInline: true
    });

    assert(pdfUrl.includes('response-content-disposition='), 'PDF download should have response-content-disposition');
    assert(jpgUrl.includes('response-content-disposition=inline'), 'JPG preview should have inline disposition');

    // Verify GET requests to these presigned URLs work
    const pdfRes = await fetchUrl(pdfUrl);
    assert(pdfRes.statusCode === 200, `Expected 200 on R2 PDF download, got ${pdfRes.statusCode}`);
    assert(pdfRes.body.length === 183046, `Expected 183046 bytes, got ${pdfRes.body.length}`);

    const jpgRes = await fetchUrl(jpgUrl);
    assert(jpgRes.statusCode === 200, `Expected 200 on R2 JPG preview, got ${jpgRes.statusCode}`);
    assert(jpgRes.body.length === 573649, `Expected 573649 bytes, got ${jpgRes.body.length}`);
  });

  // 20. Admin certificate access
  await test('20. Admin certificate retrieval includes R2 metadata', async () => {
    const allCerts = await db.getAllCertificates();
    assert(Array.isArray(allCerts) && allCerts.length >= 1, 'getAllCertificates should return array with certificates');
    const migrated = allCerts.find(c => c.credentialId === 'GR-DS-2026-5E9A52');
    assert(migrated !== undefined, 'GR-DS-2026-5E9A52 must be in allCerts');
    assert(migrated.pdfKey === 'certificates/GR-DS-2026-5E9A52/certificate.pdf', 'pdfKey must be set');
    assert(migrated.jpgKey === 'certificates/GR-DS-2026-5E9A52/certificate.jpg', 'jpgKey must be set');
    assert(migrated.pdfSizeBytes === 183046, 'pdfSizeBytes must be set');
    assert(migrated.jpgSizeBytes === 573649, 'jpgSizeBytes must be set');
  });

  // Clean up temporary local scratch files
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch {}

  if (db.pool) {
    await db.pool.end();
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
