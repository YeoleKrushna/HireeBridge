'use strict';

const assert = require('assert');
const http = require('http');

process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'test';

const { app } = require('../server.js');

async function test() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Check Project-Based Hub for Anatomy & Lifecycle Flow
    const res1 = await fetch(`${baseUrl}/project-based-internships/`);
    const body1 = await res1.text();
    assert.strictEqual(res1.status, 200);
    assert(body1.includes('The Anatomy of a Project-Based Internship'), 'Must contain Anatomy section title');
    assert(body1.includes('lifecycle-flow'), 'Must have lifecycle-flow container');
    assert(body1.includes('lifecycle-card'), 'Must have lifecycle-card elements');
    assert(body1.includes('lifecycle-badge'), 'Must have lifecycle-badge elements');
    assert(body1.includes('lifecycle-deliverable'), 'Must have lifecycle-deliverable elements');
    assert(body1.includes('Stage 1'), 'Must include Stage 1');
    assert(body1.includes('System Design Plan'), 'Must include Stage 1 deliverable');
    assert(body1.includes('Stage 5'), 'Must include Stage 5');
    assert(body1.includes('Verifiable Credential &amp; Registry ID'), 'Must include Stage 5 deliverable');

    // 2. Check Internship Projects Hub for Dock & Active State
    const res2 = await fetch(`${baseUrl}/internship-projects/`);
    const body2 = await res2.text();
    assert.strictEqual(res2.status, 200);
    assert(body2.includes('Internship Projects'), 'Dock must contain Internship Projects pill');
    assert(body2.includes('/internship-projects/'), 'Must link to /internship-projects/');
    assert(body2.includes('hub-dock-pill is-active'), 'Pill must be active on projects page');
    assert(body2.includes('32 Specs'), 'Must include 32 Specs badge');

    // 3. Check CSS contains all required rules
    const cssRes = await fetch(`${baseUrl}/css/topical-hubs.css`);
    const cssBody = await cssRes.text();
    assert(cssBody.includes('.lifecycle-flow'), 'topical-hubs.css must define .lifecycle-flow');
    assert(cssBody.includes('.lifecycle-card'), 'topical-hubs.css must define .lifecycle-card');
    assert(cssBody.includes('.lifecycle-badge'), 'topical-hubs.css must define .lifecycle-badge');
    assert(cssBody.includes('.lifecycle-deliverable'), 'topical-hubs.css must define .lifecycle-deliverable');
    assert(cssBody.includes('.section-head.text-center'), 'topical-hubs.css must define .section-head.text-center');

    console.log('✓ All UI alignment, lifecycle CSS, and dock visibility tests passed successfully!');
  } finally {
    server.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
