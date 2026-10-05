require('dotenv').config();
process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'development';
process.env.CASHFREE_ENV = 'sandbox';
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');

const db = require('../db');
const { app, sessions, getCashfreeRuntimeConfig, markOrderPaidAndFulfill } = require('../server');
const localDbPath = path.join(__dirname, '../data/db.json');
const localDbSnapshot = fs.existsSync(localDbPath) ? fs.readFileSync(localDbPath) : null;

async function runTests() {
  console.log('====================================================');
  console.log('STARTING DB.UPDATEORDER() COMPREHENSIVE TEST SUITE');
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
  const adminSessionId = `price-admin-${Date.now()}`;
  sessions.set(adminSessionId, { userId: 'test-admin', email: 'admin-test@example.com', role: 'admin', createdAt: Date.now() });

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

  const timestamp = Date.now();
  const testOrderId = `HB-TEST-${timestamp}-01`;
  const testEmail = `test_order_${timestamp}@example.com`;

  try {
    const testDb = localDbSnapshot ? JSON.parse(localDbSnapshot.toString('utf8')) : {};
    testDb.program_prices = [
      { planId: 'certificate', name: 'Certificate Program', amount: 1, currency: 'INR' },
      { planId: 'project', name: 'Project Based Internship', amount: 2, currency: 'INR' },
      { planId: 'comprehensive', name: 'Comprehensive Program', amount: 3, currency: 'INR' }
    ];
    fs.writeFileSync(localDbPath, JSON.stringify(testDb, null, 2));

    // Database-backed Admin pricing.
    try {
      const productionConfig = getCashfreeRuntimeConfig('production', 'https://hireebridge.in');
      assert.strictEqual(productionConfig.apiBase, 'https://api.cashfree.com/pg');
      assert.strictEqual(productionConfig.callbackUrls.returnUrl, 'https://hireebridge.in/payment/return?order_id={order_id}');
      assert.strictEqual(productionConfig.callbackUrls.notifyUrl, 'https://hireebridge.in/api/payment/webhook');
      assert.throws(() => getCashfreeRuntimeConfig('production', 'http://localhost:3000'));
      assert.strictEqual(getCashfreeRuntimeConfig('sandbox', 'http://localhost:3000').apiBase, 'https://sandbox.cashfree.com/pg');
      assert(!fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8').includes('HB_LOCAL_TEST_PRICING'));
      const defaults = await db.getProgramPrices();
      assert.deepStrictEqual(defaults.map(p => [p.planId, p.amount]), [['certificate', 1], ['project', 2], ['comprehensive', 3]]);
      const noAuth = await makeRequest('/api/admin/prices');
      assert.strictEqual(noAuth.statusCode, 403);
      const adminHeaders = { Cookie: `hb_session=${adminSessionId}` };
      const loadedPrices = await makeRequest('/api/admin/prices', { headers: adminHeaders });
      assert.strictEqual(loadedPrices.statusCode, 200);
      assert.deepStrictEqual(JSON.parse(loadedPrices.body).prices.map(p => p.amount), [1, 2, 3]);
      const adminPage = await makeRequest('/admin', { headers: adminHeaders });
      assert.strictEqual(adminPage.statusCode, 200);
      assert(adminPage.body.includes('id="view-pricing"'));

      const userSessionId = `price-user-${Date.now()}`;
      sessions.set(userSessionId, { userId: 'test-user', email: 'student@example.com', role: 'student', createdAt: Date.now() });
      const forbidden = await makeRequest('/api/admin/prices/project', { method: 'PUT', headers: { ...adminHeaders, Cookie: `hb_session=${userSessionId}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 77, currency: 'INR' }) });
      assert.strictEqual(forbidden.statusCode, 403);

      for (const [planId, amount] of [['certificate', 11.5], ['project', 22], ['comprehensive', 33]]) {
        const updated = await makeRequest(`/api/admin/prices/${planId}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR' }) });
        assert.strictEqual(updated.statusCode, 200, updated.body);
        assert.strictEqual(JSON.parse(updated.body).price.amount, amount);
      }
      const updatedList = await makeRequest('/api/admin/prices', { headers: adminHeaders });
      assert.deepStrictEqual(JSON.parse(updatedList.body).prices.map(p => p.amount), [11.5, 22, 33]);

      for (const amount of [-1, 0, 'NaN', 1.234, 1000001]) {
        const invalid = await makeRequest('/api/admin/prices/project', { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR' }) });
        assert.strictEqual(invalid.statusCode, 400, `Rejected price ${String(amount)}`);
      }
      const wrongCurrency = await makeRequest('/api/admin/prices/project', { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 10, currency: 'USD' }) });
      assert.strictEqual(wrongCurrency.statusCode, 400);
      const invalidPlan = await makeRequest('/api/admin/prices/not-a-plan', { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 10, currency: 'INR' }) });
      assert.strictEqual(invalidPlan.statusCode, 404);

      for (const [planId, amount] of [['certificate', 1], ['project', 2], ['comprehensive', 3]]) {
        const reset = await db.updateProgramPrice(planId, amount);
        assert.strictEqual(reset.amount, amount);
      }
      const homepage = await makeRequest('/');
      const publicPricingPage = await makeRequest('/pricing');
      assert(homepage.body.includes('₹1') && homepage.body.includes('₹2') && homepage.body.includes('₹3'));
      assert(publicPricingPage.body.includes('₹1') && publicPricingPage.body.includes('₹2') && publicPricingPage.body.includes('₹3'));
      recordPass('Admin reads and updates all database prices; access/validation protections and public pages verified');
    } catch (err) {
      recordFail('Admin database pricing', err);
    }

    // ----------------------------------------------------
    // Test 1: Function export check
    // ----------------------------------------------------
    try {
      assert.strictEqual(typeof db.updateOrder, 'function', 'db.updateOrder must be a function exported by db.js');
      recordPass('db.updateOrder is exported and defined');
    } catch (err) {
      recordFail('db.updateOrder export check', err);
    }

    // ----------------------------------------------------
    // Test 2: Invalid inputs validation
    // ----------------------------------------------------
    try {
      const resNullId = await db.updateOrder('', { status: 'paid' });
      assert.strictEqual(resNullId, null, 'Empty ID should return null');

      const resNullFields = await db.updateOrder('some-id', null);
      assert.strictEqual(resNullFields, null, 'Null fields should return null');

      const resEmptyFields = await db.updateOrder('some-id', {});
      assert.strictEqual(resEmptyFields, null, 'Empty fields object should return null');

      recordPass('Validation rejects empty ID, null fields, and empty objects');
    } catch (err) {
      recordFail('Validation checks', err);
    }

    // ----------------------------------------------------
    // Test 3: SQL Injection and unknown column whitelist check
    // ----------------------------------------------------
    try {
      // Unknown keys only
      const resInjectionOnly = await db.updateOrder('some-id', {
        "'; DROP TABLE orders; --": "malicious",
        "random_unwhitelisted_column": "value"
      });
      assert.strictEqual(resInjectionOnly, null, 'Unwhitelisted columns only should return null without running queries');

      recordPass('Column whitelist strictly rejects unwhitelisted and SQL injection column names');
    } catch (err) {
      recordFail('SQL injection prevention check', err);
    }

    // ----------------------------------------------------
    // Seed an order for database tests
    // ----------------------------------------------------
    const orderData = {
      id: testOrderId,
      name: 'Test Student',
      email: testEmail,
      domain: 'Full Stack Web Development',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: 199,
      status: 'created',
      credentialId: null
    };
    await db.createOrder(orderData);

    // ----------------------------------------------------
    // Test 4: Update order status, paymentId, gatewayOrderId in PostgreSQL
    // ----------------------------------------------------
    try {
      const paymentId = `pay_test_${timestamp}`;
      const gatewayOrderId = `order_test_${timestamp}`;

      const updateRes = await db.updateOrder(testOrderId, {
        status: 'paid',
        paymentId,
        gatewayOrderId
      });

      assert(updateRes !== null, 'db.updateOrder returned null on valid update');
      assert.strictEqual(updateRes.status, 'paid', 'Status should be updated to paid');
      assert.strictEqual(updateRes.payment_id || updateRes.paymentId, paymentId, 'Payment ID should match');
      assert.strictEqual(updateRes.gateway_order_id || updateRes.gatewayOrderId, gatewayOrderId, 'Gateway Order ID should match');

      // Verify in DB directly via pool if pool exists
      if (db.pool) {
        const check = await db.pool.query('SELECT * FROM orders WHERE id = $1', [testOrderId]);
        assert.strictEqual(check.rows.length, 1, 'Order should exist in Neon PG');
        const row = check.rows[0];
        assert.strictEqual(row.status, 'paid');
        assert.strictEqual(row.payment_id, paymentId);
        assert.strictEqual(row.gateway_order_id, gatewayOrderId);
        // Verify original fields were preserved
        assert.strictEqual(row.name, 'Test Student');
        assert.strictEqual(row.email, testEmail.toLowerCase());
        assert.strictEqual(row.domain, 'Full Stack Web Development');
        assert.strictEqual(row.plan, 'certificate');
      }

      recordPass('db.updateOrder updates status, payment_id, gateway_order_id and preserves untouched fields');
    } catch (err) {
      recordFail('Update status, paymentId, gatewayOrderId', err);
    }

    // ----------------------------------------------------
    // Test 5: Update credentialId (simulating post-payment certificate generation)
    // ----------------------------------------------------
    try {
      const credentialId = `GR-FS-2026-TEST${timestamp.toString().slice(-4)}`;
      const updateRes = await db.updateOrder(testOrderId, { credentialId });

      assert(updateRes !== null, 'db.updateOrder returned null on credentialId update');
      assert.strictEqual(updateRes.credential_id || updateRes.credentialId, credentialId);

      if (db.pool) {
        const check = await db.pool.query('SELECT * FROM orders WHERE id = $1', [testOrderId]);
        const row = check.rows[0];
        assert.strictEqual(row.credential_id, credentialId);
        // Verify status is still paid and payment_id is still intact
        assert.strictEqual(row.status, 'paid');
        assert.strictEqual(row.payment_id, `pay_test_${timestamp}`);
      }

      recordPass('db.updateOrder updates credentialId while preserving previously updated payment fields');
    } catch (err) {
      recordFail('Update credentialId', err);
    }

    // ----------------------------------------------------
    // Test 6: Mixed valid and unwhitelisted fields (whitelist stripping)
    // ----------------------------------------------------
    try {
      const updateRes = await db.updateOrder(testOrderId, {
        status: 'paid',
        "malicious_attempt": "DROP TABLE",
        "unknown_column": 123
      });

      assert(updateRes !== null, 'Mixed fields should succeed for valid whitelisted fields');
      assert.strictEqual(updateRes.status, 'paid');

      recordPass('Mixed keys safely ignore unwhitelisted attributes without errors');
    } catch (err) {
      recordFail('Mixed keys stripping', err);
    }

    // ----------------------------------------------------
    // Test 7: Fail-closed on PostgreSQL outage (never fall back to data/db.json)
    // ----------------------------------------------------
    if (db.pool) {
      const originalQuery = db.pool.query;
      try {
        // Record state of db.json before simulated outage
        const dBefore = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
        const jsonOrderBefore = (dBefore.orders || []).find(o => o.id === testOrderId);

        // Simulate DB outage
        db.pool.query = async function() {
          throw new Error('Simulated Database Outage for Security Fail-Closed Verification');
        };

        const outageRes = await db.updateOrder(testOrderId, { status: 'outage-status' });
        assert.strictEqual(outageRes, null, 'Must return null (FAIL CLOSED) on PostgreSQL error');

        // Verify data/db.json was NOT modified
        const dAfter = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
        const jsonOrderAfter = (dAfter.orders || []).find(o => o.id === testOrderId);
        if (jsonOrderBefore) {
          assert.strictEqual(jsonOrderAfter.status, jsonOrderBefore.status, 'db.json must NOT be modified when PG is configured and fails');
        }

        recordPass('PostgreSQL outage FAILS CLOSED safely without falling back to local JSON');
      } catch (err) {
        recordFail('Fail-closed on PG outage', err);
      } finally {
        db.pool.query = originalQuery;
      }
    } else {
      recordPass('PostgreSQL not configured; skipping PG outage test');
    }

    // ----------------------------------------------------
    // Test 8: Local development behavior when pool is null
    // ----------------------------------------------------
    try {
      const localOrderId = `HB-LOCAL-${timestamp}`;
      const originalPool = db.pool;

      // Add order directly to JSON db
      const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
      d.orders = d.orders || [];
      d.orders.push({
        id: localOrderId,
        name: 'Local Dev User',
        email: `local_${timestamp}@example.com`,
        status: 'created',
        amount: 299
      });
      fs.writeFileSync(path.join(__dirname, '../data/db.json'), JSON.stringify(d, null, 2));

      // Temporarily set db.pool = null
      db.pool = null;

      const localUpdate = await db.updateOrder(localOrderId, {
        status: 'paid',
        paymentId: 'pay_local_123',
        gatewayOrderId: 'order_local_123'
      });

      assert(localUpdate !== null, 'Local dev update should succeed');
      assert.strictEqual(localUpdate.status, 'paid');
      assert.strictEqual(localUpdate.paymentId, 'pay_local_123');

      // Verify file persistence
      const dAfter = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
      const saved = dAfter.orders.find(o => o.id === localOrderId);
      assert.strictEqual(saved.status, 'paid');
      assert.strictEqual(saved.paymentId, 'pay_local_123');
      assert.strictEqual(saved.amount, 299, 'Existing fields preserved');

      // Restore pool
      db.pool = originalPool;
      recordPass('Local development mode (pool === null) correctly updates local JSON database');
    } catch (err) {
      recordFail('Local dev mode JSON update', err);
    }

    // Cashfree payment verification and webhook use mocked provider responses only.
    try {
      process.env.CASHFREE_APP_ID = 'test-app-id';
      process.env.CASHFREE_SECRET_KEY = 'test-secret-for-signing';
      const originalFetch = global.fetch;
      let expectedOrderAmount = 2;
      let mismatchAmount = false;
      let failedPayment = false;
      let failedPaymentStatus = 'FAILED';
      global.fetch = async (url, options = {}) => {
        const path = String(url);
        if (options.method === 'POST') {
          const requestBody = JSON.parse(options.body);
          assert.strictEqual(requestBody.order_currency, 'INR');
          assert.strictEqual(requestBody.order_amount, expectedOrderAmount);
          assert.strictEqual(options.headers['x-api-version'], '2025-01-01');
          return { ok: true, status: 200, text: async () => JSON.stringify({ order_id: requestBody.order_id, payment_session_id: 'session_test_123' }) };
        }
        const requestedId = path.match(/\/orders\/([^/]+)/)?.[1] || `HB-CF-${timestamp}`;
        const data = path.endsWith('/payments')
          ? [{ order_id: requestedId, cf_payment_id: 'cfpay_test_1', payment_status: failedPayment ? failedPaymentStatus : 'SUCCESS', payment_amount: mismatchAmount ? expectedOrderAmount - 1 : expectedOrderAmount, payment_currency: 'INR' }]
          : { order_id: requestedId, order_amount: expectedOrderAmount, order_currency: 'INR', order_status: 'PAID' };
        return { ok: true, status: 200, text: async () => JSON.stringify(data) };
      };
      const internalOrderId = `HB-CF-${timestamp}`;
      const gatewayOrderId = `CF-${internalOrderId}`;
      await db.createOrder({ id: internalOrderId, gatewayOrderId, name: 'Cashfree Test', email: `cf-${timestamp}@example.com`, domain: 'Data Science', duration: '4 Weeks', plan: 'project', amount: 2, currency: 'INR', country: 'IN', phone: '9876543210', status: 'created' });
      const verify = await makeRequest('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayOrderId }) });
      assert.strictEqual(verify.statusCode, 200, verify.body);
      assert.strictEqual(JSON.parse(verify.body).ok, true);
      const updated = (await db.getAllOrders()).find(o => o.id === internalOrderId);
      assert.strictEqual(updated.status, 'paid');
      const duplicateVerify = await makeRequest('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayOrderId }) });
      assert.strictEqual(duplicateVerify.statusCode, 200, 'Duplicate verification should be safe');
      recordPass('Cashfree server-side verification checks provider order and successful payment');

      const mismatchOrder = `HB-MM-${timestamp}`;
      await db.createOrder({ id: mismatchOrder, gatewayOrderId: mismatchOrder, name: 'Mismatch Test', email: `mm-${timestamp}@example.com`, domain: 'Data Science', duration: '4 Weeks', plan: 'project', amount: 2, currency: 'INR', country: 'IN', phone: '9876543210', status: 'created' });
      mismatchAmount = true;
      const mismatch = await makeRequest('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayOrderId: mismatchOrder }) });
      assert.strictEqual(mismatch.statusCode, 400);
      assert.strictEqual((await db.getAllOrders()).find(o => o.id === mismatchOrder).status, 'created');
      mismatchAmount = false;

      const failedOrder = `HB-FAIL-${timestamp}`;
      await db.createOrder({ id: failedOrder, gatewayOrderId: failedOrder, name: 'Failed Payment Test', email: `failed-${timestamp}@example.com`, domain: 'Data Science', duration: '4 Weeks', plan: 'project', amount: 2, currency: 'INR', country: 'IN', phone: '9876543210', status: 'created' });
      failedPayment = true;
      const failedResponse = await makeRequest('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayOrderId: failedOrder }) });
      assert.strictEqual(failedResponse.statusCode, 400);
      assert.strictEqual((await db.getAllOrders()).find(o => o.id === failedOrder).status, 'created');
      failedPayment = false;

      const droppedOrder = `HB-DROP-${timestamp}`;
      await db.createOrder({ id: droppedOrder, gatewayOrderId: droppedOrder, name: 'Dropped Payment Test', email: `dropped-${timestamp}@example.com`, domain: 'Data Science', duration: '4 Weeks', plan: 'project', amount: 2, currency: 'INR', country: 'IN', phone: '9876543210', status: 'created' });
      failedPaymentStatus = 'USER_DROPPED';
      failedPayment = true;
      const droppedResponse = await makeRequest('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayOrderId: droppedOrder }) });
      assert.strictEqual(droppedResponse.statusCode, 400);
      assert.strictEqual((await db.getAllOrders()).find(o => o.id === droppedOrder).status, 'created');
      failedPayment = false;

      const checkoutResponse = await makeRequest('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Cashfree Checkout Test', email: `checkout-${timestamp}@example.com`, password: 'test-pass-123', domain: 'data-science', duration: '4 Weeks', plan: 'project', phone: '9876543210', amount: 999999, privacyConsent: 'true', ageConfirmation: 'true' }) });
      assert.strictEqual(checkoutResponse.statusCode, 200, checkoutResponse.body);
      const checkoutData = JSON.parse(checkoutResponse.body);
      assert.strictEqual(checkoutData.mode, 'cashfree');
      assert.strictEqual(checkoutData.payment_session_id, 'session_test_123');
      assert.strictEqual(checkoutData.amount, 2);
      assert.match(checkoutData.gatewayOrderId, /^CF-HB-/);
      const firstSnapshot = (await db.getAllOrders()).find(o => o.id === checkoutData.orderId);
      assert.strictEqual(Number(firstSnapshot.amount), 2, 'Created order keeps the price in effect at checkout');
      assert.strictEqual(firstSnapshot.programName, 'Project Based Internship');
      recordPass('Cashfree checkout ignores client amount and stores the database price snapshot with program identity');

      const adminCookie = { Cookie: `hb_session=${adminSessionId}`, 'Content-Type': 'application/json' };
      const priceChange = await makeRequest('/api/admin/prices/project', { method: 'PUT', headers: adminCookie, body: JSON.stringify({ amount: 17, currency: 'INR' }) });
      assert.strictEqual(priceChange.statusCode, 200, priceChange.body);
      const historicalOrder = (await db.getAllOrders()).find(o => o.id === checkoutData.orderId);
      assert.strictEqual(Number(historicalOrder.amount), 2, 'Changing the plan price must not rewrite historical order amounts');
      expectedOrderAmount = 17;
      const nextCheckout = await makeRequest('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Price Test', email: `checkout-new-${timestamp}@example.com`, password: 'test-pass-123', domain: 'data-science', duration: '4 Weeks', plan: 'project', phone: '9876543210', amount: 1, privacyConsent: 'true', ageConfirmation: 'true' }) });
      assert.strictEqual(nextCheckout.statusCode, 200, nextCheckout.body);
      const nextCheckoutData = JSON.parse(nextCheckout.body);
      assert.strictEqual(nextCheckoutData.amount, 17);
      const nextSnapshot = (await db.getAllOrders()).find(o => o.id === nextCheckoutData.orderId);
      assert.strictEqual(Number(nextSnapshot.amount), 17);
      await db.updateProgramPrice('project', 2);
      expectedOrderAmount = 2;
      recordPass('Price changes affect future orders while existing order snapshots stay unchanged');

      for (const [planKey, expectedAmount] of [['certificate', '₹1'], ['project', '₹2'], ['comprehensive', '₹3']]) {
        const page = await makeRequest(`/checkout?plan=${planKey}&currency=INR&explicit=true`);
        assert.strictEqual(page.statusCode, 200);
        assert(page.body.includes(expectedAmount), `${planKey} checkout should show ${expectedAmount}`);
      }
      recordPass('Database seed prices render as INR 1 / 2 / 3 across all checkout plans');

      const unavailableApp = process.env.CASHFREE_APP_ID;
      process.env.CASHFREE_APP_ID = '';
      const unavailable = await makeRequest('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'No Gateway', email: `nogateway-${timestamp}@example.com`, password: 'test-pass-123', domain: 'data-science', duration: '4 Weeks', plan: 'project', phone: '9876543210', privacyConsent: 'true', ageConfirmation: 'true' }) });
      assert.strictEqual(unavailable.statusCode, 503);
      assert(!JSON.parse(unavailable.body).ok);
      process.env.CASHFREE_APP_ID = unavailableApp;
      recordPass('Cashfree amount mismatch and missing credentials fail closed');

      const webhookOrderId = `HB-WH-${timestamp}`;
      await db.createOrder({ id: webhookOrderId, gatewayOrderId: webhookOrderId, name: 'Webhook Test', email: `wh-${timestamp}@example.com`, domain: 'Data Science', duration: '4 Weeks', plan: 'project', amount: 2, currency: 'INR', country: 'IN', phone: '9876543210', status: 'created' });
      const payload = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: webhookOrderId }, payment: { cf_payment_id: 'cfpay_test_2', payment_status: 'SUCCESS' } } });
      const timestampHeader = String(Date.now());
      const signature = crypto.createHmac('sha256', process.env.CASHFREE_SECRET_KEY).update(timestampHeader + payload).digest('base64');
      const invalid = await makeRequest('/api/payment/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-timestamp': timestampHeader, 'x-webhook-signature': 'invalid' }, body: payload });
      assert.strictEqual(invalid.statusCode, 400);
      const hook = await makeRequest('/api/payment/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-timestamp': timestampHeader, 'x-webhook-signature': signature }, body: payload });
      assert.strictEqual(hook.statusCode, 200, hook.body);
      const duplicateHook = await makeRequest('/api/payment/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-timestamp': timestampHeader, 'x-webhook-signature': signature }, body: payload });
      assert.strictEqual(duplicateHook.statusCode, 200, 'Duplicate webhook should be safe');
      assert.strictEqual((await db.getAllOrders()).find(o => o.id === webhookOrderId).status, 'paid');
      recordPass('Cashfree webhook validates exact raw body signature and safely processes success');

      const certOrderId = `HB-CERT-${timestamp}`;
      const certGatewayId = `CF-${certOrderId}`;
      await db.createOrder({ id: certOrderId, gatewayOrderId: certGatewayId, name: 'Certificate Snapshot Test', email: `cert-snapshot-${timestamp}@example.com`, domain: 'Data Science', duration: '4 Weeks', plan: 'certificate', programName: 'Certificate Program', amount: 1, currency: 'INR', country: 'IN', phone: '9876543210', status: 'created' });
      const certOrder = (await db.getAllOrders()).find(o => o.id === certOrderId);
      const fulfillment = await markOrderPaidAndFulfill(certOrder, 'cfpay_cert_test', certGatewayId, {
        getTaskByOrderId: orderId => db.getTaskByOrderId(orderId),
        createTask: task => db.createTask(task)
      });
      const paidCertOrder = (await db.getAllOrders()).find(o => o.id === certOrderId);
      const assignedCertPlanTask = await db.getTaskByOrderId(certOrderId);
      assert(assignedCertPlanTask, 'A paid certificate plan should receive its assigned task.');
      assert.strictEqual(assignedCertPlanTask.title, 'Predictive Maintenance Analytics System');
      assert.strictEqual(await db.getCertificateByOrderId(certOrderId), null, 'Payment fulfillment must not create a certificate.');
      assert.strictEqual(Number(paidCertOrder.amount), 1, 'Certificate fulfillment must keep the amount actually paid');
      assert.strictEqual(paidCertOrder.programName, 'Certificate Program');
      assert.strictEqual(paidCertOrder.status, 'paid');
      assert.strictEqual((await db.getUserTasks(paidCertOrder.email)).filter(task => task.orderId === certOrderId).length, 1);
      expectedOrderAmount = 2;
      recordPass('Payment fulfillment grants one assigned task and never creates or exposes a certificate');
      global.fetch = originalFetch;
    } catch (err) {
      recordFail('Cashfree payment integration', err);
    }
  } finally {
    // Clean up test records
    db.pool = null; // Never let this test helper delete records from a configured PostgreSQL database.
    await db.cleanTestRecords();
    if (localDbSnapshot) fs.writeFileSync(localDbPath, localDbSnapshot);
    else if (fs.existsSync(localDbPath)) fs.unlinkSync(localDbPath);
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
  console.error('Fatal test error:', err);
  process.exit(1);
});
