/**
 * Dedicated End-to-End Test Suite for PayPal Standard Checkout Flow
 * Covers:
 * 1. Create order with experience_context:
 *    - brand_name = 'HireeBridge'
 *    - user_action = 'PAY_NOW'
 *    - shipping_preference = 'NO_SHIPPING'
 *    - return_url = HireeBridge return endpoint
 *    - cancel_url = HireeBridge cancel endpoint
 * 2. PayPal approval redirect:
 *    - GET /payment/paypal/return?token=<token>&PayerID=<payer_id>
 *    - Server-side capture executed and confirmed COMPLETED
 *    - Order marked paid in database
 *    - Task assigned, NO certificate issued (academic compliance)
 *    - Candidate session cookie set
 *    - 302 Redirect to /dashboard
 * 3. Idempotent return & capture
 * 4. Cancel flow:
 *    - GET /payment/paypal/cancel?token=<token> -> 302 /checkout?plan=...&cancelled=true
 * 5. Alias paths:
 *    - /checkout/return and /checkout/cancel
 */

const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db.js');

const MOCK_PAYPAL_PORT = 3995;
const TEST_SERVER_PORT = 3994;

let mockPayPalServer;
let serverProcess;

let lastOrderPayload = null;
const mockCapturedOrders = new Map();

function createMockPayPalServer() {
  return new Promise((resolve) => {
    mockPayPalServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let parsed = null;
        try { parsed = body ? JSON.parse(body) : null; } catch {}

        // 1. OAuth2 Token
        if (req.url === '/v1/oauth2/token' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            access_token: 'mock_sandbox_access_token_' + Date.now(),
            token_type: 'Bearer',
            app_id: 'APP-MOCK-HIREEBRIDGE',
            expires_in: 3600
          }));
        }

        // 2. Create Order
        if (req.url === '/v2/checkout/orders' && req.method === 'POST') {
          lastOrderPayload = parsed;
          const pu = parsed?.purchase_units?.[0] || {};
          const orderId = 'MOCK-PAYPAL-ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          const orderData = {
            id: orderId,
            status: 'PAYER_ACTION_REQUIRED',
            intent: parsed?.intent || 'CAPTURE',
            payment_source: parsed?.payment_source || {},
            purchase_units: [{
              reference_id: 'default',
              custom_id: pu.custom_id,
              amount: pu.amount,
              description: pu.description
            }],
            links: [
              { href: `http://127.0.0.1:${MOCK_PAYPAL_PORT}/v2/checkout/orders/${orderId}`, rel: 'self', method: 'GET' },
              { href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`, rel: 'payer-action', method: 'GET' }
            ]
          };
          mockCapturedOrders.set(orderId, orderData);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(orderData));
        }

        // 3. Capture Order
        const captureMatch = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
        if (captureMatch && req.method === 'POST') {
          const pOrderId = decodeURIComponent(captureMatch[1]);
          const existing = mockCapturedOrders.get(pOrderId);
          const capId = 'MOCK-CAPTURE-' + Date.now();
          const amountObj = existing?.purchase_units?.[0]?.amount || { value: '4.99', currency_code: 'USD' };

          const capturedResponse = {
            id: pOrderId,
            status: 'COMPLETED',
            purchase_units: [{
              reference_id: 'default',
              payments: {
                captures: [{
                  id: capId,
                  status: 'COMPLETED',
                  amount: amountObj,
                  final_capture: true,
                  seller_protection: { status: 'ELIGIBLE' }
                }]
              }
            }]
          };
          mockCapturedOrders.set(pOrderId, capturedResponse);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(capturedResponse));
        }

        // 4. Get Order Details
        const getMatch = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)$/);
        if (getMatch && req.method === 'GET') {
          const pOrderId = decodeURIComponent(getMatch[1]);
          const existing = mockCapturedOrders.get(pOrderId);
          if (existing) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(existing));
          }
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Order not found' }));
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      });
    });

    mockPayPalServer.listen(MOCK_PAYPAL_PORT, '127.0.0.1', () => {
      resolve();
    });
  });
}

function startTestServer() {
  return new Promise((resolve, reject) => {
    const env = Object.assign({}, process.env, {
      PORT: String(TEST_SERVER_PORT),
      PAYPAL_CLIENT_ID: 'mock_sandbox_client_id_return_test',
      PAYPAL_CLIENT_SECRET: 'mock_sandbox_client_secret_return_test',
      PAYPAL_ENV: 'sandbox',
      PAYPAL_API_BASE: `http://127.0.0.1:${MOCK_PAYPAL_PORT}`,
      CASHFREE_APP_ID: 'mock_cf_app_id',
      CASHFREE_SECRET_KEY: 'mock_cf_secret',
      CASHFREE_ENV: 'sandbox',
      NODE_ENV: 'test',
      SITE_URL: `http://127.0.0.1:${TEST_SERVER_PORT}`
    });

    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      const req = http.request({
        hostname: '127.0.0.1',
        port: TEST_SERVER_PORT,
        path: '/',
        method: 'GET'
      }, res => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      });
      req.on('error', () => {
        if (retries > 60) {
          clearInterval(interval);
          reject(new Error('Test server failed to start within timeout.'));
        }
      });
      req.end();
    }, 200);
  });
}

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    if (postData) {
      if (typeof postData === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runFlowTests() {
  console.log('========================================================================');
  console.log('PAYPAL RETURN & CAPTURE FLOW VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  await createMockPayPalServer();
  await startTestServer();
  await db.init();

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  // 1. Order Creation & Experience Context Verification
  let createdHbOrderId = null;
  let createdPayPalToken = null;
  await check('1. Create Order sends correct experience_context (PAY_NOW, NO_SHIPPING, brand_name, return/cancel URLs)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Anouk van Dijk',
      email: `anouk.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'certificate',
      phone: '+31 6 98765432',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json?.ok, true);
    assert(res.json?.paypalOrderId, 'Must return paypalOrderId');
    assert(res.json?.approvalUrl, 'Must return approvalUrl');
    assert(res.json?.approvalUrl.includes('checkoutnow?token='), 'Approval URL must link to checkoutnow');

    createdHbOrderId = res.json.orderId;
    createdPayPalToken = res.json.paypalOrderId;

    // Inspect the exact payload sent to PayPal Orders v2
    assert(lastOrderPayload, 'Payload must be captured by mock PayPal');
    const expContext = lastOrderPayload.payment_source?.paypal?.experience_context;
    assert(expContext, 'payment_source.paypal.experience_context must be provided');
    assert.strictEqual(expContext.brand_name, 'HireeBridge');
    assert.strictEqual(expContext.user_action, 'PAY_NOW');
    assert.strictEqual(expContext.shipping_preference, 'NO_SHIPPING');
    assert.strictEqual(expContext.locale, 'en-US');
    assert(expContext.return_url.includes('/payment/paypal/return'), `return_url must contain /payment/paypal/return, got ${expContext.return_url}`);
    assert(expContext.cancel_url.includes('/payment/paypal/cancel'), `cancel_url must contain /payment/paypal/cancel, got ${expContext.cancel_url}`);
  });

  // 2. PayPal Approval Return -> Capture -> Fulfillment -> Dashboard Redirect
  await check('2. Return endpoint triggers server capture, fulfills task, sets session, and 302 redirects to /dashboard', async () => {
    assert(createdPayPalToken, 'Must have created token from step 1');

    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: `/payment/paypal/return?token=${encodeURIComponent(createdPayPalToken)}&PayerID=MOCK_PAYER_NL_123`,
      method: 'GET'
    });

    // Invariant: Must 302 redirect to /dashboard
    assert.strictEqual(res.statusCode, 302, `Expected 302 redirect, got ${res.statusCode}`);
    assert.strictEqual(res.headers.location, '/dashboard', 'Redirect location must be /dashboard');

    // Invariant: Candidate session cookie must be set
    const setCookie = res.headers['set-cookie'];
    assert(setCookie && setCookie.some(c => c.includes('hb_session=')), 'Set-Cookie must include hb_session');

    // Invariant: Database order marked paid
    const dbOrder = await db.getOrderById(createdHbOrderId);
    assert.strictEqual(dbOrder.status, 'paid');
    assert.strictEqual(dbOrder.paymentGateway, 'PAYPAL');
    assert(dbOrder.paymentId, 'Must have paymentId');

    // Invariant: Student task assigned
    const task = await db.getTaskByOrderId(createdHbOrderId);
    assert(task, 'Internship task must be assigned');
    assert.strictEqual(task.status, 'assigned');

    // Invariant: NEVER issue certificate directly on payment
    const cert = await db.getCertificateByOrderId(createdHbOrderId);
    assert(!cert, 'CRITICAL: Certificate must not be issued directly on payment approval!');
  });

  // 3. Idempotent Return Visit
  await check('3. Visiting return endpoint again is idempotent and redirects to /dashboard safely', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: `/payment/paypal/return?token=${encodeURIComponent(createdPayPalToken)}&PayerID=MOCK_PAYER_NL_123`,
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers.location, '/dashboard');
  });

  // 4. Cancel Flow
  await check('4. Cancel endpoint redirects back to checkout preserving plan and showing cancellation notice', async () => {
    // Create new order for cancel test
    const createRes = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Lars Cancel',
      email: `lars.${Date.now()}@example.com`,
      domain: 'web-development',
      duration: '4 Weeks',
      plan: 'project',
      phone: '+31 6 11112222',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    const cancelToken = createRes.json.paypalOrderId;
    const cancelOrderId = createRes.json.orderId;

    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: `/payment/paypal/cancel?token=${encodeURIComponent(cancelToken)}`,
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 302);
    assert(res.headers.location.includes('/checkout?plan=project&cancelled=true'), `Expected redirect to /checkout with plan and cancelled, got: ${res.headers.location}`);

    // Invariant: Order remains in created status (not paid)
    const dbOrder = await db.getOrderById(cancelOrderId);
    assert.strictEqual(dbOrder.status, 'created');
  });

  // 5. Alias Endpoints (/checkout/return and /checkout/cancel)
  await check('5. Alias endpoints (/checkout/return and /checkout/cancel) work identically', async () => {
    // Create new order for alias return test
    const createRes = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Alias User',
      email: `alias.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'comprehensive',
      phone: '+31 6 33334444',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    const aliasToken = createRes.json.paypalOrderId;
    const aliasOrderId = createRes.json.orderId;

    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: `/checkout/return?token=${encodeURIComponent(aliasToken)}&PayerID=MOCK_ALIAS_PAYER`,
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers.location, '/dashboard');

    const dbOrder = await db.getOrderById(aliasOrderId);
    assert.strictEqual(dbOrder.status, 'paid');

    // Test alias cancel
    const cancelRes = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: `/checkout/cancel?token=${encodeURIComponent(aliasToken)}`,
      method: 'GET'
    });
    assert.strictEqual(cancelRes.statusCode, 302);
    assert(cancelRes.headers.location.includes('/checkout'));
  });

  console.log('\n========================================================================');
  console.log(`PAYPAL RETURN & CAPTURE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (mockPayPalServer) mockPayPalServer.close();
  if (serverProcess) serverProcess.kill();

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runFlowTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (mockPayPalServer) mockPayPalServer.close();
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
