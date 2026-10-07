'use strict';
const { app } = require('../server.js');
const http = require('http');

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = 'http://localhost:' + port;

  async function get(path) {
    return new Promise((resolve) => {
      http.get(base + path, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
      }).on('error', err => resolve({ status: 500, error: err.message, body: '' }));
    });
  }

  const coreUrls = [
    '/',
    '/internships/',
    '/pricing',
    '/how-it-works',
    '/certificate',
    '/verification',
    '/about',
    '/contact',
    '/blog'
  ];

  const blogSlugs = [
    'internship-certificate',
    'get-internship-certificate-online',
    'internship-vs-experience-certificate',
    'what-should-internship-certificate-include',
    'add-internship-certificate-to-resume',
    'how-to-verify-internship-certificate',
    'internship-certificate-for-college',
    'online-internship-certificate-guide',
    'choose-internship-domain',
    'data-science-internship-certificate',
    'ai-ml-internship-certificate',
    'python-internship-certificate',
    'web-development-internship-certificate',
    'cloud-devops-internship-certificate',
    'github-internship-project',
    'document-internship-tasks',
    'internship-certificate-format-checklist',
    'internship-credential-portfolio',
    'student-internship-buying-checklist',
    'hireebridge-internship-workflow'
  ];

  const results = [];

  for (const u of coreUrls) {
    const res = await get(u);
    const title = (res.body.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
    const h1 = (res.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
    const textOnly = res.body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                             .replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ').trim();
    const words = textOnly ? textOnly.split(' ').length : 0;
    const internalLinks = (res.body.match(/href="\/[^"]*"/g) || []).length;
    results.push({ url: u, type: 'Core Page', status: res.status, title, h1, words, internalLinks });
  }

  for (const slug of blogSlugs) {
    const u = '/blog/' + slug;
    const res = await get(u);
    const title = (res.body.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
    const h1 = (res.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
    const textOnly = res.body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                             .replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ').trim();
    const words = textOnly ? textOnly.split(' ').length : 0;
    const internalLinks = (res.body.match(/href="\/[^"]*"/g) || []).length;
    results.push({ url: u, type: 'Blog Post', status: res.status, title, h1, words, internalLinks });
  }

  console.log(JSON.stringify(results, null, 2));

  server.close();
  process.exit(0);
});
