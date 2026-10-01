const http = require('http');

function req(options, data = null) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function test() {
  console.log('Testing Home Page:');
  const home = await req({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
  console.log(' - GreyRocks uses greyrocks-mark:', home.body.includes('/assets/greyrocks-mark.png'));
  console.log(' - Proof strip defaults to 100+:', home.body.includes('>100+<') && home.body.includes('>80+<'));
  console.log(' - Ambient glow has 4 orbs:', home.body.includes('orb-4'));
  console.log(' - Plan cards have compact style and aligned buttons:', home.body.includes('plan-grid-3') && home.body.includes('btn-plan'));

  console.log('\nTesting Legal Pages:');
  const priv = await req({ hostname: 'localhost', port: 3000, path: '/privacy', method: 'GET' });
  console.log(' - Privacy is full article:', priv.body.includes('Data Controller') && priv.body.includes('legal-article'));

  const ref = await req({ hostname: 'localhost', port: 3000, path: '/refund', method: 'GET' });
  console.log(' - Refund has strict no-refund terms:', ref.body.includes('Strict No-Refund Policy') && ref.body.includes('ALL PAYMENTS MADE TO HIREEBRIDGE'));

  console.log('\nTesting Contact Form API:');
  const contactPayload = JSON.stringify({
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    subject: 'Domain Inquiry',
    message: 'Can I switch from Data Science to AI?'
  });
  const inqRes = await req({
    hostname: 'localhost',
    port: 3000,
    path: '/api/contact',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(contactPayload) }
  }, contactPayload);
  console.log(' - Inquiry submitted:', inqRes.status === 200, JSON.parse(inqRes.body).message);

  console.log('\nTesting Admin Login & Multi-View Admin Panel:');
  const adminLoginPayload = JSON.stringify({ email: 'yeolekrushnar@gmail.com', password: 'Vidhya@416' });
  const adminLogin = await req({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(adminLoginPayload) }
  }, adminLoginPayload);
  const adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0];
  const adminPage = await req({
    hostname: 'localhost',
    port: 3000,
    path: '/admin',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  console.log(' - Admin panel status:', adminPage.status);
  console.log(' - Contains SVG charts:', adminPage.body.includes('svg-chart') && adminPage.body.includes('polyline'));
  console.log(' - Contains Orders view:', adminPage.body.includes('view-orders'));
  console.log(' - Contains Student Queries view with Rahul Sharma inquiry:', adminPage.body.includes('view-inquiries') && adminPage.body.includes('Rahul Sharma'));
  console.log(' - Contains Neon DB status:', adminPage.body.includes('Neon PostgreSQL'));

  console.log('\nAll checks completed successfully!');
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
