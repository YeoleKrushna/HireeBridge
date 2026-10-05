require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

const db = require('../db');
const { app, sessions } = require('../server');

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIREEBRIDGE STUDENT DELETION & ERASURE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testNum, name) {
    passed++;
    console.log(`[PASS] Test ${testNum}: ${name}`);
  }

  function recordFail(testNum, name, err) {
    failed++;
    console.error(`[FAIL] Test ${testNum}: ${name} ->`, err.message || err);
  }

  // 1. Static HTML & Client Script Inspections
  const serverJsPath = path.join(__dirname, '..', 'server.js');
  const serverSource = fs.readFileSync(serverJsPath, 'utf8');

  // Test 1: Student deletion UI internally submits requestType: 'erasure'
  try {
    assert.ok(serverSource.includes("requestType: 'erasure'"), "submitStudentDeletionRequest must send requestType: 'erasure'");
    assert.ok(!serverSource.includes("requestType: 'deletion'"), "requestType: 'deletion' must not exist in deletion submission");
    recordPass(1, "Student deletion UI internally submits requestType: 'erasure'");
  } catch (e) { recordFail(1, "Student deletion UI internally submits requestType: 'erasure'", e); }

  // Test 2: User-facing labels preserved
  try {
    assert.ok(serverSource.includes('Request Account Deletion &amp; Data Erasure') || serverSource.includes('Request Account Deletion & Data Erasure'), 'Heading label preserved');
    assert.ok(serverSource.includes('Submit Deletion Request'), 'Button label preserved');
    assert.ok(serverSource.includes('id="confirmDeletionCheck" required'), 'Confirmation checkbox exists and is required');
    recordPass(2, 'User-facing labels and confirmation checkbox preserved');
  } catch (e) { recordFail(2, 'User-facing labels and confirmation checkbox preserved', e); }

  // Test 3: Retention wording accurately distinguishes erasable data vs statutory records
  try {
    assert.ok(serverSource.includes('account credentials, profile details, and active task workspaces'), 'Explains data eligible for erasure');
    assert.ok(serverSource.includes('financial transaction records and tax invoices are retained for mandatory statutory accounting compliance (7 years)'), 'Explains financial retention');
    assert.ok(serverSource.includes('credential records for already-issued certificates are retained to ensure tamper-evident verification'), 'Explains certificate retention');
    recordPass(3, 'Retention notice accurately distinguishes erasable workspaces from statutory accounting and certificate verification');
  } catch (e) { recordFail(3, 'Retention notice accurately distinguishes erasable workspaces from statutory accounting and certificate verification', e); }

  // Test 4: /data-rights dropdown option updated to value="erasure"
  try {
    assert.ok(serverSource.includes('<option value="erasure">Erasure / Account Deletion Request</option>'), '/data-rights option value must be erasure');
    assert.ok(!serverSource.includes('<option value="deletion">'), 'option value="deletion" must be removed');
    recordPass(4, '/data-rights form dropdown option consistently uses value="erasure"');
  } catch (e) { recordFail(4, '/data-rights form dropdown option consistently uses value="erasure"', e); }

  // Start ephemeral server
  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  let ipCounter = 1;

  async function request(reqPath, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(reqPath, baseUrl);
      const reqOpts = {
        method: options.method || 'GET',
        headers: {
          'x-forwarded-for': `192.168.10.${ipCounter++}`,
          ...(options.headers || {})
        }
      };

      if (options.body && typeof options.body === 'object') {
        reqOpts.headers['Content-Type'] = 'application/json';
      }

      const req = http.request(url, reqOpts, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (_) {}
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

  // Create an ephemeral test student user
  const TEST_STUDENT_EMAIL = `test.student.erasure.${Date.now()}@example.com`;
  let testStudentUser = null;
  let studentCookie = null;
  let adminCookie = null;
  let erasureRequestId = null;

  try {
    testStudentUser = await db.createUser({
      name: 'Test Erasure Student',
      email: TEST_STUDENT_EMAIL,
      password: 'TestPassword123!',
      role: 'student',
      ageConfirmed: true
    });

    // Create session in sessions Map for student
    const studentSessionId = crypto.randomBytes(24).toString('hex');
    sessions.set(studentSessionId, {
      userId: testStudentUser.id,
      email: testStudentUser.email.toLowerCase(),
      name: testStudentUser.name,
      role: 'student',
      createdAt: Date.now()
    });
    studentCookie = `hb_session=${studentSessionId}`;

    // Create session in sessions Map for admin
    const adminSessionId = crypto.randomBytes(24).toString('hex');
    sessions.set(adminSessionId, {
      userId: 'admin-test-del',
      email: 'admin.tester@hireebridge.in',
      name: 'Admin Tester',
      role: 'admin',
      createdAt: Date.now()
    });
    adminCookie = `hb_session=${adminSessionId}`;

    // Test 5: Student deletion request with requestType: 'erasure' succeeds with HTTP 200 and PR- ID
    try {
      const res = await request('/api/privacy/request', {
        method: 'POST',
        headers: { Cookie: studentCookie },
        body: {
          requestType: 'erasure',
          requestDetails: 'Student requested account deletion and data erasure via dashboard. Reason: Graduated and no longer using portal',
          email: testStudentUser.email,
          name: testStudentUser.name
        }
      });

      assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
      assert.strictEqual(res.json?.ok, true);
      assert.ok(res.json?.requestId && res.json.requestId.toLowerCase().startsWith('pr-'), 'RequestId must start with pr-');
      erasureRequestId = res.json.requestId;
      recordPass(5, `Student deletion request succeeded with HTTP 200 and ID ${erasureRequestId}`);
    } catch (e) { recordFail(5, 'Student deletion request succeeded with HTTP 200', e); }

    // Test 6: Account is NOT immediately deleted upon submitting the request (creates pending ticket for admin review)
    try {
      const userCheck = await db.getUserById(testStudentUser.id);
      assert.ok(userCheck, 'User must still exist in database');
      assert.strictEqual(userCheck.deleted_at || userCheck.deletedAt || null, null, 'Account must not be immediately deactivated or deleted');
      recordPass(6, 'Account remains active upon submission (pending admin review, no premature auto-deletion)');
    } catch (e) { recordFail(6, 'Account remains active upon submission', e); }

    // Test 7: Erasure request appears in Admin Privacy Requests list with request_type 'erasure'
    try {
      const adminRes = await request('/api/admin/privacy-requests', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(adminRes.statusCode, 200);
      assert.strictEqual(adminRes.json?.ok, true);
      const reqFound = adminRes.json?.requests.find(r => r.id === erasureRequestId);
      assert.ok(reqFound, `Request ${erasureRequestId} must be present in admin list`);
      assert.strictEqual(reqFound.request_type, 'erasure', 'request_type must be erasure');
      assert.strictEqual(reqFound.status, 'PENDING', 'status must be PENDING');
      recordPass(7, 'Erasure request appears in Admin privacy requests list with request_type: erasure');
    } catch (e) { recordFail(7, 'Erasure request appears in Admin privacy requests list', e); }

    // Test 8: Admin Privacy Requests UI renders ERASURE badge
    try {
      const adminHtmlRes = await request('/admin?view=privacy-requests', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(adminHtmlRes.statusCode, 200);
      assert.ok(adminHtmlRes.body.includes(erasureRequestId), 'Admin page HTML contains the request ID');
      assert.ok(adminHtmlRes.body.includes('erasure'), 'Admin page HTML contains erasure');
      assert.ok(adminHtmlRes.body.includes('admin-badge-blue'), 'Admin page renders blue badge for erasure type');
      recordPass(8, 'Admin portal renders ERASURE badge and request details correctly');
    } catch (e) { recordFail(8, 'Admin portal renders ERASURE badge and request details', e); }

    // Test 9: No regression for other allowed privacy request types (access, correction, grievance, nomination, consent_withdrawal)
    const otherTypes = ['access', 'correction', 'grievance', 'nomination', 'consent_withdrawal'];
    for (const t of otherTypes) {
      try {
        const res = await request('/api/privacy/request', {
          method: 'POST',
          headers: { Cookie: studentCookie },
          body: {
            requestType: t,
            requestDetails: `Testing standard statutory privacy request for type: ${t}`,
            email: testStudentUser.email,
            name: testStudentUser.name
          }
        });
        assert.strictEqual(res.statusCode, 200, `Type ${t} expected 200, got ${res.statusCode}: ${res.body}`);
        assert.strictEqual(res.json?.ok, true);
        assert.ok(res.json?.requestId && res.json.requestId.toLowerCase().startsWith('pr-'));
      } catch (e) {
        throw new Error(`Regression in allowed type '${t}': ${e.message}`);
      }
    }
    recordPass(9, 'All other allowed request types (access, correction, grievance, nomination, consent_withdrawal) continue working without regression');

    // Test 10: Invalid request types (like deprecated 'deletion' or arbitrary strings) are properly rejected with 400
    try {
      const badRes = await request('/api/privacy/request', {
        method: 'POST',
        headers: { Cookie: studentCookie },
        body: {
          requestType: 'deletion', // Deprecated type
          requestDetails: 'This should be rejected because backend only accepts erasure',
          email: testStudentUser.email,
          name: testStudentUser.name
        }
      });
      assert.strictEqual(badRes.statusCode, 400, 'Expected 400 for legacy deletion type');
      assert.ok(badRes.json?.error.includes('Invalid privacy request type'), 'Expected error message regarding allowed types');
      recordPass(10, "Backend correctly rejects legacy 'deletion' and enforces allowedTypes whitelist");
    } catch (e) { recordFail(10, 'Backend correctly rejects invalid request types', e); }

    // Test 11: Admin can update request status (IN_REVIEW -> COMPLETED)
    try {
      const updateRes1 = await request(`/api/admin/privacy-requests/${erasureRequestId}/status`, {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: { status: 'IN_REVIEW', internalNotes: 'Identity verified, preparing account erasure' }
      });
      assert.strictEqual(updateRes1.statusCode, 200);
      assert.strictEqual(updateRes1.json?.ok, true);

      const updateRes2 = await request(`/api/admin/privacy-requests/${erasureRequestId}/status`, {
        method: 'POST',
        headers: { Cookie: adminCookie },
        body: { status: 'COMPLETED', internalNotes: 'Personal data erased in accordance with DPDP Act' }
      });
      assert.strictEqual(updateRes2.statusCode, 200);
      assert.strictEqual(updateRes2.json?.ok, true);
      recordPass(11, 'Admin workflow successfully updates request status (PENDING -> IN_REVIEW -> COMPLETED)');
    } catch (e) { recordFail(11, 'Admin workflow updates request status', e); }

    // Test 12: IDOR Protection: Student cannot submit privacy requests for another email
    try {
      const idorRes = await request('/api/privacy/request', {
        method: 'POST',
        headers: { Cookie: studentCookie },
        body: {
          requestType: 'erasure',
          requestDetails: 'Attempting to request deletion for someone else',
          email: 'another.student@example.com',
          name: 'Another Student'
        }
      });
      assert.strictEqual(idorRes.statusCode, 403, 'Expected 403 Forbidden for IDOR attempt');
      recordPass(12, 'IDOR protection prevents students from submitting privacy requests for other accounts');
    } catch (e) { recordFail(12, 'IDOR protection prevents cross-account privacy requests', e); }

  } finally {
    // Teardown and cleanup test records
    console.log('\nCleaning up ephemeral test records...');
    try {
      await db.cleanTestRecords();
      console.log('Cleanup completed successfully.\n');
    } catch (cleanErr) {
      console.warn('Notice: Test cleanup note:', cleanErr.message);
    }
    testServer.close();
  }

  console.log('================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
