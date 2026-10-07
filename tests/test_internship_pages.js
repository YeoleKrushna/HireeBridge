'use strict';

process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'test';
process.env.SITE_URL = 'https://configured.example';

const assert = require('assert');
const http = require('http');
const pages = require('../content/internship-pages');
const { parseDomainFacts, resolveFacts } = require('../content/internship-pages/domain-facts');
const { app } = require('../server');
const SITE_URL = process.env.SITE_URL;
const flatten = value => Array.isArray(value) ? value.map(flatten).join(' ') : value && typeof value === 'object' ? Object.values(value).map(flatten).join(' ') : String(value || '');
const shingles = text => { const words = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/); return new Set(words.slice(0, -4).map((_, i) => words.slice(i, i + 5).join(' '))); };
const pilots = pages.filter(page => page.pilot);

async function run() {
  const fixture = parseDomainFacts('## ALL\n\nduration:\n4 weeks\n\nreviewer:\nDefault reviewer\n\n## sample\n\nreviewer:\nDomain reviewer\n\ntools expected:\nTool A');
  assert.deepStrictEqual(resolveFacts(fixture, 'other'), { duration: '4 weeks', reviewer: 'Default reviewer' });
  assert.deepStrictEqual(resolveFacts(fixture, 'sample'), { duration: '4 weeks', reviewer: 'Domain reviewer', toolsExpected: 'Tool A' });
  assert.strictEqual(pages.length, 32);
  for (const page of pages) {
    assert.strictEqual(page.readyToIndex, true, `${page.slug} needs completed owner-approved facts.`);
    assert.deepStrictEqual(page.missingFacts, [], `${page.slug} has unresolved Class A facts.`);
  }
  const banned = /industry[- ]recognized|globally verifiable|internationally recognized|aicte approved|government recognised|guaranteed (job|placement)|paid internship|real-world job experience|170\+ countries/i;
  const filler = /in today['â€™]s fast-paced|unlock your potential|\bdelve\b|game-changer|\bseamless\b|cutting-edge|\bempower\b|\bjourney\b|\belevate\b|\bleverage\s+(?:a|an|the|your|data|tools?|technology|skills?|platform)|dive into/i;
  for (const page of pilots) { assert(page.wordCount >= 800); assert(!banned.test(flatten(page))); assert(!filler.test(flatten(page))); }
  const scores = [];
  for (let i = 0; i < pilots.length; i += 1) for (let j = i + 1; j < pilots.length; j += 1) { const a = shingles(flatten(pilots[i].content)), b = shingles(flatten(pilots[j].content)); const score = [...a].filter(x => b.has(x)).length / new Set([...a, ...b]).size; scores.push(score); assert(score <= .10); }
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, resolve)); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const page of pilots) {
      const response = await fetch(`${base}/internships/${page.slug}/`); const html = await response.text();
      assert.strictEqual(response.status, 200); assert.strictEqual(response.headers.get('x-robots-tag'), null); assert(html.includes('index, follow'));
      const expectedTitle = `${page.name} ${`${page.name} Online Internship with Certificate | HireeBridge`.length <= 60 ? 'Online ' : ''}Internship with Certificate | HireeBridge`.replace(/&/g, '&amp;'); assert(html.includes(`<title>${expectedTitle}</title>`));
      assert(html.includes(page.primaryKeyword)); const h1 = (page.content.h1 || `${page.name} Online Internship Project with Verifiable Certificate`).replace(/&/g, '&amp;'); assert(html.includes(`<h1>${h1}</h1>`));
      assert(html.includes(`${SITE_URL}/og/${page.slug}.png`)); assert(html.includes(`name="twitter:image" content="${SITE_URL}/og/${page.slug}.png"`));
      assert(html.includes(`${SITE_URL}/internships/${page.slug}/`)); assert(!html.includes('localhost') && !html.includes('127.0.0.1') && !html.includes('https://hireebridge.in'));
      assert(!html.includes('fonts.googleapis.com') && !html.includes('cdnjs.cloudflare.com'));
      for (const marker of ['data-stepper', 'data-self-check', 'data-skill-group', 'data-cv-builder', 'data-college-checklist', '<details>']) assert(html.includes(marker));
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1])); const graph = blocks.flatMap(block => block['@graph'] || []); const faq = graph.find(item => item['@type'] === 'FAQPage');
      assert.strictEqual(graph.filter(item => ['Organization', 'EducationalOrganization'].includes(item['@type'])).length, 1); assert.strictEqual(graph.filter(item => item['@type'] === 'WebSite').length, 1); assert(faq); assert.deepStrictEqual(faq.mainEntity.map(item => [item.name, item.acceptedAnswer.text]), page.content.faqs);
      assert.strictEqual(graph.filter(item => item['@type'] === 'WebPage').length, 1);
    }
    assert.strictEqual((await fetch(`${base}/internships/unknown-domain/`)).status, 404);
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text(); for (const page of pages) assert(sitemap.includes(`/internships/${page.slug}/`)); assert(sitemap.includes(`${SITE_URL}/sitemap.xml`) === false);
    const robots = await (await fetch(`${base}/robots.txt`)).text(); assert(!/Disallow:\s*\/internships\/?/i.test(robots)); assert(robots.includes(`${SITE_URL}/sitemap.xml`));
    const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; try { for (const page of pages) { const html = await (await fetch(`${base}/internships/${page.slug}/`)).text(); assert(!html.includes('OWNER_INPUT_REQUIRED')); } } finally { process.env.NODE_ENV = previous; }
    console.log(`PASS: ${pilots.length} domain pages; readyToIndex=true; banned claims=0; AI filler=0; max similarity=${Math.max(...scores).toFixed(4)}.`);
  } finally { await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error('FAIL:', error); process.exitCode = 1; });
