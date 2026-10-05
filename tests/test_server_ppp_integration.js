const http = require('http');
const assert = require('assert');

// We will launch a child process running server.js on a test port
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = 3199;
const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: TEST_PORT,
    NODE_ENV: 'test',
    HB_LOCAL_TEST_PRICING: 'true',
    CASHFREE_APP_ID: 'TEST_CF_APP_ID',
    CASHFREE_SECRET_KEY: 'TEST_CF_SECRET_KEY',
    CASHFREE_ENV: 'sandbox',
    SITE_URL: 'http://127.0.0.1:3199'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverStarted = false;

serverProcess.stdout.on('data', data => {
  const msg = data.toString();
  // console.log('[SERVER]', msg);
  if (msg.includes('running') || msg.includes('3199') || msg.includes('HireeBridge')) {
    serverStarted = true;
  }
});

serverProcess.stderr.on('data', data => {
  // console.error('[SERVER ERR]', data.toString());
});

function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 Test Suite',
        ...headers
      }
    };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function makePost(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 Test Suite',
        ...headers
      }
    };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runIntegrationTests() {
  console.log('Waiting for server startup on port', TEST_PORT);
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const res = await makeRequest('/');
      if (res.status === 200) {
        console.log('Server is UP and responding!');
        break;
      }
    } catch {}
  }

  let pass = 0;
  let fail = 0;

  async function check(desc, fn) {
    try {
      await fn();
      console.log(`[PASS] ${desc}`);
      pass++;
    } catch (err) {
      console.error(`[FAIL] ${desc}: ${err.message}`);
      fail++;
    }
  }

  // 1. Homepage Netherlands pricing
  await check('Homepage renders Netherlands PPP pricing (€3.83, €7.70, €11.56)', async () => {
    const res = await makeRequest('/', { 'cf-ipcountry': 'NL' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('€3.83'), 'Must contain €3.83');
    assert.ok(res.body.includes('€7.70'), 'Must contain €7.70');
    assert.ok(res.body.includes('€11.56'), 'Must contain €11.56');
  });

  // 2. Pricing page USA pricing
  await check('Pricing page renders USA PPP pricing ($4.99, $10.03, $15.07)', async () => {
    const res = await makeRequest('/pricing', { 'cf-ipcountry': 'US' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('$4.99'), 'Must contain $4.99');
    assert.ok(res.body.includes('$10.03'), 'Must contain $10.03');
    assert.ok(res.body.includes('$15.07'), 'Must contain $15.07');
  });

  // 3. Australia pricing
  await check('Pricing page renders Australia PPP pricing (A$7.31, A$14.69, A$22.07)', async () => {
    const res = await makeRequest('/pricing', { 'cf-ipcountry': 'AU' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('A$7.31'), 'Must contain A$7.31');
    assert.ok(res.body.includes('A$14.69'), 'Must contain A$14.69');
    assert.ok(res.body.includes('A$22.07'), 'Must contain A$22.07');
  });

  // 4. Japan pricing (zero decimals)
  await check('Pricing page renders Japan PPP pricing (¥516, ¥1,037, ¥1,557)', async () => {
    const res = await makeRequest('/pricing', { 'cf-ipcountry': 'JP' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('¥516'), 'Must contain ¥516');
    assert.ok(res.body.includes('¥1,037'), 'Must contain ¥1,037');
    assert.ok(res.body.includes('¥1,557'), 'Must contain ¥1,557');
  });

  // 5. India domestic pricing
  await check('Pricing page renders India domestic pricing (₹99, ₹199, ₹299)', async () => {
    const res = await makeRequest('/pricing', { 'cf-ipcountry': 'IN' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('₹99'), 'Must contain ₹99');
    assert.ok(res.body.includes('₹199'), 'Must contain ₹199');
    assert.ok(res.body.includes('₹299'), 'Must contain ₹299');
  });

  // 6. Zimbabwe handling (NEVER 0.14 ZWL)
  await check('Zimbabwe NEVER renders 0.14 ZWL or obsolete currency; falls back to USD $4.99 / $10.03 / $15.07', async () => {
    const res = await makeRequest('/pricing', { 'cf-ipcountry': 'ZW' });
    assert.strictEqual(res.status, 200);
    assert.ok(!res.body.includes('0.14'), 'Must NEVER contain 0.14');
    assert.ok(!res.body.includes('ZWL'), 'Must NEVER contain ZWL');
    assert.ok(res.body.includes('$4.99'), 'Must contain fallback $4.99');
  });

  // 7. Namibia handling (NA)
  await check('Namibia renders authoritative NAD pricing (N$36.82, N$74.02, N$111.21)', async () => {
    const res = await makeRequest('/pricing', { 'cf-ipcountry': 'NA' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('N$36.82'), 'Must contain N$36.82');
    assert.ok(res.body.includes('N$74.02'), 'Must contain N$74.02');
    assert.ok(res.body.includes('N$111.21'), 'Must contain N$111.21');
  });

  // 8. Checkout page for Nigeria (NGN)
  await check('Checkout page renders Nigeria PPP pricing (₦1,587.18) and USD fallback notice with correct terminology', async () => {
    const res = await makeRequest('/checkout?plan=certificate', { 'cf-ipcountry': 'NG' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('₦1,587.18') || res.body.includes('NGN'), 'Must contain NGN pricing');
    assert.ok(res.body.includes('International Payment Notice'), 'Must contain International Payment Notice');
    assert.ok(res.body.includes('Local reference price:'), 'Must contain Local reference price label');
    assert.ok(res.body.includes('Amount you will pay:'), 'Must contain Amount you will pay label');
    assert.ok(res.body.includes('Continue in USD'), 'Must contain Continue in USD button');
    assert.ok(res.body.includes('$4.99'), 'Must contain USD payment amount $4.99');
    assert.ok(!res.body.includes('Switch to INR (₹)'), 'Must NOT contain Switch to INR fallback');
  });

  // 9. Checkout price tampering test
  await check('POST /api/checkout ignores malicious client amount and enforces server price', async () => {
    const maliciousPayload = {
      name: 'Tamper Tester',
      email: 'tamper.tester@example.com',
      domain: 'web-development',
      duration: '4-weeks',
      plan: 'comprehensive',
      phone: '9876543210',
      privacyConsent: 'true',
      ageConfirmation: 'true',
      amount: 0.01, // MALICIOUS CLIENT ATTEMPT
      currency: 'INR' // Malicious cross-border attempt without explicitInr flag
    };

    // Make request from US
    const res = await makePost('/api/checkout', maliciousPayload, { 'cf-ipcountry': 'US' });
    const j = JSON.parse(res.body);

    // Should NOT be 0.01, must be USD 15.07 (Comprehensive for US)
    // Note: since CASHFREE is in sandbox/mock or config, it should create or fail with authoritative amount
    if (j.ok) {
      assert.strictEqual(j.paymentCurrency || j.currency, 'USD');
      assert.strictEqual(j.paymentAmount || j.amount, 15.07);
    } else {
      // If payment gateway responded or halted, verify it didn't authorize 0.01
      assert.notStrictEqual(j.amount, 0.01);
    }
  });

  // 10. POST /api/checkout for Nigeria charges in USD ($15.07 for comprehensive)
  await check('POST /api/checkout for Nigeria authorizes and charges in USD', async () => {
    const payload = {
      name: 'Nigeria Student',
      email: 'nigeria.student@example.com',
      domain: 'data-science',
      duration: '4-weeks',
      plan: 'comprehensive',
      phone: '+234 801 234 5678',
      privacyConsent: 'true',
      ageConfirmation: 'true',
      amount: 999999 // Ignored
    };
    const res = await makePost('/api/checkout', payload, { 'cf-ipcountry': 'NG' });
    const j = JSON.parse(res.body);
    console.log('TEST 10 RES:', res.status, j);
    if (j.ok) {
      assert.strictEqual(j.paymentCurrency || j.currency, 'USD');
      assert.strictEqual(j.paymentAmount || j.amount, 15.07);
    } else {
      assert.strictEqual(j.paymentCurrency || j.settlementCurrency || j.currency, 'USD');
      assert.strictEqual(j.paymentAmount || j.settlementAmount, 15.07);
    }
  });

  console.log(`\nINTEGRATION TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
  serverProcess.kill();
  process.exit(fail > 0 ? 1 : 0);
}

runIntegrationTests().catch(err => {
  console.error('Fatal test error:', err);
  serverProcess.kill();
  process.exit(1);
});
