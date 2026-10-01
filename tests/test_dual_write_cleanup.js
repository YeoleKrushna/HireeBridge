require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const db = require('../db');

const DB_FILE = path.join(__dirname, '../data/db.json');

function getJsonDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING DUAL-WRITE CLEANUP VERIFICATION TEST SUITE');
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

  const timestamp = Date.now();
  const testEmail = `dualwrite_test_${timestamp}@example.com`;
  const originalPool = db.pool;

  try {
    assert(db.pool !== null, 'Neon PostgreSQL must be configured for dual-write verification');

    // Snapshot JSON DB before testing
    const initialJson = getJsonDb();

    // ----------------------------------------------------
    // TEST A: createOrder and updateOrder with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const orderId = `HB-DW-ORD-${timestamp}`;
      const orderPayload = {
        id: orderId,
        name: 'DualWrite Test User',
        email: testEmail,
        domain: 'Data Science',
        duration: '4 Weeks',
        plan: 'project',
        amount: 299,
        status: 'created',
        credentialId: null
      };

      const ordersCountBefore = (getJsonDb().orders || []).length;
      await db.createOrder(orderPayload);
      const ordersAfterCreate = (getJsonDb().orders || []);
      assert.strictEqual(ordersAfterCreate.length, ordersCountBefore, 'createOrder must NOT add to data/db.json when PG is active');
      assert(!ordersAfterCreate.some(o => o.id === orderId), 'Order ID must not exist in data/db.json');

      // Verify in PG
      const pgOrderCheck = await db.pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      assert.strictEqual(pgOrderCheck.rows.length, 1, 'Order must exist in PostgreSQL');

      // Update order
      await db.updateOrder(orderId, { status: 'paid', paymentId: `pay_dw_${timestamp}`, gatewayOrderId: `order_dw_${timestamp}` });
      const ordersAfterUpdate = (getJsonDb().orders || []);
      assert.strictEqual(ordersAfterUpdate.length, ordersCountBefore, 'updateOrder must NOT modify data/db.json count');
      assert(!ordersAfterUpdate.some(o => o.id === orderId), 'Order ID must still not exist in data/db.json');

      const pgUpdatedCheck = await db.pool.query('SELECT status, payment_id FROM orders WHERE id = $1', [orderId]);
      assert.strictEqual(pgUpdatedCheck.rows[0].status, 'paid');
      assert.strictEqual(pgUpdatedCheck.rows[0].payment_id, `pay_dw_${timestamp}`);

      recordPass('Test A: With PostgreSQL configured, createOrder/updateOrder does NOT modify data/db.json');
    } catch (err) {
      recordFail('Test A (Orders dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST B: createCertificate with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const credId = `GR-DW-CERT-${timestamp.toString().slice(-6)}`;
      const certCountBefore = (getJsonDb().certificates || []).length;

      await db.createCertificate({
        credentialId: credId,
        orderId: `HB-DW-ORD-${timestamp}`,
        name: 'DualWrite User',
        email: testEmail,
        domain: 'Data Science',
        duration: '4 Weeks',
        issueDate: '01 Oct 2026',
        pdf: `/downloads/${credId}.pdf`,
        svg: `/downloads/${credId}.svg`
      });

      const certsAfter = (getJsonDb().certificates || []);
      assert.strictEqual(certsAfter.length, certCountBefore, 'createCertificate must NOT add to data/db.json when PG is active');
      assert(!certsAfter.some(c => c.credentialId === credId), 'Credential ID must not exist in data/db.json');

      // Verify in PG
      const pgCert = await db.pool.query('SELECT * FROM certificates WHERE credential_id = $1', [credId]);
      assert.strictEqual(pgCert.rows.length, 1, 'Certificate must exist in PostgreSQL');

      recordPass('Test B: With PostgreSQL configured, createCertificate does NOT modify data/db.json');
    } catch (err) {
      recordFail('Test B (Certificate dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST C: createTask with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const taskId = `tsk-dw-${timestamp.toString().slice(-6)}`;
      const taskCountBefore = (getJsonDb().tasks || []).length;

      await db.createTask({
        id: taskId,
        email: testEmail,
        title: 'Complete DualWrite Module',
        description: 'Verify no local JSON write occurs',
        dueDate: '2026-10-15',
        status: 'pending'
      });

      const tasksAfter = (getJsonDb().tasks || []);
      assert.strictEqual(tasksAfter.length, taskCountBefore, 'createTask must NOT add to data/db.json when PG is active');
      assert(!tasksAfter.some(t => t.id === taskId), 'Task must not exist in data/db.json');

      const pgTask = await db.pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      assert.strictEqual(pgTask.rows.length, 1, 'Task must exist in PostgreSQL');

      recordPass('Test C: With PostgreSQL configured, createTask does NOT modify data/db.json');
    } catch (err) {
      recordFail('Test C (Task dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST D: createSubmission & evaluateSubmission with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const subId = `sub-dw-${timestamp.toString().slice(-6)}`;
      const subCountBefore = (getJsonDb().submissions || []).length;

      await db.createSubmission({
        id: subId,
        name: 'DualWrite Student',
        email: testEmail,
        github: 'https://github.com/dualwrite/repo',
        linkedin: 'https://linkedin.com/in/dualwrite',
        deployment: 'https://dualwrite.example.com',
        notes: 'DualWrite test notes',
        status: 'pending'
      });

      const subsAfter = (getJsonDb().submissions || []);
      assert.strictEqual(subsAfter.length, subCountBefore, 'createSubmission must NOT add to data/db.json when PG is active');
      assert(!subsAfter.some(s => s.id === subId), 'Submission must not exist in data/db.json');

      const pgSub = await db.pool.query('SELECT * FROM submissions WHERE id = $1', [subId]);
      assert.strictEqual(pgSub.rows.length, 1, 'Submission must exist in PostgreSQL');
      assert.strictEqual(pgSub.rows[0].status, 'pending');

      // Evaluate submission
      await db.evaluateSubmission(subId, 'approved');
      const subsAfterEval = (getJsonDb().submissions || []);
      assert.strictEqual(subsAfterEval.length, subCountBefore, 'evaluateSubmission must NOT modify data/db.json');

      const pgSubEval = await db.pool.query('SELECT status FROM submissions WHERE id = $1', [subId]);
      assert.strictEqual(pgSubEval.rows[0].status, 'approved', 'Submission status in PostgreSQL must be approved');

      recordPass('Test D: With PostgreSQL configured, createSubmission and evaluateSubmission do NOT modify data/db.json');
    } catch (err) {
      recordFail('Test D (Submission dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST E: createNotification with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const notifId = `notif-dw-${timestamp.toString().slice(-6)}`;
      const notifCountBefore = (getJsonDb().notifications || []).length;

      await db.createNotification({
        id: notifId,
        email: testEmail,
        broadcast: false,
        title: 'DualWrite Test Notification',
        message: 'No JSON dual write permitted'
      });

      const notifsAfter = (getJsonDb().notifications || []);
      assert.strictEqual(notifsAfter.length, notifCountBefore, 'createNotification must NOT add to data/db.json when PG is active');
      assert(!notifsAfter.some(n => n.id === notifId), 'Notification must not exist in data/db.json');

      const pgNotif = await db.pool.query('SELECT * FROM notifications WHERE id = $1', [notifId]);
      assert.strictEqual(pgNotif.rows.length, 1, 'Notification must exist in PostgreSQL');

      recordPass('Test E: With PostgreSQL configured, createNotification does NOT modify data/db.json');
    } catch (err) {
      recordFail('Test E (Notification dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST F: createInquiry with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const inqId = `inq-dw-${timestamp.toString().slice(-6)}`;
      const inqCountBefore = (getJsonDb().inquiries || []).length;

      await db.createInquiry({
        id: inqId,
        name: 'DualWrite Inquirer',
        email: testEmail,
        subject: 'DualWrite Inquiry Question',
        message: 'Testing non-dual write inquiry behavior'
      });

      const inqsAfter = (getJsonDb().inquiries || []);
      assert.strictEqual(inqsAfter.length, inqCountBefore, 'createInquiry must NOT add to data/db.json when PG is active');
      assert(!inqsAfter.some(i => i.id === inqId), 'Inquiry must not exist in data/db.json');

      const pgInq = await db.pool.query('SELECT * FROM inquiries WHERE id = $1', [inqId]);
      assert.strictEqual(pgInq.rows.length, 1, 'Inquiry must exist in PostgreSQL');

      recordPass('Test F: With PostgreSQL configured, createInquiry does NOT modify data/db.json');
    } catch (err) {
      recordFail('Test F (Inquiry dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST G: upsertDomainResources with PostgreSQL configured
    // ----------------------------------------------------
    try {
      const testDomain = `DualWriteDomain_${timestamp}`;
      const drCountBefore = (getJsonDb().domain_resources || []).length;

      const res = await db.upsertDomainResources({
        domain: testDomain,
        github_url: 'https://github.com/dw/resources',
        report_url: 'https://drive.google.com/dw/report',
        ppt_url: 'https://drive.google.com/dw/ppt'
      });

      assert(res !== null, 'upsertDomainResources must succeed in PostgreSQL');
      const drsAfter = (getJsonDb().domain_resources || []);
      assert.strictEqual(drsAfter.length, drCountBefore, 'upsertDomainResources must NOT add to data/db.json when PG is active');
      assert(!drsAfter.some(r => r.domain && r.domain.toLowerCase() === testDomain.toLowerCase()), 'Domain resource must not exist in data/db.json');

      const pgDR = await db.pool.query('SELECT * FROM domain_resources WHERE LOWER(domain) = LOWER($1)', [testDomain]);
      assert.strictEqual(pgDR.rows.length, 1, 'Domain resource must exist in PostgreSQL');

      recordPass('Test G: With PostgreSQL configured, upsertDomainResources does NOT modify data/db.json');
    } catch (err) {
      recordFail('Test G (Domain Resources dual-write check)', err);
    }

    // ----------------------------------------------------
    // TEST H: With PostgreSQL NOT configured (pool === null), all operations update data/db.json
    // ----------------------------------------------------
    try {
      db.pool = null; // Simulate local development mode

      const localTime = Date.now();
      const localEmail = `localdev_${localTime}@example.com`;

      // 1. Order in local mode
      const localOrdId = `HB-LOCAL-${localTime}`;
      await db.createOrder({
        id: localOrdId,
        name: 'Local Dev User',
        email: localEmail,
        domain: 'Web Development',
        duration: '4 Weeks',
        plan: 'project',
        amount: 199,
        status: 'created'
      });
      let jsonNow = getJsonDb();
      assert(jsonNow.orders.some(o => o.id === localOrdId), 'Local createOrder must write to db.json');

      await db.updateOrder(localOrdId, { status: 'paid', paymentId: `pay_loc_${localTime}` });
      jsonNow = getJsonDb();
      const updatedLocalOrd = jsonNow.orders.find(o => o.id === localOrdId);
      assert.strictEqual(updatedLocalOrd.status, 'paid', 'Local updateOrder must update db.json');

      // 2. Certificate in local mode
      const localCredId = `GR-LOC-${localTime.toString().slice(-6)}`;
      await db.createCertificate({
        credentialId: localCredId,
        orderId: localOrdId,
        name: 'Local Dev User',
        email: localEmail,
        domain: 'Web Development',
        duration: '4 Weeks',
        issueDate: '01 Oct 2026',
        pdf: `/downloads/${localCredId}.pdf`,
        svg: `/downloads/${localCredId}.svg`
      });
      jsonNow = getJsonDb();
      assert(jsonNow.certificates.some(c => c.credentialId === localCredId), 'Local createCertificate must write to db.json');

      // 3. Task in local mode
      const localTaskId = `tsk-loc-${localTime.toString().slice(-6)}`;
      await db.createTask({
        id: localTaskId,
        email: localEmail,
        title: 'Local Task',
        description: 'Local dev task',
        dueDate: '2026-10-30',
        status: 'pending'
      });
      jsonNow = getJsonDb();
      assert(jsonNow.tasks.some(t => t.id === localTaskId), 'Local createTask must write to db.json');

      // 4. Submission in local mode
      const localSubId = `sub-loc-${localTime.toString().slice(-6)}`;
      await db.createSubmission({
        id: localSubId,
        name: 'Local Dev User',
        email: localEmail,
        github: 'https://github.com/local/repo',
        linkedin: 'https://linkedin.com/in/local',
        deployment: '',
        notes: '',
        status: 'pending'
      });
      jsonNow = getJsonDb();
      assert(jsonNow.submissions.some(s => s.id === localSubId), 'Local createSubmission must write to db.json');

      await db.evaluateSubmission(localSubId, 'approved');
      jsonNow = getJsonDb();
      const evaluatedSub = jsonNow.submissions.find(s => s.id === localSubId);
      assert.strictEqual(evaluatedSub.status, 'approved', 'Local evaluateSubmission must update db.json');

      // 5. Notification in local mode
      const localNotifId = `notif-loc-${localTime.toString().slice(-6)}`;
      await db.createNotification({
        id: localNotifId,
        email: localEmail,
        broadcast: false,
        title: 'Local Notification',
        message: 'Local notification message'
      });
      jsonNow = getJsonDb();
      assert(jsonNow.notifications.some(n => n.id === localNotifId), 'Local createNotification must write to db.json');

      // 6. Inquiry in local mode
      const localInqId = `inq-loc-${localTime.toString().slice(-6)}`;
      await db.createInquiry({
        id: localInqId,
        name: 'Local Inquirer',
        email: localEmail,
        subject: 'Local Inquiry',
        message: 'Local inquiry body'
      });
      jsonNow = getJsonDb();
      assert(jsonNow.inquiries.some(i => i.id === localInqId), 'Local createInquiry must write to db.json');

      // 7. Domain resource in local mode
      const localDomain = `LocalDomain_${localTime}`;
      await db.upsertDomainResources({
        domain: localDomain,
        github_url: 'https://github.com/local/domain',
        report_url: 'https://drive.google.com/local/report',
        ppt_url: 'https://drive.google.com/local/ppt'
      });
      jsonNow = getJsonDb();
      assert(jsonNow.domain_resources.some(r => r.domain.toLowerCase() === localDomain.toLowerCase()), 'Local upsertDomainResources must write to db.json');

      recordPass('Test H: With PostgreSQL NOT configured (pool === null), all operations update data/db.json as expected');
    } catch (err) {
      recordFail('Test H (Local fallback persistence)', err);
    } finally {
      // Restore pool
      db.pool = originalPool;
    }

    // ----------------------------------------------------
    // TEST I: Existing PostgreSQL reads return correct data
    // ----------------------------------------------------
    try {
      const orders = await db.getUserOrders(testEmail);
      assert(orders.length >= 1, 'getUserOrders must return PostgreSQL orders');
      assert.strictEqual(orders[0].email.toLowerCase(), testEmail.toLowerCase());

      const certs = await db.getUserCertificates(testEmail);
      assert(certs.length >= 1, 'getUserCertificates must return PostgreSQL certificates');

      const tasks = await db.getUserTasks(testEmail);
      assert(tasks.length >= 1, 'getUserTasks must return PostgreSQL tasks');

      const subs = await db.getUserSubmissions(testEmail);
      assert(subs.length >= 1, 'getUserSubmissions must return PostgreSQL submissions');

      const notifs = await db.getUserNotifications(testEmail);
      assert(notifs.length >= 1, 'getUserNotifications must return PostgreSQL notifications');

      const inquiries = await db.getAllInquiries();
      assert(inquiries.some(i => i.email.toLowerCase() === testEmail.toLowerCase()), 'getAllInquiries must return inquiry');

      recordPass('Test I: Existing PostgreSQL reads still return authoritative data correctly');
    } catch (err) {
      recordFail('Test I (PostgreSQL reads check)', err);
    }

    // ----------------------------------------------------
    // TEST J: No authentication/security regression
    // ----------------------------------------------------
    try {
      const authEmail = `auth_reg_${timestamp}@example.com`;
      const pwd = 'TestAuthPassword123!';
      const createdUser = await db.createUser({
        name: 'Auth Regression User',
        email: authEmail,
        password: pwd,
        role: 'student'
      });
      assert(createdUser, 'User must be created in PostgreSQL');

      const fetchedUser = await db.getUserByEmail(authEmail);
      assert(fetchedUser, 'User must be fetched by email from PostgreSQL');
      assert.strictEqual(fetchedUser.email.toLowerCase(), authEmail.toLowerCase());

      // Password reset token creation & transaction
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const token = await db.createPasswordResetToken({
        userId: fetchedUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000)
      });
      assert(token, 'Reset token must be stored in PostgreSQL');

      const newPwdHash = db.hashPassword('NewPassword456!');
      const resetResult = await db.resetPasswordWithToken({
        tokenHash,
        userId: fetchedUser.id,
        newHashedPassword: newPwdHash
      });
      assert.strictEqual(resetResult.success, true, 'Atomic reset transaction must succeed');

      // Verify db.json users array was NOT polluted
      const jsonDb = getJsonDb();
      assert(!jsonDb.users.some(u => u.email === authEmail), 'User must NOT be written to data/db.json in production');

      recordPass('Test J: No authentication or password-reset security regression; fail-closed behavior preserved');
    } catch (err) {
      recordFail('Test J (Auth regression check)', err);
    }

  } finally {
    // Clean up test records
    await db.cleanTestRecords();
    // Also clean any local mode test entries from db.json
    const d = getJsonDb();
    d.orders = (d.orders || []).filter(o => !o.email.includes('test') && !o.email.includes('localdev') && !o.email.includes('example.com'));
    d.certificates = (d.certificates || []).filter(c => !c.email.includes('test') && !c.email.includes('localdev') && !c.email.includes('example.com'));
    d.tasks = (d.tasks || []).filter(t => !t.email.includes('test') && !t.email.includes('localdev') && !t.email.includes('example.com'));
    d.submissions = (d.submissions || []).filter(s => !s.email.includes('test') && !s.email.includes('localdev') && !s.email.includes('example.com'));
    d.notifications = (d.notifications || []).filter(n => !n.email.includes('test') && !n.email.includes('localdev') && !n.email.includes('example.com'));
    d.inquiries = (d.inquiries || []).filter(i => !i.email.includes('test') && !i.email.includes('localdev') && !i.email.includes('example.com'));
    d.domain_resources = (d.domain_resources || []).filter(r => !r.domain.includes('DualWrite') && !r.domain.includes('LocalDomain'));
    d.users = (d.users || []).filter(u => !u.email.includes('test') && !u.email.includes('localdev') && !u.email.includes('example.com'));
    fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));
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
