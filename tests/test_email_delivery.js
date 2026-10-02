process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const nodemailer = require('nodemailer');
const db = require('../db');
const {
  app, sessions, sendCertificateEmail, sendOfferLetterEmail,
  sendMail, approveSubmissionAndIssueCertificate, markOrderPaidAndFulfill
} = require('../server');

async function run() {
  const dbFile = path.join(__dirname, '../data/db.json');
  const snapshot = fs.existsSync(dbFile) ? fs.readFileSync(dbFile) : null;
  fs.writeFileSync(dbFile, JSON.stringify({ orders: [], users: [], tasks: [], submissions: [], certificates: [], notifications: [], mail_daily_usage: [] }, null, 2));
  db.pool = null;
  const originalCreateTransport = nodemailer.createTransport;
  const deliveredMessages = [];
  let simulateMailFailure = false;
  const httpServer = http.createServer(app);
  await new Promise(resolve => httpServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  const adminSessionId = `mail-admin-${Date.now()}`;
  const studentSessionId = `mail-student-${Date.now()}`;
  sessions.set(adminSessionId, { userId: adminSessionId, email: 'mail-admin@example.test', name: 'Mail Admin', role: 'admin', createdAt: Date.now() });
  sessions.set(studentSessionId, { userId: studentSessionId, email: 'mail-student@example.test', name: 'Mail Student', role: 'student', createdAt: Date.now() });

  async function request(route, options = {}) {
    const response = await fetch(new URL(route, baseUrl), {
      method: options.method || 'GET',
      headers: { ...(options.cookie ? { Cookie: options.cookie } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const rawBody = await response.text();
    let body = rawBody;
    try { body = JSON.parse(rawBody); } catch {}
    return { status: response.status, body };
  }

  try {
    const orderId = `HB-MAIL-${Date.now()}`;
    const order = await db.createOrder({
      id: orderId, gatewayOrderId: `CF-${orderId}`, name: 'Mail Student', email: 'mail-student@example.test',
      domain: 'Data Science', duration: '4 Weeks', plan: 'project', amount: 199, status: 'created'
    });
    const paid = await markOrderPaidAndFulfill(order, 'test-payment', `CF-${orderId}`);
    assert.strictEqual(paid.order.status, 'paid');
    assert.strictEqual(await db.getCertificateByOrderId(orderId), null, 'Payment still must not create a certificate.');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).offerEmailStatus || 'not_sent', 'not_sent', 'Payment must not email an offer letter.');
    assert.strictEqual((JSON.parse(fs.readFileSync(dbFile, 'utf8')).mail_daily_usage || []).length, 0, 'Payment must not consume an email quota slot.');

    const certificate = {
      credentialId: 'GR-MAIL-TEST', orderId, name: 'Mail Student', email: 'mail-student@example.test',
      domain: 'Data Science', duration: '4 Weeks', issueDate: '2 Oct 2026',
      pdf: '/downloads/GR-MAIL-TEST.pdf', jpg: '/downloads/GR-MAIL-TEST.jpg'
    };
    await db.createCertificate(certificate);
    const sentMessage = {};
    const sent = await sendCertificateEmail(certificate, async (...args) => { Object.assign(sentMessage, { args }); return { sent: true }; });
    assert.strictEqual(sent.status, 'sent');
    assert(sentMessage.args[2].includes('GR-MAIL-TEST.pdf') && sentMessage.args[2].includes('GR-MAIL-TEST.jpg'));
    assert(sentMessage.args[2].includes('greyrocks.in/verification/GR-MAIL-TEST'));
    assert(sentMessage.args[3].includes('Download PDF') && sentMessage.args[3].includes('Download JPG'));
    assert.strictEqual((await db.getCertificateById('GR-MAIL-TEST')).emailStatus, 'sent', 'Sent mail state persists on the certificate.');

    const failed = await sendCertificateEmail(certificate, async () => ({ sent: false, status: 'failed', reason: 'SMTP delivery failed' }));
    assert.strictEqual(failed.status, 'failed');
    assert(await db.getCertificateById('GR-MAIL-TEST'), 'Mail failure must not remove the certificate.');
    const limited = await sendCertificateEmail(certificate, async () => ({ sent: false, status: 'limit_reached', reason: 'Daily email limit reached' }));
    assert.strictEqual(limited.status, 'limit_reached');
    assert.strictEqual((await db.getCertificateById('GR-MAIL-TEST')).emailStatus, 'limit_reached');

    let approvalState = { status: 'pending' };
    let notifications = 0;
    let mailAttempts = 0;
    const approvalDependencies = {
      getAllSubmissions: async () => [{ id: 'mail-submission', email: certificate.email, name: certificate.name, order_id: orderId, task_id: 'mail-task', status: approvalState.status }],
      getUserOrders: async () => [{ ...paid.order, status: 'paid' }],
      evaluateSubmission: async (_id, status) => { if (approvalState.status === 'approved') return false; approvalState.status = status; return true; },
      getCertificateByOrderId: async () => certificate,
      issueAndPersistCertificate: async () => certificate,
      claimCertificateCredential: async () => certificate.credentialId,
      createNotification: async () => { notifications++; },
      updateTaskStatus: async () => true,
      sendCertificateEmail: async cert => {
        assert.strictEqual(notifications, 1, 'Dashboard notification is written before the email attempt.');
        mailAttempts++;
        return sendCertificateEmail(cert, async () => ({ sent: false, status: 'limit_reached', reason: 'Daily email limit reached' }));
      }
    };
    const approval = await approveSubmissionAndIssueCertificate('mail-submission', approvalDependencies);
    assert(approval.ok && approval.credentialId === certificate.credentialId);
    assert.strictEqual(approval.emailStatus, 'limit_reached');
    assert.strictEqual(notifications, 1);
    assert.strictEqual(mailAttempts, 1);
    const repeated = await approveSubmissionAndIssueCertificate('mail-submission', approvalDependencies);
    assert(repeated.alreadyProcessed);
    assert.strictEqual(mailAttempts, 1, 'Repeated approval must not generate repeated automatic mail.');

    const failingApprovalDeps = {
      ...approvalDependencies,
      getAllSubmissions: async () => [{ id: 'failing-mail-submission', email: certificate.email, name: certificate.name, order_id: orderId, task_id: 'mail-task-2', status: 'pending' }],
      evaluateSubmission: async () => true,
      createNotification: async () => { notifications++; },
      sendCertificateEmail: async () => { throw new Error('simulated mail failure'); }
    };
    const mailFailureApproval = await approveSubmissionAndIssueCertificate('failing-mail-submission', failingApprovalDeps);
    assert(mailFailureApproval.ok, 'Email failure must not fail task approval or certificate availability.');
    assert.strictEqual(notifications, 2);

    const adminCookie = `hb_session=${adminSessionId}`;
    const studentCookie = `hb_session=${studentSessionId}`;
    assert.strictEqual((await request('/api/admin/certificates/send-email', { method: 'POST', cookie: studentCookie, body: { credentialId: 'GR-MAIL-TEST' } })).status, 403);
    assert.strictEqual((await request('/api/admin/offer-letter-emails', { cookie: studentCookie })).status, 403);
    assert.strictEqual((await request(`/api/admin/offer-letter-emails/${orderId}/send`, { method: 'POST', cookie: studentCookie })).status, 403);
    const offers = await request('/api/admin/offer-letter-emails', { cookie: adminCookie });
    assert.strictEqual(offers.status, 200);
    assert(offers.body.offers.some(item => item.id === orderId && item.available));
    const adminPage = await request('/admin', { cookie: adminCookie });
    assert.strictEqual(adminPage.status, 200);
    assert(adminPage.body.includes('Daily Limit Reached') && adminPage.body.includes('Send Certificate Email'));
    assert(adminPage.body.includes('Offer Letter Emails') && adminPage.body.includes('Send Offer Letter'));

    await db.createSubmission({ id: 'mail-approved-sub', name: 'Mail Student', email: certificate.email, orderId, taskId: 'mail-task', github: 'https://github.com/student/mail-task', status: 'approved' });

    nodemailer.createTransport = () => ({ sendMail: async message => {
      if (simulateMailFailure) throw Object.assign(new Error('simulated SMTP error'), { code: 'ECONNECTION' });
      deliveredMessages.push(message);
      return { messageId: 'local-mail-test' };
    } });
    process.env.SMTP_HOST = 'smtp.local.test';
    process.env.SMTP_USER = 'mail-test@example.test';
    process.env.EMAIL_DAILY_LIMIT = '10';
    const manualCertSend = await request('/api/admin/certificates/send-email', { method: 'POST', cookie: adminCookie, body: { credentialId: 'GR-MAIL-TEST', email: 'attacker@example.test' } });
    assert.strictEqual(manualCertSend.status, 200);
    assert.strictEqual(manualCertSend.body.status, 'sent');
    assert.strictEqual((await db.getCertificateById('GR-MAIL-TEST')).emailStatus, 'sent');
    assert.strictEqual((await db.getCertificateById('GR-MAIL-TEST')).email, 'mail-student@example.test', 'Admin uses the registered certificate email, not a request override.');
    assert.strictEqual(deliveredMessages[0].to, 'mail-student@example.test');
    assert(deliveredMessages[0].text.includes('GR-MAIL-TEST.pdf') && deliveredMessages[0].text.includes('GR-MAIL-TEST.jpg'));
    assert(deliveredMessages[0].html.includes('greyrocks.in/verification/GR-MAIL-TEST'));
    const sentAdminPage = await request('/admin', { cookie: adminCookie });
    assert(sentAdminPage.body.includes('Resend Certificate Email'));
    const offerSend = await request(`/api/admin/offer-letter-emails/${orderId}/send`, { method: 'POST', cookie: adminCookie });
    assert.strictEqual(offerSend.status, 200);
    assert.strictEqual(offerSend.body.status, 'sent');
    assert(deliveredMessages[1].text.includes('/dashboard') && deliveredMessages[1].text.includes('Official Offer Letter'));
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).status, 'paid', 'Offer email failure does not modify enrollment.');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).offerEmailStatus, 'sent');

    const certResend = await request('/api/admin/certificates/send-email', { method: 'POST', cookie: adminCookie, body: { credentialId: 'GR-MAIL-TEST' } });
    assert.strictEqual(certResend.body.status, 'sent', 'An explicit resend is supported after success.');
    assert.strictEqual(deliveredMessages.length, 3);
    const sentOfferAdminPage = await request('/admin', { cookie: adminCookie });
    assert(sentOfferAdminPage.body.includes('Resend Offer Letter'));

    simulateMailFailure = true;
    const offerMailFailure = await request(`/api/admin/offer-letter-emails/${orderId}/send`, { method: 'POST', cookie: adminCookie });
    assert.strictEqual(offerMailFailure.body.status, 'failed');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).offerEmailStatus, 'failed');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).status, 'paid', 'Offer email failure does not modify enrollment.');
    simulateMailFailure = false;

    const dateKey = new Date().toISOString().slice(0, 10);
    process.env.EMAIL_DAILY_LIMIT = '3';
    const limitedSender = await sendMail('mail-student@example.test', 'limit test', 'limit test');
    assert.strictEqual(limitedSender.status, 'limit_reached', 'The standard mail sender uses the shared daily cap.');
    const nextDateKey = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    assert.strictEqual(await db.reserveDailyMailSlot(1, nextDateKey), true);
    assert.strictEqual(await db.reserveDailyMailSlot(1, nextDateKey), false, 'The shared daily cap blocks sends after the configured count.');
    assert.strictEqual(await db.releaseDailyMailSlot(nextDateKey), true);
    assert.strictEqual(await db.reserveDailyMailSlot(1, nextDateKey), true, 'Failed sends release their reserved quota slot.');

    const deliveredOffer = await sendOfferLetterEmail(paid.order, async (to, subject, text, html) => {
      assert.strictEqual(to, 'mail-student@example.test');
      assert(subject.includes('offer letter'));
      assert(text.includes('/dashboard') && text.includes('Official Offer Letter'));
      assert(html.includes('HireeBridge') && html.includes('GreyRocks'));
      return { sent: true };
    });
    assert.strictEqual(deliveredOffer.status, 'sent');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).offerEmailStatus, 'sent');
    const limitedOffer = await sendOfferLetterEmail(paid.order, async () => ({ sent: false, status: 'limit_reached', reason: 'Daily email limit reached' }));
    assert.strictEqual(limitedOffer.status, 'limit_reached');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).offerEmailStatus, 'limit_reached');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).status, 'paid');

    console.log('PASS: email delivery templates, certificate approval isolation/idempotency, persistent mail status, shared daily quota, Admin authorization/actions, and manual offer-letter email.');
  } finally {
    sessions.delete(adminSessionId);
    sessions.delete(studentSessionId);
    await new Promise(resolve => httpServer.close(resolve));
    nodemailer.createTransport = originalCreateTransport;
    if (snapshot) fs.writeFileSync(dbFile, snapshot);
    else if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  }
}

run().catch(error => { console.error('FAIL:', error); process.exitCode = 1; });
