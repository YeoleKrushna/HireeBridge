process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const db = require('../db');
const { PROJECT_CATALOGUE, getProjectForDomain } = require('../config/project-catalogue');
const {
  app,
  sessions,
  assignmentForOrder,
  markOrderPaidAndFulfill,
  approveSubmissionAndIssueCertificate
} = require('../server');

async function run() {
  const dbFile = path.join(__dirname, '../data/db.json');
  const snapshot = fs.existsSync(dbFile) ? fs.readFileSync(dbFile) : null;
  fs.writeFileSync(dbFile, JSON.stringify({ orders: [], users: [], tasks: [], submissions: [], certificates: [], notifications: [] }, null, 2));
  db.pool = null;

  const httpServer = http.createServer(app);
  await new Promise(resolve => httpServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  const email = `workflow-${Date.now()}@example.test`;
  const studentSessionId = `wf-student-${Date.now()}`;
  const adminSessionId = `wf-admin-${Date.now()}`;
  sessions.set(studentSessionId, { userId: studentSessionId, email, name: 'Workflow Student', role: 'student', createdAt: Date.now() });
  sessions.set(adminSessionId, { userId: adminSessionId, email: 'workflow-admin@example.test', role: 'admin', createdAt: Date.now() });

  async function request(route, options = {}) {
    const response = await fetch(new URL(route, baseUrl), {
      method: options.method || 'GET',
      headers: { ...(options.cookie ? { Cookie: options.cookie } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    return { status: response.status, body: await response.text() };
  }

  try {
    await db.createUser({ name: 'Workflow Student', email, password: 'local-test-password', role: 'student' });
    assert.strictEqual(PROJECT_CATALOGUE.length, 32, 'The project catalogue should contain the supplied 32 domains.');
    assert.strictEqual(new Set(PROJECT_CATALOGUE.map(project => project.domain.toLowerCase())).size, 32, 'Catalogue domains must be unique.');
    assert.strictEqual(getProjectForDomain('Artificial Intelligence').title, 'Smart Campus AI Assistant');
    assert.strictEqual(getProjectForDomain('Data Science').repo, 'https://github.com/tkarim45/Beginner-Data-Science-Projects');
    const entryTask = assignmentForOrder({ plan: 'certificate', domain: 'Data Science' });
    const referenceTask = assignmentForOrder({ plan: 'project', domain: 'Data Science' });
    const comprehensiveTask = assignmentForOrder({ plan: 'comprehensive', domain: 'Data Science' });
    assert(!entryTask.description.includes('github.com/'), 'Entry plan must not expose a reference repository.');
    assert(entryTask.description.includes('No GitHub/source repository'));
    assert(referenceTask.description.includes(entryTask.project.repo), 'Project plan must include its catalogue repository.');
    assert(comprehensiveTask.description.includes('editable internship report') && comprehensiveTask.description.includes('PPT/presentation'));

    const publicHome = await request('/');
    const publicPricing = await request('/pricing');
    const internships = await request('/internships');
    const howItWorks = await request('/how-it-works');
    const certificatePage = await request('/certificate');
    const blog = await request('/blog');
    const contact = await request('/contact');
    assert(publicHome.body.includes('data-target="1" data-suffix="+"') && publicHome.body.includes('data-target="32"') && publicHome.body.includes('data-target="170" data-suffix="+"'));
    assert(publicHome.body.includes('Payment alone does not issue a certificate'));
    assert(publicPricing.body.includes('Payment gives task access; approval issues the certificate.'));
    assert(publicPricing.body.includes('Curated GitHub reference repository') && publicPricing.body.includes('PPT / Presentation'));
    assert(!publicPricing.body.includes('Instant Delivery'));
    assert(internships.body.includes('FAQ') && internships.body.includes('How is a project matched to my domain?'));
    assert(howItWorks.body.includes('Who reviews a submission?'));
    assert(certificatePage.body.includes('What your certificate contains') && certificatePage.body.includes('When does a certificate become available?'));
    assert(blog.body.includes('Are blog guides a substitute for my assigned task?'));
    assert(contact.body.includes('How do I contact HireeBridge?'));
    const styles = fs.readFileSync(path.join(__dirname, '../public/css/styles.css'), 'utf8');
    assert(styles.includes('grid-template-columns:minmax(220px,250px) minmax(0,1fr)'));
    assert(!/\.admin-sidebar\{[^}]*position:sticky/.test(styles), 'Admin sidebar should not stick over the footer.');

    const orderId = `HB-WORKFLOW-${Date.now()}`;
    const order = await db.createOrder({
      id: orderId, gatewayOrderId: `CF-${orderId}`, name: 'Workflow Student', email,
      domain: 'Data Science', duration: '4 Weeks', plan: 'certificate', amount: 99,
      currency: 'INR', country: 'IN', phone: '9876543210', status: 'created'
    });
    const paid = await markOrderPaidAndFulfill(order, 'test-payment-confirmed', `CF-${orderId}`);
    assert.strictEqual(paid.order.status, 'paid');
    assert.strictEqual((await db.getAllOrders()).find(item => item.id === orderId).offerEmailStatus || 'not_sent', 'not_sent', 'Offer letters are not emailed automatically on payment.');
    const assigned = await db.getTaskByOrderId(orderId);
    assert(assigned, 'A confirmed payment must assign the domain task.');
    assert.strictEqual(assigned.title, 'Student Placement Prediction & Analytics');
    assert.strictEqual(assigned.status, 'assigned');
    assert.strictEqual(await db.getCertificateByOrderId(orderId), null, 'Payment must not create a certificate record.');
    await markOrderPaidAndFulfill({ ...paid.order, status: 'created' }, 'test-payment-confirmed', `CF-${orderId}`);
    assert.strictEqual((await db.getUserTasks(email)).filter(task => task.orderId === orderId).length, 1, 'Repeated payment fulfillment must not duplicate assigned tasks.');

    const pendingDashboard = await request('/dashboard', { cookie: `hb_session=${studentSessionId}` });
    assert.strictEqual(pendingDashboard.status, 200);
    assert(pendingDashboard.body.includes('Assigned Internship Task'));
    assert(pendingDashboard.body.includes('Student Placement Prediction &amp; Analytics'));
    assert(!pendingDashboard.body.includes('Official Internship Completion Certificate') && !pendingDashboard.body.includes('GR-WORKFLOW-TEST'), 'Certificate must be absent before approval.');

    const submitted = await request('/api/student/submit-task', {
      method: 'POST', cookie: `hb_session=${studentSessionId}`,
      body: { github: 'https://github.com/student/placement-project', notes: 'Includes report, tests, and dashboard evidence.' }
    });
    assert.strictEqual(submitted.status, 200, submitted.body);
    const submission = (await db.getUserSubmissions(email))[0];
    assert.strictEqual(submission.status, 'pending', 'Submission should enter reviewer queue.');
    assert.strictEqual(submission.orderId, orderId);
    assert.strictEqual((await db.getTaskByOrderId(orderId)).status, 'under_review');
    assert.strictEqual(await db.getCertificateByOrderId(orderId), null, 'Submission alone must not create a certificate.');

    let generated = 0;
    const issueCertificate = async details => {
      generated++;
      const certificate = {
        credentialId: 'GR-WORKFLOW-TEST', orderId: details.orderId, name: details.name,
        email: details.email, domain: details.domain, duration: details.duration,
        issueDate: details.issueDate, pdf: '/downloads/GR-WORKFLOW-TEST.pdf', jpg: '/downloads/GR-WORKFLOW-TEST.jpg'
      };
      await db.createCertificate(certificate);
      return certificate;
    };
    let approvalEmailAttempts = 0;
    const dependencies = {
      issueAndPersistCertificate: issueCertificate,
      sendCertificateEmail: async certificate => {
        approvalEmailAttempts++;
        assert.strictEqual((await db.getUserNotifications(email)).filter(notification => notification.id === `approval-${submission.id}`).length, 1, 'Notification must exist before certificate email attempt.');
        assert.strictEqual(certificate.credentialId, 'GR-WORKFLOW-TEST');
        return { sent: false, status: 'failed', reason: 'SMTP not configured' };
      }
    };
    const approved = await approveSubmissionAndIssueCertificate(submission.id, dependencies);
    assert(approved.ok && approved.credentialId === 'GR-WORKFLOW-TEST');
    assert.strictEqual(generated, 1);
    assert.strictEqual(approvalEmailAttempts, 1, 'Approval attempts one certificate email after issuing the certificate.');
    assert(await db.getCertificateByOrderId(orderId), 'Explicit reviewer approval must create the certificate.');
    assert.strictEqual((await db.getUserNotifications(email)).filter(notification => notification.id === `approval-${submission.id}`).length, 1);
    assert.deepStrictEqual(await db.getPublicStats(), { students: 1, certificates: 1 }, 'Public counts should reflect newly joined users and issued certificates.');
    assert.strictEqual((await db.getTaskByOrderId(orderId)).status, 'approved');

    const duplicate = await approveSubmissionAndIssueCertificate(submission.id, dependencies);
    assert(duplicate.ok && duplicate.alreadyProcessed, 'Repeated approval must be idempotent.');
    assert.strictEqual(generated, 1, 'Repeated approval must not generate another certificate.');
    assert.strictEqual(approvalEmailAttempts, 1, 'Repeated approval must not auto-send another certificate email.');
    assert.strictEqual((await db.getUserCertificates(email)).length, 1);
    assert.strictEqual((await db.getUserNotifications(email)).filter(notification => notification.id === `approval-${submission.id}`).length, 1);

    const approvedDashboard = await request('/dashboard', { cookie: `hb_session=${studentSessionId}` });
    assert(approvedDashboard.body.includes('GR-WORKFLOW-TEST'));
    assert(approvedDashboard.body.includes('Download PDF'));
    console.log('PASS: catalogue mapping, plan-gated resources, payment access, task submission/review, approval certificate/notification, visibility, and idempotency.');
  } finally {
    sessions.delete(studentSessionId);
    sessions.delete(adminSessionId);
    await new Promise(resolve => httpServer.close(resolve));
    if (snapshot) fs.writeFileSync(dbFile, snapshot);
    else if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  }
}

run().catch(error => {
  console.error('FAIL:', error);
  process.exitCode = 1;
});
