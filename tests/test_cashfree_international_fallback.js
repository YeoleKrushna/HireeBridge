const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db.js');

const MOCK_CF_PORT = 3899;
const TEST_SERVER_PORT = 3898;

let mockCfServer;
let serverProcess;

// Track requests handled by mock Cashfree
const mockReceivedRequests = [];
let mockConfig = {
  allowEur: true,
  allowUsd: true,
  eurErrorCode: 400,
  usdErrorCode: 500
};

function createMockCashfreeServer() {
  return new Promise((resolve) => {
    mockCfServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let parsed = null;
        try { parsed = body ? JSON.parse(body) : null; } catch {}
        
        const record = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: parsed
        };
        mockReceivedRequests.push(record);

        if (req.url.startsWith('/orders') && req.method === 'POST') {
          const orderCurrency = parsed?.order_currency;
          const orderAmount = parsed?.order_amount;
          const orderId = parsed?.order_id;

          if (orderCurrency === 'EUR') {
            if (mockConfig.allowEur) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                order_id: orderId,
                order_amount: orderAmount,
                order_currency: 'EUR',
                payment_session_id: `session_mock_eur_${Date.now()}`,
                order_status: 'ACTIVE'
              }));
            } else {
              res.writeHead(mockConfig.eurErrorCode, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                message: 'Currency EUR not enabled for this merchant account',
                code: 'currency_not_supported',
                type: 'invalid_request_error'
              }));
            }
          }

          if (orderCurrency === 'USD') {
            if (mockConfig.allowUsd) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                order_id: orderId,
                order_amount: orderAmount,
                order_currency: 'USD',
                payment_session_id: `session_mock_usd_${Date.now()}`,
                order_status: 'ACTIVE'
              }));
            } else {
              res.writeHead(mockConfig.usdErrorCode, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                message: 'USD gateway processing currently unavailable',
                code: 'gateway_error',
                type: 'api_error'
              }));
            }
          }

          // Default fallback response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            order_id: orderId,
            order_amount: orderAmount,
            order_currency: orderCurrency || 'INR',
            payment_session_id: `session_mock_gen_${Date.now()}`,
            order_status: 'ACTIVE'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK' }));
      });
    });

    mockCfServer.listen(MOCK_CF_PORT, '127.0.0.1', () => {
      console.log(`Mock Cashfree server listening on http://127.0.0.1:${MOCK_CF_PORT}`);
      resolve();
    });
  });
}

function startHireeBridgeServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PORT: TEST_SERVER_PORT,
        NODE_ENV: 'test',
        HB_LOCAL_TEST_PRICING: 'true',
        CASHFREE_APP_ID: 'TEST_CF_MOCK_APP_ID',
        CASHFREE_SECRET_KEY: 'TEST_CF_MOCK_SECRET_KEY',
        CASHFREE_ENV: 'sandbox',
        CASHFREE_API_BASE: `http://127.0.0.1:${MOCK_CF_PORT}`,
        SITE_URL: `http://127.0.0.1:${TEST_SERVER_PORT}`
      },
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

function postCheckout(payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_SERVER_PORT,
      path: '/api/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 Test Fallback Suite',
        ...headers
      }
    };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: body });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runFallbackTestSuite() {
  console.log('========================================================================');
  console.log('HIREEBRIDGE CASHFREE INTERNATIONAL CHECKOUT FALLBACK TEST SUITE');
  console.log('========================================================================\n');

  await db.init();
  await createMockCashfreeServer();
  await startHireeBridgeServer();

  let pass = 0;
  let fail = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      pass++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      fail++;
    }
  }

  // ------------------------------------------------------------------------
  // A. Netherlands EUR order succeeds -> EUR checkout opens
  // ------------------------------------------------------------------------
  await check('A. Netherlands EUR order succeeds -> EUR checkout opens with payment_session_id', async () => {
    mockConfig.allowEur = true;
    mockConfig.allowUsd = true;
    mockReceivedRequests.length = 0;

    const payload = {
      name: 'Jan de Vries',
      email: `jan.${Date.now()}@example.nl`,
      domain: 'data-science',
      duration: '4-weeks',
      plan: 'certificate',
      phone: '+31612345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    };

    const res = await postCheckout(payload, { 'cf-ipcountry': 'NL' });
    assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${res.rawBody}`);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.currency, 'EUR');
    assert.strictEqual(res.body.amount, 3.83);
    assert.ok(res.body.payment_session_id.startsWith('session_mock_eur_'), 'Expected EUR payment session');
    
    // Check gateway request
    const eurReq = mockReceivedRequests.find(r => r.body?.order_currency === 'EUR');
    assert.ok(eurReq, 'Cashfree should have received order creation request with EUR');
    assert.strictEqual(eurReq.body.order_amount, 3.83);
  });

  // ------------------------------------------------------------------------
  // B. Netherlands EUR order fails -> USD fallback order is created
  // ------------------------------------------------------------------------
  await check('B. Netherlands EUR order fails -> USD fallback order is automatically created', async () => {
    mockConfig.allowEur = false; // Simulate EUR rejection by Cashfree
    mockConfig.allowUsd = true;
    mockReceivedRequests.length = 0;

    const payload = {
      name: 'Sanne Bakker',
      email: `sanne.${Date.now()}@example.nl`,
      domain: 'data-science',
      duration: '4-weeks',
      plan: 'certificate',
      phone: '+31687654321',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    };

    const res = await postCheckout(payload, { 'cf-ipcountry': 'NL' });
    assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${res.rawBody}`);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.currency, 'USD');
    assert.strictEqual(res.body.amount, 4.99);
    assert.strictEqual(res.body.fallbackUsed, true);
    assert.strictEqual(res.body.pricingCurrency, 'EUR');
    assert.strictEqual(res.body.pricingAmount, 3.83);

    // Verify Cashfree received both attempts
    const eurReq = mockReceivedRequests.find(r => r.body?.order_currency === 'EUR');
    assert.ok(eurReq, 'EUR order attempt was made');
    assert.strictEqual(eurReq.body.order_amount, 3.83);

    const usdReq = mockReceivedRequests.find(r => r.body?.order_currency === 'USD');
    assert.ok(usdReq, 'USD fallback order attempt was made');
    assert.strictEqual(usdReq.body.order_amount, 4.99);
    assert.ok(usdReq.body.order_id.endsWith('-USD'), 'USD gateway order id should have -USD suffix');
  });

  // ------------------------------------------------------------------------
  // C. USD payment session is returned and opens Cashfree checkout
  // ------------------------------------------------------------------------
  await check('C. USD payment session is returned and valid for cashfree.checkout()', async () => {
    mockConfig.allowEur = false;
    mockConfig.allowUsd = true;

    const payload = {
      name: 'Lars van Dijk',
      email: `lars.${Date.now()}@example.nl`,
      domain: 'web-development',
      duration: '8-weeks',
      plan: 'project',
      phone: '+31655512345',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    };

    const res = await postCheckout(payload, { 'cf-ipcountry': 'NL' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.mode, 'cashfree');
    assert.ok(res.body.payment_session_id && res.body.payment_session_id.startsWith('session_mock_usd_'));
    assert.strictEqual(res.body.currency, 'USD');
    assert.strictEqual(res.body.amount, 10.03); // Project based internship = 10.03 USD
  });

  // ------------------------------------------------------------------------
  // D. Correct USD amount for all 3 plans
  // ------------------------------------------------------------------------
  await check('D. Correct standardized USD amounts for all 3 plans ($4.99, $10.03, $15.07)', async () => {
    mockConfig.allowEur = false;
    mockConfig.allowUsd = true;

    const plans = [
      { plan: 'certificate', expectedUsd: 4.99, expectedEur: 3.83 },
      { plan: 'project', expectedUsd: 10.03, expectedEur: 7.70 },
      { plan: 'comprehensive', expectedUsd: 15.07, expectedEur: 11.56 }
    ];

    for (const p of plans) {
      const payload = {
        name: `Tester ${p.plan}`,
        email: `test.${p.plan}.${Date.now()}@example.nl`,
        domain: 'data-science',
        duration: '4-weeks',
        plan: p.plan,
        phone: '+31611122233',
        privacyConsent: 'true',
        ageConfirmation: 'true',
        useUsdFallback: true // Explicit button click simulation
      };

      const res = await postCheckout(payload, { 'cf-ipcountry': 'NL' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.amount, p.expectedUsd);
      assert.strictEqual(res.body.currency, 'USD');
      assert.strictEqual(res.body.pricingCurrency, 'EUR');
      assert.strictEqual(res.body.pricingAmount, p.expectedEur);
    }
  });

  // ------------------------------------------------------------------------
  // E. Database records local reference + actual payment currency separately
  // ------------------------------------------------------------------------
  await check('E. Database records pricing_currency=EUR & payment_currency=USD separately', async () => {
    mockConfig.allowEur = false;
    mockConfig.allowUsd = true;

    const testEmail = `database.audit.${Date.now()}@example.nl`;
    const payload = {
      name: 'Emma Visser',
      email: testEmail,
      domain: 'cloud-devops',
      duration: '4-weeks',
      plan: 'comprehensive',
      phone: '+31699988877',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    };

    const res = await postCheckout(payload, { 'cf-ipcountry': 'NL' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);

    const savedOrder = await db.getOrderById(res.body.orderId);
    assert.ok(savedOrder, 'Order must be found in database');

    // Local PPP reference invariants:
    assert.strictEqual(savedOrder.pricingCurrency || savedOrder.pricing_currency, 'EUR', 'pricing_currency must be EUR');
    assert.strictEqual(Number(savedOrder.pricingAmount || savedOrder.pricing_amount), 11.56, 'pricing_amount must be 11.56');

    // Cashfree actual payment invariants:
    assert.strictEqual(savedOrder.paymentCurrency || savedOrder.payment_currency, 'USD', 'payment_currency must be USD');
    assert.strictEqual(Number(savedOrder.paymentAmount || savedOrder.payment_amount), 15.07, 'payment_amount must be 15.07');
    assert.strictEqual(savedOrder.currency, 'USD', 'legacy currency must be USD');
    assert.strictEqual(Number(savedOrder.amount), 15.07, 'legacy amount must be 15.07');
  });

  // ------------------------------------------------------------------------
  // F. Double-click does not create duplicate orders
  // ------------------------------------------------------------------------
  await check('F. Double-click rejection: concurrent request returns 429 lock', async () => {
    const lockEmail = `doubleclick.${Date.now()}@example.nl`;
    const payload = {
      name: 'Fast Clicker',
      email: lockEmail,
      domain: 'data-science',
      duration: '4-weeks',
      plan: 'certificate',
      phone: '+31612345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    };

    // Send two requests concurrently
    const [p1, p2] = await Promise.all([
      postCheckout(payload, { 'cf-ipcountry': 'NL' }),
      postCheckout(payload, { 'cf-ipcountry': 'NL' })
    ]);

    const statuses = [p1.status, p2.status];
    assert.ok(statuses.includes(429), `One concurrent request must be rejected with 429 (Got: ${statuses.join(', ')})`);
    const rejected = p1.status === 429 ? p1 : p2;
    assert.strictEqual(rejected.body.error, 'An enrollment request is already processing. Please wait a moment.');
  });

  // ------------------------------------------------------------------------
  // G. USD failure shows fatal error without reload/loop
  // ------------------------------------------------------------------------
  await check('G. Fatal USD gateway failure returns non-retryable 502 with usdFallbackAllowed=false', async () => {
    mockConfig.allowEur = false;
    mockConfig.allowUsd = false; // Both EUR and USD fail
    mockConfig.usdErrorCode = 502;

    const payload = {
      name: 'Willem Alexander',
      email: `willem.${Date.now()}@example.nl`,
      domain: 'data-science',
      duration: '4-weeks',
      plan: 'certificate',
      phone: '+31612345678',
      privacyConsent: 'true',
      ageConfirmation: 'true'
    };

    const res = await postCheckout(payload, { 'cf-ipcountry': 'NL' });
    assert.strictEqual(res.status, 502);
    assert.strictEqual(res.body.ok, false);
    assert.strictEqual(res.body.code, 'PAYMENT_CURRENCY_UNAVAILABLE');
    assert.strictEqual(res.body.usdFallbackAllowed, true);

    // Now test explicit USD failure when user clicks "Continue in USD"
    const usdFailPayload = {
      ...payload,
      email: `willem.retry.${Date.now()}@example.nl`,
      useUsdFallback: true
    };

    const resUsd = await postCheckout(usdFailPayload, { 'cf-ipcountry': 'NL' });
    assert.strictEqual(resUsd.status, 502);
    assert.strictEqual(resUsd.body.ok, false);
    assert.strictEqual(resUsd.body.code, 'PAYMENT_UNAVAILABLE');
    assert.strictEqual(resUsd.body.usdFallbackAllowed, false);
    assert.strictEqual(resUsd.body.error, 'Unable to start USD payment. Please try again or contact support.');
  });

  console.log(`\n========================================================================`);
  console.log(`FALLBACK TEST SUITE SUMMARY: ${pass} PASSED, ${fail} FAILED`);
  console.log(`========================================================================\n`);

  serverProcess.kill();
  mockCfServer.close();
  process.exit(fail > 0 ? 1 : 0);
}

runFallbackTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  if (serverProcess) serverProcess.kill();
  if (mockCfServer) mockCfServer.close();
  process.exit(1);
});
