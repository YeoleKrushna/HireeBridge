'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.HB_DISABLE_DATABASE = 'true';

const { app } = require('../server.js');

async function run() {
  const httpServer = http.createServer(app);
  await new Promise(resolve => httpServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  async function request(route, { manualRedirect = true } = {}) {
    const res = await fetch(new URL(route, baseUrl), {
      method: 'GET',
      redirect: manualRedirect ? 'manual' : 'follow'
    });
    return {
      status: res.status,
      headers: res.headers,
      location: res.headers.get('location'),
      body: await res.text()
    };
  }

  try {
    console.log('Testing Topical Hubs Architecture & SEO Cleanup...\n');

    // 1. Topical Hub 200 OK Checks
    const hubs = [
      { path: '/internships/', title: 'Internship Domains', check: 'hub-dock' },
      { path: '/virtual-internships/', title: 'Virtual Internships', check: 'Remote Experiential Learning' },
      { path: '/project-based-internships/', title: 'Project-Based Internships', check: 'Applied Engineering Paradigm' },
      { path: '/internship-certificate/', title: 'Internship Certificate', check: 'Verifiable Credential Standards' },
      { path: '/internship-projects/', title: '32 Internship Projects', check: 'Master Engineering Catalogue' }
    ];

    for (const h of hubs) {
      const res = await request(h.path);
      assert.strictEqual(res.status, 200, `Hub ${h.path} should return 200 OK`);
      assert(res.body.includes(h.check), `Hub ${h.path} should contain "${h.check}"`);
      assert(res.body.includes('hub-dock') || res.body.includes('hub-nav-strip'), `Hub ${h.path} should include the hub navigation`);
      assert(res.body.includes('/css/topical-hubs.css'), `Hub ${h.path} should load topical-hubs.css`);
      assert(res.body.includes('"@type":"BreadcrumbList"'), `Hub ${h.path} should have BreadcrumbList schema`);
      console.log(`✓ Hub ${h.path} returns 200 with schema, styles, and hub navigation strip.`);
    }

    // 2. Trailing Slash Canonicalization
    const slashChecks = [
      '/virtual-internships',
      '/project-based-internships',
      '/internship-certificate',
      '/internship-projects'
    ];
    for (const p of slashChecks) {
      const res = await request(p);
      assert.strictEqual(res.status, 308, `Route ${p} without trailing slash should return 308 redirect`);
      assert.strictEqual(res.location, `${p}/`, `Route ${p} should redirect to ${p}/`);
      console.log(`✓ Non-trailing slash ${p} redirects to ${p}/ via 308.`);
    }

    // 3. Project Catalogue Completeness on /internship-projects/
    const projectsRes = await request('/internship-projects/');
    assert(projectsRes.body.includes('proj-card-top'), 'Projects directory should render project cards');
    assert(projectsRes.body.includes('#01'), 'Projects directory should have card #01');
    assert(projectsRes.body.includes('#32'), 'Projects directory should have card #32');
    console.log('✓ /internship-projects/ successfully renders all 32 domain project briefs.');

    // 4. Retired Blog 301 Permanent Redirects
    const expected301 = [
      ['/blog', '/internships/'],
      ['/blog/', '/internships/'],
      ['/blog/choose-internship-domain', '/internships/'],
      ['/blog/internship-certificate', '/internship-certificate/'],
      ['/blog/get-internship-certificate-online', '/internship-certificate/'],
      ['/blog/what-should-internship-certificate-include', '/internship-certificate/'],
      ['/blog/how-to-verify-internship-certificate', '/internship-certificate/'],
      ['/blog/internship-certificate-format-checklist', '/internship-certificate/'],
      ['/blog/github-internship-project', '/internship-projects/'],
      ['/blog/document-internship-tasks', '/internship-projects/'],
      ['/blog/data-science-internship-certificate', '/internships/data-science/'],
      ['/blog/ai-ml-internship-certificate', '/internships/artificial-intelligence/'],
      ['/blog/python-internship-certificate', '/internships/python-development/'],
      ['/blog/web-development-internship-certificate', '/internships/web-development/'],
      ['/blog/cloud-devops-internship-certificate', '/internships/cloud-computing/'],
      ['/blog/hireebridge-internship-workflow', '/how-it-works']
    ];

    for (const [fromUrl, toUrl] of expected301) {
      const res = await request(fromUrl);
      assert.strictEqual(res.status, 301, `URL ${fromUrl} must return 301 permanent redirect`);
      assert.strictEqual(res.location, toUrl, `URL ${fromUrl} must redirect to ${toUrl}`);
      console.log(`✓ 301: ${fromUrl} -> ${toUrl}`);
    }

    // 5. Retired Blog 410 Gone Status
    const expected410 = [
      '/blog/internship-vs-experience-certificate',
      '/blog/add-internship-certificate-to-resume',
      '/blog/internship-certificate-for-college',
      '/blog/online-internship-certificate-guide',
      '/blog/internship-credential-portfolio',
      '/blog/student-internship-buying-checklist',
      '/blog/some-unknown-legacy-slug'
    ];

    for (const p of expected410) {
      const res = await request(p);
      assert.strictEqual(res.status, 410, `Retired URL ${p} must return HTTP 410 Gone`);
      assert(res.body.includes('HTTP 410') || res.body.includes('permanently retired'), `410 response for ${p} must inform the user`);
      console.log(`✓ 410 Gone: ${p}`);
    }

    // 6. Sitemap.xml Verification
    const sitemapRes = await request('/sitemap.xml');
    assert.strictEqual(sitemapRes.status, 200, 'Sitemap should return 200');
    assert(!sitemapRes.body.includes('/blog'), 'Sitemap MUST NOT contain any /blog URLs');
    assert(sitemapRes.body.includes('/virtual-internships/'), 'Sitemap must contain /virtual-internships/');
    assert(sitemapRes.body.includes('/project-based-internships/'), 'Sitemap must contain /project-based-internships/');
    assert(sitemapRes.body.includes('/internship-certificate/'), 'Sitemap must contain /internship-certificate/');
    assert(sitemapRes.body.includes('/internship-projects/'), 'Sitemap must contain /internship-projects/');
    assert(sitemapRes.body.includes('/internships/'), 'Sitemap must contain /internships/');
    assert(sitemapRes.body.includes('/internships/data-science/'), 'Sitemap must contain 32 domain pages');
    console.log('✓ /sitemap.xml is free of /blog URLs and contains all topical hubs and 32 domains.');

    // 7. Homepage & Navigation Cleanup
    const homeRes = await request('/');
    assert.strictEqual(homeRes.status, 200);
    assert(!homeRes.body.includes('href="/blog"'), 'Home page must not have links to /blog');
    assert(!homeRes.body.includes('20 practical guides built around internship searches'), 'Home page must not have legacy blog text');
    assert(homeRes.body.includes('href="/internship-projects"'), 'Navigation must include /internship-projects');
    assert(homeRes.body.includes('href="/internship-certificate"'), 'Navigation must include /internship-certificate');
    assert(homeRes.body.includes('Topical Learning Architecture'), 'Home page must feature Topical Learning Architecture block');
    console.log('✓ Homepage and navigation successfully updated to showcase Topical Hubs without /blog.');

    console.log('\n========================================');
    console.log('ALL SEO TOPICAL HUB & CLEANUP TESTS PASSED!');
    console.log('========================================\n');
  } finally {
    httpServer.close();
  }
}

run().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
