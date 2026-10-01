require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');

const db = require('../db');
const { app } = require('../server');

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

    // ----------------------------------------------------
    // Test 9: End-to-end payment verification endpoint (/api/payment/verify)
    // ----------------------------------------------------
    try {
      const e2eOrderId = `HB-E2E-${timestamp}`;
      const e2eGatewayOrderId = `order_e2e_${timestamp}`;
      const e2ePaymentId = `pay_e2e_${timestamp}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_for_signing';

      // Temporarily set RAZORPAY_KEY_SECRET if not in env
      const origSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.RAZORPAY_KEY_SECRET = secret;

      // Seed order
      await db.createOrder({
        id: e2eOrderId,
        name: 'E2E Verify User',
        email: `e2e_${timestamp}@example.com`,
        domain: 'Data Science',
        duration: '4 Weeks',
        plan: 'project',
        amount: 199,
        status: 'created',
        gatewayOrderId: e2eGatewayOrderId
      });

      // Calculate HMAC signature
      const signature = crypto.createHmac('sha256', secret)
        .update(`${e2eGatewayOrderId}|${e2ePaymentId}`)
        .digest('hex');

      const verifyRes = await makeRequest('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: e2eOrderId,
          gatewayOrderId: e2eGatewayOrderId,
          paymentId: e2ePaymentId,
          signature
        })
      });

      assert.strictEqual(verifyRes.statusCode, 200, `/api/payment/verify should return 200, got ${verifyRes.statusCode}: ${verifyRes.body}`);
      const body = JSON.parse(verifyRes.body);
      assert.strictEqual(body.ok, true);

      // Verify the order in the database was updated
      const allOrders = await db.getAllOrders();
      const updatedOrder = allOrders.find(o => o.id === e2eOrderId);
      assert(updatedOrder, 'Updated order should be found in db.getAllOrders()');
      assert.strictEqual(updatedOrder.status, 'paid', 'Order status should be updated to paid');

      process.env.RAZORPAY_KEY_SECRET = origSecret;
      recordPass('POST /api/payment/verify updates order status and IDs via db.updateOrder successfully');
    } catch (err) {
      recordFail('POST /api/payment/verify integration', err);
    }

    // ----------------------------------------------------
    // Test 10: End-to-end webhook endpoint (/api/payment/webhook)
    // ----------------------------------------------------
    try {
      const webhookOrderId = `HB-HOOK-${timestamp}`;
      const webhookGatewayId = `order_hook_${timestamp}`;
      const webhookPaymentId = `pay_hook_${timestamp}`;

      await db.createOrder({
        id: webhookOrderId,
        name: 'Webhook User',
        email: `webhook_${timestamp}@example.com`,
        domain: 'Machine Learning',
        duration: '4 Weeks',
        plan: 'project',
        amount: 299,
        status: 'created',
        gatewayOrderId: webhookGatewayId
      });

      // If webhook has gateway_order_id stored in PG
      await db.updateOrder(webhookOrderId, { gatewayOrderId: webhookGatewayId });

      const webhookPayload = JSON.stringify({
        event: 'order.paid',
        payload: {
          order: {
            entity: { id: webhookGatewayId }
          },
          payment: {
            entity: { id: webhookPaymentId, order_id: webhookGatewayId }
          }
        }
      });

      const hookRes = await makeRequest('/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: webhookPayload
      });

      assert.strictEqual(hookRes.statusCode, 200, `Webhook should return 200, got ${hookRes.statusCode}`);

      // Verify order status
      const allOrders = await db.getAllOrders();
      const hookOrder = allOrders.find(o => o.id === webhookOrderId);
      assert(hookOrder, 'Webhook order should exist');
      assert.strictEqual(hookOrder.status, 'paid', 'Webhook order status should be paid');

      recordPass('POST /api/payment/webhook successfully updates order to paid');
    } catch (err) {
      recordFail('POST /api/payment/webhook integration', err);
    }

  } finally {
    // Clean up test records
    await db.cleanTestRecords();
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
