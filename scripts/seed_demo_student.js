// Creates a local-only demo enrollment. This script deliberately disables PostgreSQL
// before loading db.js so it can never write the demo account into Neon.
process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'development';

const db = require('../db');

const DEMO_EMAIL = 'demo.student@hireebridge.test';
const DEMO_PASSWORD = 'DemoStudent2026!';
const DEMO_ORDER_ID = 'HB-DEMO-STUDENT-001';

async function seedDemoStudent() {
  await db.init();
  await db.createUser({
    id: 'demo-student-local-001',
    name: 'Demo Student',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    role: 'student'
  });

  const existingOrders = await db.getUserOrders(DEMO_EMAIL);
  if (!(existingOrders || []).some(order => order.id === DEMO_ORDER_ID)) {
    await db.createOrder({
      id: DEMO_ORDER_ID,
      name: 'Demo Student',
      email: DEMO_EMAIL,
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'project',
      amount: 2,
      status: 'paid',
      currency: 'INR',
      country: 'IN',
      demo: true,
      createdAt: new Date().toISOString()
    });
  }

  console.log('Local demo student is ready.');
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log('Use only with HB_DISABLE_DATABASE=true and NODE_ENV=development.');
}

seedDemoStudent().catch(error => {
  console.error('Could not seed local demo student:', error.message);
  process.exitCode = 1;
});
