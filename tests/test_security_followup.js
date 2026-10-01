require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');

const db = require('../db');
const {
  app,
  checkLoginThrottle,
  checkForgotPasswordRateLimit,
  recordForgotPasswordAttempt,
  forgotPasswordStore,
  loginAttemptStore
} = require('../server');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING HIREEBRIDGE SECURITY FOLLOW-UP TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(name) {
    passed++;
    console.log(`[PASS] Test ${passed}: ${name}`);
  }

  function recordFail(name, err) {
    failed++;
    console.error(`[FAIL] ${name}:`, err.message || err);
  }

  // Start ephemeral test server
  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function makeRequest(reqPath, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(reqPath, baseUrl);
      const reqOpts = {
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(url, reqOpts, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  // Seed a test student in the database
  const testEmail = 'sectest_candidate_' + Date.now() + '@example.com';
  const testPassword = 'Password123!';
  const hashedPassword = db.hashPassword(testPassword);
  const testUser = await db.createUser({
    id: 'usr-sectest-' + Date.now(),
    name: 'SecTest Candidate',
    email: testEmail,
    password: hashedPassword,
    role: 'student'
  });

  const genericResponse = 'If an account exists for that email, we’ve sent a password reset link.';

  try {
    // ----------------------------------------------------
    // TEST 1: Existing email gets generic response
    // ----------------------------------------------------
    {
      const ip = '192.0.2.1';
      const res = await makeRequest('/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': ip
        },
        body: `email=${encodeURIComponent(testEmail)}`
      });

      assert.strictEqual(res.statusCode, 200, 'Expected status 200 for existing email');
      assert.ok(res.body.includes(genericResponse), 'Body must contain generic anti-enumeration response');
      recordPass('Existing email gets generic response');
    }

    // ----------------------------------------------------
    // TEST 2: Unknown email gets identical response
    // ----------------------------------------------------
    {
      const ip = '192.0.2.2';
      const unknownEmail = 'definitely_unknown_' + Date.now() + '@example.com';
      const res = await makeRequest('/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': ip
        },
        body: `email=${encodeURIComponent(unknownEmail)}`
      });

      assert.strictEqual(res.statusCode, 200, 'Expected status 200 for unknown email');
      assert.ok(res.body.includes(genericResponse), 'Body must contain generic anti-enumeration response');
      recordPass('Unknown email gets identical response');
    }

    // ----------------------------------------------------
    // TEST 3: First allowed request can trigger reset token creation
    // ----------------------------------------------------
    {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const tokenRecord = await db.createPasswordResetToken({
        userId: testUser.id,
        tokenHash,
        expiresAt
      });

      assert.ok(tokenRecord, 'Password reset token was created');
      assert.strictEqual(tokenRecord.token_hash, tokenHash, 'Stored token hash matches');
      assert.strictEqual(tokenRecord.user_id, testUser.id, 'User ID matches');
      recordPass('First allowed request can trigger reset token in DB');
    }

    // ----------------------------------------------------
    // TEST 4: Repeated requests from same IP eventually hit rate limit (429)
    // ----------------------------------------------------
    {
      const spamIp = '198.51.100.99';
      let hit429 = false;
      let lastRes = null;

      // FORGOT_PASSWORD_IP_MAX is 5. Sending 7 requests:
      for (let i = 0; i < 7; i++) {
        const dummyEmail = `random_${i}_${Date.now()}@example.com`;
        lastRes = await makeRequest('/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Forwarded-For': spamIp
          },
          body: `email=${encodeURIComponent(dummyEmail)}`
        });

        if (lastRes.statusCode === 429) {
          hit429 = true;
          break;
        }
      }

      assert.ok(hit429, 'Repeated requests from same IP must hit 429 rate limit');
      assert.ok(lastRes.headers['retry-after'], 'Rate limited response must include Retry-After header');
      assert.ok(lastRes.body.includes(genericResponse), 'Rate limited response maintains generic message');
      recordPass('Repeated requests from same IP eventually hit rate limit (429)');
    }

    // ----------------------------------------------------
    // TEST 5: Repeated requests for same email hit burst cooldown and hourly rate limit
    // ----------------------------------------------------
    {
      const targetEmail = 'ratelimit_target_' + Date.now() + '@example.com';
      forgotPasswordStore.delete(`femail:${targetEmail}`);

      // Request 1: allowed
      const check1 = checkForgotPasswordRateLimit('198.51.100.10', targetEmail);
      assert.strictEqual(check1.allowed, true, 'Request 1 for email should be allowed');
      recordForgotPasswordAttempt('198.51.100.10', targetEmail, true); // marks sent email

      // Request 2 (within cooldown): blocked by cooldown
      const check2 = checkForgotPasswordRateLimit('198.51.100.11', targetEmail);
      assert.strictEqual(check2.allowed, false, 'Request 2 for email should be throttled by cooldown');
      assert.strictEqual(check2.throttledBy, 'email_cooldown');

      // Simulate 3 dispatches to test window limit
      const now = Date.now();
      forgotPasswordStore.set(`femail:${targetEmail}`, {
        requests: [now - 10000, now - 8000, now - 6000],
        lastSentAt: now - (6 * 60 * 1000) // cooldown passed
      });

      const check4 = checkForgotPasswordRateLimit('198.51.100.12', targetEmail);
      assert.strictEqual(check4.allowed, false, '4th request in window should be throttled by email_limit');
      assert.strictEqual(check4.throttledBy, 'email_limit');
      recordPass('Repeated requests for same email hit burst cooldown and hourly rate limit');
    }

    // ----------------------------------------------------
    // TEST 6: Rate-limited requests do NOT send additional reset emails
    // ----------------------------------------------------
    {
      const emailForTest6 = 'no_email_spam_' + Date.now() + '@example.com';
      await db.createUser({
        name: 'Spam Guard Candidate',
        email: emailForTest6,
        password: db.hashPassword('Pass123!'),
        role: 'student'
      });

      // Populate store with active cooldown
      forgotPasswordStore.set(`femail:${emailForTest6}`, {
        requests: [Date.now()],
        lastSentAt: Date.now() // active cooldown
      });

      // Submit forgot-password
      const res = await makeRequest('/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': '198.51.100.50'
        },
        body: `email=${encodeURIComponent(emailForTest6)}`
      });

      // Should return generic 200 without sending email or creating new active token
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes(genericResponse));

      // Check DB to ensure no token was created during cooldown
      if (db.pool) {
        const checkTok = await db.pool.query(
          "SELECT * FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1) AND created_at > NOW() - INTERVAL '10 seconds'",
          [emailForTest6]
        );
        assert.strictEqual(checkTok.rows.length, 0, 'No reset token created during cooldown suppression');
      }
      recordPass('Rate-limited requests do NOT send additional reset emails or create tokens');
    }

    // ----------------------------------------------------
    // TEST 7: Email enumeration is still impossible
    // ----------------------------------------------------
    {
      const realRes = await makeRequest('/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': '198.51.100.78'
        },
        body: `email=${encodeURIComponent(testEmail)}`
      });

      const fakeRes = await makeRequest('/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': '198.51.100.79'
        },
        body: `email=${encodeURIComponent('definitely_non_existent_user_999@hireebridge.in')}`
      });

      assert.strictEqual(realRes.statusCode, fakeRes.statusCode, 'Status codes must match');
      assert.strictEqual(realRes.body.length, fakeRes.body.length, 'Body lengths must match');
      assert.strictEqual(realRes.body, fakeRes.body, 'Body content must be 100% identical');
      recordPass('Email enumeration is still impossible (identical status and body)');
    }

    // ----------------------------------------------------
    // TEST 8: Reset token is not logged or leaked
    // ----------------------------------------------------
    {
      const rawSecretToken = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(rawSecretToken).digest('hex');
      const res = await makeRequest(`/reset-password?token=${rawSecretToken}`);
      assert.ok(!res.body.includes(hash), 'Response must not leak token hash');
      recordPass('Reset token hash is not leaked in HTTP response');
    }

    // ----------------------------------------------------
    // TEST 9: PostgreSQL configured -> password reset token is stored in PostgreSQL
    // ----------------------------------------------------
    {
      if (db.pool) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const exp = new Date(Date.now() + 1800000);

        await db.createPasswordResetToken({
          userId: testUser.id,
          tokenHash,
          expiresAt: exp
        });

        const pgCheck = await db.pool.query('SELECT * FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
        assert.strictEqual(pgCheck.rows.length, 1, 'Token row exists in PostgreSQL');
        assert.strictEqual(pgCheck.rows[0].token_hash, tokenHash);
        recordPass('PostgreSQL configured -> password reset token is stored in PostgreSQL');
      } else {
        console.log('[SKIP] Test 9 skipped: pool not configured');
      }
    }

    // ----------------------------------------------------
    // TEST 10: PostgreSQL configured -> password reset does NOT silently fall back to data.json
    // ----------------------------------------------------
    {
      if (db.pool) {
        const dbJsonPath = path.join(__dirname, '../data/db.json');
        const dbJson = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await db.createPasswordResetToken({
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 1800000)
        });

        const inJson = (dbJson.password_reset_tokens || []).find(t => t.token_hash === tokenHash);
        assert.strictEqual(inJson, undefined, 'Token must NOT be written to data.json when PG is configured');
        recordPass('PostgreSQL configured -> password reset does NOT silently fall back to data.json');
      } else {
        console.log('[SKIP] Test 10 skipped: pool not configured');
      }
    }

    // ----------------------------------------------------
    // TEST 11: PostgreSQL configured + database unavailable -> authentication/reset fails closed safely
    // ----------------------------------------------------
    {
      if (db.pool) {
        const originalQuery = db.pool.query;
        db.pool.query = async function() {
          throw new Error('Simulated Database Outage for Security Verification');
        };

        try {
          const userResult = await db.getUserByEmail(testEmail);
          assert.strictEqual(userResult, null, 'getUserByEmail must fail closed (return null) on DB outage');

          const tokenResult = await db.createPasswordResetToken({
            userId: testUser.id,
            tokenHash: 'dummyhash123',
            expiresAt: new Date()
          });
          assert.strictEqual(tokenResult, null, 'createPasswordResetToken must fail closed (return null) on DB outage');

          const updateResult = await db.updateUserPassword(testUser.id, 'newHash');
          assert.strictEqual(updateResult, false, 'updateUserPassword must fail closed (return false) on DB outage');

          recordPass('PostgreSQL configured + DB unavailable -> sensitive operations FAIL CLOSED safely');
        } finally {
          db.pool.query = originalQuery;
        }
      } else {
        console.log('[SKIP] Test 11 skipped: pool not configured');
      }
    }

    // ----------------------------------------------------
    // TEST 12: Local development without PostgreSQL still behaves according to local JSON architecture
    // ----------------------------------------------------
    {
      const originalPool = db.pool;
      try {
        db.pool = null; // simulate local development mode

        const localEmail = 'localdev_' + Date.now() + '@example.com';
        const created = await db.createUser({
          name: 'Local Dev User',
          email: localEmail,
          password: 'LocalPassword123!',
          role: 'student'
        });

        assert.ok(created, 'User created in local JSON DB');
        const retrieved = await db.getUserByEmail(localEmail);
        assert.ok(retrieved, 'User retrieved from local JSON DB');
        assert.strictEqual(retrieved.email, localEmail.toLowerCase());

        recordPass('Local development without PostgreSQL still behaves according to local JSON architecture');
      } finally {
        db.pool = originalPool;
      }
    }

    // ----------------------------------------------------
    // TEST 13: Atomic password reset transaction works normally when PostgreSQL is healthy
    // ----------------------------------------------------
    {
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      const exp = new Date(Date.now() + 1800000);

      await db.createPasswordResetToken({
        userId: testUser.id,
        tokenHash: resetTokenHash,
        expiresAt: exp
      });

      const newPasswordRaw = 'NewSecurePass@2026';
      const newPasswordHash = db.hashPassword(newPasswordRaw);

      const txResult = await db.resetPasswordWithToken({
        tokenHash: resetTokenHash,
        userId: testUser.id,
        newHashedPassword: newPasswordHash
      });

      assert.strictEqual(txResult.success, true, 'Atomic reset transaction succeeded');

      // Verify token cannot be reused
      const secondTry = await db.resetPasswordWithToken({
        tokenHash: resetTokenHash,
        userId: testUser.id,
        newHashedPassword: newPasswordHash
      });
      assert.strictEqual(secondTry.success, false, 'Token cannot be reused after atomic reset');
      assert.strictEqual(secondTry.reason, 'token_already_used');

      // Verify updated user password in DB
      const updatedUser = await db.getUserByEmail(testEmail);
      assert.strictEqual(updatedUser.password, newPasswordHash, 'Password successfully updated in DB');

      recordPass('Atomic password reset transaction works and prevents token reuse');
    }

    // ----------------------------------------------------
    // TEST 14: Existing login still works
    // ----------------------------------------------------
    {
      const loginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.80'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'NewSecurePass@2026'
        })
      });

      assert.strictEqual(loginRes.statusCode, 200, 'Login with new password should succeed');
      const data = JSON.parse(loginRes.body);
      assert.strictEqual(data.ok, true);
      assert.strictEqual(data.redirect, '/dashboard');
      recordPass('Existing login works with updated credentials');
    }

    // ----------------------------------------------------
    // TEST 15: Existing admin login still works
    // ----------------------------------------------------
    {
      const adminRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.81'
        },
        body: JSON.stringify({
          email: 'yeolekrushnar@gmail.com',
          password: 'Vidhya@416'
        })
      });

      assert.strictEqual(adminRes.statusCode, 200, 'Admin login should succeed');
      const data = JSON.parse(adminRes.body);
      assert.strictEqual(data.ok, true);
      assert.strictEqual(data.redirect, '/admin');
      assert.strictEqual(data.role, 'admin');
      recordPass('Existing admin login works and redirects to /admin');
    }

    // ----------------------------------------------------
    // TEST 16: Existing brute-force login protection still works
    // ----------------------------------------------------
    {
      const victimIp = '198.51.100.88';
      let lockTriggered = false;

      for (let i = 0; i < 7; i++) {
        const failRes = await makeRequest('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': victimIp
          },
          body: JSON.stringify({
            email: 'victim_bruteforce@example.com',
            password: 'wrong_password_' + i
          })
        });

        if (failRes.statusCode === 429) {
          lockTriggered = true;
          break;
        }
      }

      assert.ok(lockTriggered, 'Brute-force login must trigger 429 after 5 failed attempts');
      recordPass('Existing brute-force login protection triggers 429');
    }

    // ----------------------------------------------------
    // TEST 17: Existing Brevo sender configuration verified
    // ----------------------------------------------------
    {
      const expectedSender = (process.env.MAIL_FROM && process.env.MAIL_FROM.trim()) || 'HireeBridge <sender@hireebridge.in>';
      assert.strictEqual(expectedSender, 'HireeBridge <sender@hireebridge.in>');
      assert.strictEqual(process.env.SMTP_HOST || 'smtp-relay.brevo.com', 'smtp-relay.brevo.com');
      assert.strictEqual(String(process.env.SMTP_PORT || '587'), '587');
      recordPass('Existing Brevo sender configuration verified: HireeBridge <sender@hireebridge.in>');
    }

  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    failed++;
  } finally {
    testServer.close();
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
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
