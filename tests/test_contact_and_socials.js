require('dotenv').config();
const assert = require('assert');
const http = require('http');
const { app } = require('../server');

async function runTests() {
  console.log('====================================================');
  console.log('TESTING NAVBAR, CONTACT PAGE, AND SOCIAL LINKS');
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

  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function get(path) {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${path}`, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    });
  }

  try {
    // 1. Check Homepage for Navbar Contact link and Footer Socials
    const homeRes = await get('/');
    assert.strictEqual(homeRes.status, 200, 'Home page should return 200');

    assert(homeRes.body.includes('<a href="/contact">Contact</a>'), 'Navbar must include Contact link on homepage');
    recordPass('Navbar includes Contact link on homepage');

    assert(homeRes.body.includes('https://www.linkedin.com/company/hireebridge'), 'Footer must include LinkedIn link');
    assert(homeRes.body.includes('https://t.me/+u1eccYEzCelmZDBl'), 'Footer must include Telegram link');
    assert(homeRes.body.includes('https://www.instagram.com/hireebridge?stkn=MTU1ZndxY3djZGkxdA=='), 'Footer must include Instagram link');
    recordPass('Footer includes LinkedIn, Telegram, and Instagram links with vector icons');

    // 2. Check /contact page
    const contactRes = await get('/contact');
    assert.strictEqual(contactRes.status, 200, 'Contact page should return 200');

    // Check navbar in contact page
    assert(contactRes.body.includes('<a href="/contact">Contact</a>'), 'Navbar must include Contact link on contact page');
    recordPass('Navbar includes Contact link on /contact page');

    // Check Way 1: Email
    assert(contactRes.body.includes('help@hireebridge.in'), 'Contact page must include email help@hireebridge.in');
    assert(contactRes.body.includes('mailto:help@hireebridge.in'), 'Contact page must include mailto link for help@hireebridge.in');
    recordPass('Contact page provides Way 1 (Email help@hireebridge.in)');

    // Check Way 2: Telegram button & group mention query
    assert(contactRes.body.includes('https://t.me/+u1eccYEzCelmZDBl'), 'Contact page must include Telegram URL');
    assert(contactRes.body.includes('Join Telegram Group'), 'Contact page must have Telegram group join button');
    assert(contactRes.body.includes('mention your query'), 'Contact page must mention posting queries in the group');
    recordPass('Contact page provides Way 2 (Telegram group join button with query instructions)');

    // Check Social follow section on Contact page
    assert(contactRes.body.includes('https://www.linkedin.com/company/hireebridge'), 'Contact page includes LinkedIn follow button');
    assert(contactRes.body.includes('https://www.instagram.com/hireebridge?stkn=MTU1ZndxY3djZGkxdA=='), 'Contact page includes Instagram follow button');
    recordPass('Contact page includes social follow links (LinkedIn, Telegram, Instagram)');

    // Check inquiry form still intact
    assert(contactRes.body.includes('id="contactForm"'), 'Contact page preserves inquiry form id="contactForm"');
    assert(contactRes.body.includes('id="contactResult"'), 'Contact page preserves id="contactResult"');
    recordPass('Contact page preserves online inquiry ticket form');

  } catch (err) {
    recordFail('Contact & socials test', err);
  } finally {
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
  console.error('Fatal error:', err);
  process.exit(1);
});
