'use strict';
const assert = require('assert');
const http = require('http');

// Load server dependencies directly to test helpers and routes
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // ephemeral port

const { app } = require('../server.js');

let server;
let port;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${port}${path}`, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('TESTING CHECKOUT VALIDATION & MOBILE ENHANCEMENTS');
  console.log('========================================================\n');

  server = app.listen(0, async () => {
    port = server.address().port;

    try {
      // 1. Test GET /checkout page contains all required elements
      console.log('1. Checking GET /checkout HTML elements...');
      const pageRes = await request('/checkout?plan=project&domain=data-science');
      assert.strictEqual(pageRes.status, 200, 'Checkout page should return 200 OK');
      
      // Verify certificate print hint beside Full Name
      assert(pageRes.body.includes('(This name will be printed on your certificate)'), 
        'Should include certificate print hint beside Full Name');
      
      // Verify Confirm Email field and paste blocking
      assert(pageRes.body.includes('name="confirmEmail"'), 'Should have confirmEmail field');
      assert(pageRes.body.includes('id="checkoutConfirmEmail"'), 'Should have checkoutConfirmEmail ID');
      assert(pageRes.body.includes('onpaste="return false;"'), 'Should disable onpaste on confirmEmail');
      
      // Verify Password and Confirm Password fields
      assert(pageRes.body.includes('id="checkoutPassword"'), 'Should have checkoutPassword ID');
      assert(pageRes.body.includes('minlength="10"'), 'Should require minlength 10 on password');
      assert(pageRes.body.includes('name="confirmPassword"'), 'Should have confirmPassword field');
      assert(pageRes.body.includes('id="checkoutConfirmPassword"'), 'Should have checkoutConfirmPassword ID');

      // Verify Mobile Summary card
      assert(pageRes.body.includes('checkout-mobile-summary'), 'Should include checkout-mobile-summary container');
      assert(pageRes.body.includes('cms-amount'), 'Should include cms-amount in mobile summary');
      console.log('  [PASS] GET /checkout contains all required elements & hints.\n');

      // Base valid checkout payload
      const validPayload = {
        name: 'Krushna Yeole',
        email: 'krushna.valid@gmail.com',
        confirmEmail: 'krushna.valid@gmail.com',
        password: 'ValidPassword2026!',
        confirmPassword: 'ValidPassword2026!',
        phone: '9876543210',
        domain: 'data-science',
        duration: '4 Weeks',
        plan: 'project',
        countryCode: 'IN',
        privacyConsent: 'true',
        ageConfirmation: 'true'
      };

      // 2. Test Invalid Indian Phone Number Validation
      console.log('2. Testing Indian phone number validation...');
      
      // Wrong prefix: starts with 1
      const badPhone1 = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, phone: '1234567890' }
      });
      assert.strictEqual(badPhone1.status, 400);
      assert(badPhone1.json.error.includes('Indian mobile numbers must start with 6, 7, 8, or 9'),
        `Expected Indian phone error, got: ${badPhone1.json?.error}`);

      // Wrong prefix: starts with 4
      const badPhone2 = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, phone: '4567890123' }
      });
      assert.strictEqual(badPhone2.status, 400);
      assert(badPhone2.json.error.includes('Indian mobile numbers must start with 6, 7, 8, or 9'));

      // Too short: 8 digits
      const shortPhone = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, phone: '98765432' }
      });
      assert.strictEqual(shortPhone.status, 400);
      assert(shortPhone.json.error.includes('valid 10-digit Indian mobile number'));
      console.log('  [PASS] Invalid Indian phone numbers properly rejected with specific errors.\n');

      // 3. Test Disposable / Temporary Email Rejection
      console.log('3. Testing disposable / temporary email rejection...');
      const tempEmailList = [
        'student@tempmail.com',
        'user@mailinator.com',
        'tester@yopmail.com',
        'fake@10minutemail.com',
        'anon@trashmail.com'
      ];

      for (const tempEmail of tempEmailList) {
        const tempRes = await request('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { ...validPayload, email: tempEmail, confirmEmail: tempEmail }
        });
        assert.strictEqual(tempRes.status, 400, `Expected 400 for ${tempEmail}`);
        assert(tempRes.json.error.includes('disposable') || tempRes.json.error.includes('Temporary'),
          `Expected disposable email error, got: ${tempRes.json?.error}`);
      }
      console.log('  [PASS] Disposable & temporary emails successfully blocked.\n');

      // 4. Test Email Confirmation Mismatch
      console.log('4. Testing email confirmation mismatch...');
      const mismatchEmail = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, email: 'student@gmail.com', confirmEmail: 'different@gmail.com' }
      });
      assert.strictEqual(mismatchEmail.status, 400);
      assert(mismatchEmail.json.error.includes('do not match'),
        `Expected mismatch error, got: ${mismatchEmail.json?.error}`);
      console.log('  [PASS] Email confirmation mismatch properly rejected.\n');

      // 5. Test Password Strength Policy (10+ characters & letters + numbers)
      console.log('5. Testing password security policy...');
      
      // Too short: 8 chars
      const shortPwd = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, password: 'Short1!', confirmPassword: 'Short1!' }
      });
      assert.strictEqual(shortPwd.status, 400);
      assert(shortPwd.json.error.includes('10 characters'),
        `Expected 10 chars requirement, got: ${shortPwd.json?.error}`);

      // Missing numbers: 11 characters of letters
      const lettersOnlyPwd = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, password: 'abcdefghijk', confirmPassword: 'abcdefghijk' }
      });
      assert.strictEqual(lettersOnlyPwd.status, 400);
      assert(lettersOnlyPwd.json.error.includes('letters and numbers'),
        `Expected letters and numbers requirement, got: ${lettersOnlyPwd.json?.error}`);

      // Missing letters: 11 numbers
      const numbersOnlyPwd = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, password: '12345678901', confirmPassword: '12345678901' }
      });
      assert.strictEqual(numbersOnlyPwd.status, 400);
      assert(numbersOnlyPwd.json.error.includes('letters and numbers'));

      // Password mismatch
      const mismatchPwd = await request('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, password: 'SecurePassword123!', confirmPassword: 'DifferentPassword123!' }
      });
      assert.strictEqual(mismatchPwd.status, 400);
      assert(mismatchPwd.json.error.includes('do not match'));
      console.log('  [PASS] Password anti-hack & confirmation policies enforced.\n');

      // 6. Test PayPal Create Order Validation
      console.log('6. Testing /api/paypal/create-order validations...');
      const paypalTempEmail = await request('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, countryCode: 'US', email: 'test@tempmail.com', confirmEmail: 'test@tempmail.com' }
      });
      assert.strictEqual(paypalTempEmail.status, 400);
      assert(paypalTempEmail.json.error.includes('disposable') || paypalTempEmail.json.error.includes('Temporary'));

      const paypalShortPwd = await request('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...validPayload, countryCode: 'US', password: '12345', confirmPassword: '12345' }
      });
      assert.strictEqual(paypalShortPwd.status, 400);
      assert(paypalShortPwd.json.error.includes('10 characters'));
      console.log('  [PASS] PayPal create order enforces same strict security rules.\n');

      console.log('========================================================');
      console.log('ALL CHECKOUT VALIDATION TESTS PASSED (100%)');
      console.log('========================================================');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n[FAIL] Test failure:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
