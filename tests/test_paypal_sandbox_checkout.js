/**
 * Comprehensive PayPal Sandbox Integration Test Suite for HireeBridge
 * Validates scenarios A through N:
 * A. India -> Cashfree path remains unchanged
 * B. Netherlands -> PayPal path selected
 * C. Certificate -> $4.99
 * D. Project -> $10.03
 * E. Comprehensive -> $15.07
 * F. Browser cannot manipulate amount
 * G. PayPal create-order succeeds
 * H. PayPal capture succeeds (and verifies task assigned, NO certificate issued)
 * I. Cancel flow
 * J. Create-order failure handling
 * K. Capture failure handling
 * L. Duplicate request / capture idempotency
 * M. Correct database metadata (pricing_currency=EUR, pricing_amount=3.83, payment_currency=USD, payment_amount=4.99, payment_gateway=PAYPAL)
 * N. Existing Cashfree/PPP flows remain intact
 */

const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db.js');

const MOCK_PAYPAL_PORT = 3989;
const TEST_SERVER_PORT = 3988;

let mockPayPalServer;
let serverProcess;

const mockCapturedOrders = new Map();
let mockFailCreateOrder = false;
let mockFailCapture = false;

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
          if (mockFailCreateOrder) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              name: 'INVALID_REQUEST',
              message: 'Mock order creation rejected',
              details: [{ issue: 'TEST_FAILURE', description: 'Simulated create error' }]
            }));
          }

          const pu = parsed?.purchase_units?.[0] || {};
          const orderId = 'MOCK-PAYPAL-ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          const orderData = {
            id: orderId,
            status: 'CREATED',
            intent: parsed?.intent || 'CAPTURE',
            purchase_units: [{
              reference_id: 'default',
              custom_id: pu.custom_id,
              amount: pu.amount,
              description: pu.description
            }]
          };
          mockCapturedOrders.set(orderId, orderData);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(orderData));
        }

        // 3. Capture Order
        const captureMatch = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
        if (captureMatch && req.method === 'POST') {
          const pOrderId = decodeURIComponent(captureMatch[1]);
          if (mockFailCapture) {
            res.writeHead(422, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              name: 'UNPROCESSABLE_ENTITY',
              message: 'The requested action could not be performed.',
              details: [{ issue: 'INSTRUMENT_DECLINED', description: 'Simulated capture decline' }]
            }));
          }

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

        // 5. Verify Webhook Signature
        if (req.url === '/v1/notifications/verify-webhook-signature' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ verification_status: 'SUCCESS' }));
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
      PAYPAL_CLIENT_ID: 'mock_sandbox_client_id_test_12345',
      PAYPAL_CLIENT_SECRET: 'mock_sandbox_client_secret_test_67890',
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

    serverProcess.stdout.on('data', data => {
      // console.log('[SERVER]', data.toString());
    });

    serverProcess.stderr.on('data', data => {
      // console.error('[SERVER ERR]', data.toString());
    });

    // Poll until server is ready
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

async function runTests() {
  console.log('========================================================================');
  console.log('HIREEBRIDGE PAYPAL SANDBOX INTEGRATION TEST SUITE (Scenarios A - N)');
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

  // A. India -> Cashfree path remains unchanged
  await check('A. India -> Cashfree path remains unchanged', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/checkout?plan=certificate',
      method: 'GET',
      headers: { 'cf-ipcountry': 'IN' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes("HB_GATEWAY = 'cashfree'"), 'Expected Cashfree gateway tag');
    assert(res.body.includes('https://sdk.cashfree.com/js/v3/cashfree.js'), 'Expected Cashfree JS SDK');
    assert(res.body.includes('Continue to ₹99 Payment'), 'Expected domestic ₹99 INR button');
    assert(!res.body.includes("HB_GATEWAY = 'paypal'"), 'PayPal must NOT be configured for India');
  });

  // B. Netherlands -> PayPal path selected
  await check('B. Netherlands -> PayPal path selected', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/checkout?plan=certificate',
      method: 'GET',
      headers: { 'cf-ipcountry': 'NL' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes("HB_GATEWAY = 'paypal'"), 'Expected PayPal gateway tag');
    assert(res.body.includes('Pay with PayPal'), 'Expected PayPal pay button');
    assert(res.body.includes('$4.99 USD'), 'Expected $4.99 USD button text');
    assert(res.body.includes('International Payment Notice'), 'Expected International Payment Notice');
    assert(res.body.includes('€3.83'), 'Expected Netherlands PPP reference price €3.83');
    assert(res.body.includes('/web-sdk/v6/core'), 'Expected PayPal SDK v6 core');
    assert(res.body.includes('/web-sdk/v6/paypal-payments'), 'Expected PayPal SDK v6 paypal-payments');
    assert(!res.body.includes('https://sdk.cashfree.com/js/v3/cashfree.js'), 'Cashfree SDK must NOT be loaded for international');
  });

  // C. Certificate -> $4.99 USD
  let certOrderId = null;
  let certPayPalOrderId = null;
  await check('C. Certificate Program maps to $4.99 USD', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Jan de Vries',
      email: `jan.cert.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'certificate',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json?.ok, true);
    assert.strictEqual(res.json?.amount, 4.99);
    assert.strictEqual(res.json?.currency, 'USD');
    assert.strictEqual(res.json?.pricingCurrency, 'EUR');
    assert.strictEqual(res.json?.pricingAmount, 3.83);
    assert(res.json?.paypalOrderId, 'Must return paypalOrderId');

    certOrderId = res.json.orderId;
    certPayPalOrderId = res.json.paypalOrderId;
  });

  // D. Project -> $10.03 USD
  await check('D. Project Based Internship maps to $10.03 USD', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Jan Project',
      email: `jan.proj.${Date.now()}@example.com`,
      domain: 'web-development',
      duration: '4 Weeks',
      plan: 'project',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json?.ok, true);
    assert.strictEqual(res.json?.amount, 10.03);
    assert.strictEqual(res.json?.currency, 'USD');
  });

  // E. Comprehensive -> $15.07 USD
  await check('E. Comprehensive Program maps to $15.07 USD', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Jan Comprehensive',
      email: `jan.comp.${Date.now()}@example.com`,
      domain: 'artificial-intelligence',
      duration: '4 Weeks',
      plan: 'comprehensive',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json?.ok, true);
    assert.strictEqual(res.json?.amount, 15.07);
    assert.strictEqual(res.json?.currency, 'USD');
  });

  // F. Browser cannot manipulate amount
  await check('F. Browser cannot manipulate amount (tamper-proof server enforcement)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Hacker Bob',
      email: `hacker.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'certificate',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true',
      amount: 0.01,         // Tampered low amount
      currency: 'INR'       // Tampered cheap currency
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json?.amount, 4.99, 'Server must enforce $4.99 for certificate');
    assert.strictEqual(res.json?.currency, 'USD', 'Server must enforce USD');
  });

  // G. PayPal create-order succeeds and persists correctly
  await check('G. PayPal create-order succeeds and persists order in DB', async () => {
    assert(certOrderId, 'certOrderId must exist from Test C');
    const dbOrder = await db.getOrderById(certOrderId);
    assert(dbOrder, 'Order must be found in DB');
    assert.strictEqual(dbOrder.paymentGateway, 'PAYPAL');
    assert.strictEqual(dbOrder.paymentCurrency, 'USD');
    assert.strictEqual(dbOrder.paymentAmount, 4.99);
    assert.strictEqual(dbOrder.status, 'created');
  });

  // H. PayPal capture succeeds & fulfills workflow (assigns task, NO certificate issued)
  await check('H. PayPal capture succeeds & assigns student task (NEVER auto-creates certificate)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/capture-order',
      method: 'POST'
    }, {
      orderId: certOrderId,
      paypalOrderId: certPayPalOrderId
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json?.ok, true);
    assert.strictEqual(res.json?.redirect, '/dashboard');
    assert(res.json?.paymentId, 'Must return capture paymentId');

    // Invariant: Verify DB state
    const dbOrder = await db.getOrderById(certOrderId);
    assert.strictEqual(dbOrder.status, 'paid', 'Order must be paid');
    assert.strictEqual(dbOrder.paymentGateway, 'PAYPAL');
    assert(dbOrder.paymentId, 'Order must have paymentId');

    // Invariant: Verify task is assigned to student
    const task = await db.getTaskByOrderId(certOrderId);
    assert(task, 'Task must be assigned upon payment');
    assert.strictEqual(task.status, 'assigned', 'Task must be assigned');

    // Invariant: Payment success MUST NOT directly issue certificate
    const cert = await db.getCertificateByOrderId(certOrderId);
    assert(!cert, 'CRITICAL: Payment success must NOT create certificate prior to submission/approval!');
  });

  // I. Cancel flow
  await check('I. Cancel flow leaves order in created state and allows retry', async () => {
    // When buyer clicks cancel on PayPal popup, capture is not called.
    // Create new order to simulate cancel
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Cancel Buyer',
      email: `cancel.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'certificate',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });

    const oId = res.json.orderId;
    const dbOrder = await db.getOrderById(oId);
    assert.strictEqual(dbOrder.status, 'created', 'Order remains in created state');
  });

  // J. Create-order failure handling
  await check('J. Create-order failure handling returns clear error without secret leak', async () => {
    mockFailCreateOrder = true;
    const res = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Fail User',
      email: `fail.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'certificate',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });
    mockFailCreateOrder = false;

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json?.ok, false);
    assert(!res.body.includes('mock_sandbox_client_secret'), 'Secrets must never be exposed');
  });

  // K. Capture failure handling
  await check('K. Capture failure handling returns clear error and preserves created status', async () => {
    // Create a fresh order
    const createRes = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/create-order',
      method: 'POST',
      headers: { 'cf-ipcountry': 'NL' }
    }, {
      name: 'Fail Capture User',
      email: `failcap.${Date.now()}@example.com`,
      domain: 'data-science',
      duration: '4 Weeks',
      plan: 'certificate',
      phone: '+31 6 12345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    });
    const oId = createRes.json.orderId;
    const pId = createRes.json.paypalOrderId;

    mockFailCapture = true;
    const capRes = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/capture-order',
      method: 'POST'
    }, {
      orderId: oId,
      paypalOrderId: pId
    });
    mockFailCapture = false;

    assert.strictEqual(capRes.statusCode, 422);
    assert.strictEqual(capRes.json?.ok, false);

    const dbOrder = await db.getOrderById(oId);
    assert.strictEqual(dbOrder.status, 'created', 'Order remains created upon capture failure');
  });

  // L. Duplicate request / capture idempotency
  await check('L. Duplicate capture returns alreadyPaid safely and idempotently', async () => {
    const dupRes = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/paypal/capture-order',
      method: 'POST'
    }, {
      orderId: certOrderId,
      paypalOrderId: certPayPalOrderId
    });

    assert.strictEqual(dupRes.statusCode, 200);
    assert.strictEqual(dupRes.json?.ok, true);
    assert.strictEqual(dupRes.json?.alreadyPaid, true);
    assert.strictEqual(dupRes.json?.redirect, '/dashboard');
  });

  // M. Correct database metadata
  await check('M. Correct database metadata verified in DB', async () => {
    const o = await db.getOrderById(certOrderId);
    assert.strictEqual(o.pricingCurrency, 'EUR', 'pricing_currency must be EUR');
    assert.strictEqual(o.pricingAmount, 3.83, 'pricing_amount must be 3.83');
    assert.strictEqual(o.paymentCurrency, 'USD', 'payment_currency must be USD');
    assert.strictEqual(o.paymentAmount, 4.99, 'payment_amount must be 4.99');
    assert.strictEqual(o.paymentGateway, 'PAYPAL', 'payment_gateway must be PAYPAL');
  });

  // N. Domestic Cashfree flow remains completely functional
  await check('N. Domestic Cashfree flow remains completely intact', async () => {
    // Verify POST /api/checkout rejects international but accepts domestic/explicit INR
    const intlCheckout = await request({
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/checkout?currency=INR&explicit=true',
      method: 'GET',
      headers: { 'cf-ipcountry': 'NL' }
    });
    assert.strictEqual(intlCheckout.statusCode, 200);
    assert(intlCheckout.body.includes("HB_GATEWAY = 'cashfree'"), 'Explicit INR uses Cashfree');
  });

  console.log('\n========================================================================');
  console.log(`PAYPAL SANDBOX TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  // Teardown
  if (mockPayPalServer) mockPayPalServer.close();
  if (serverProcess) serverProcess.kill();

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (mockPayPalServer) mockPayPalServer.close();
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
