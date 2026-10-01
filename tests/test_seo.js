const { app } = require('../server.js');
const http = require('http');

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = 'http://localhost:' + port;

  async function get(path) {
    return new Promise((resolve, reject) => {
      http.get(base + path, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }).on('error', reject);
    });
  }

  try {
    console.log('Testing SEO implementation...');
    const homeRes = await get('/');
    console.log('Homepage status:', homeRes.status);
    console.log('Has canonical https://hireebridge.in/:', homeRes.body.includes('<link rel="canonical" href="https://hireebridge.in/">'));
    console.log('Has robots index, follow:', homeRes.body.includes('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'));
    console.log('Has OpenGraph tags:', homeRes.body.includes('<meta property="og:site_name" content="HireeBridge">'));
    console.log('Has Twitter card:', homeRes.body.includes('<meta name="twitter:card" content="summary_large_image">'));
    console.log('Has Schema.org JSON-LD:', homeRes.body.includes('"@type": "EducationalOrganization"'));

    const loginRes = await get('/login');
    console.log('Login robots noindex:', loginRes.body.includes('<meta name="robots" content="noindex, nofollow">'));

    const sitemapRes = await get('/sitemap.xml');
    console.log('Sitemap status:', sitemapRes.status, 'XML header:', sitemapRes.headers['content-type']);
    console.log('Sitemap contains https://hireebridge.in/:', sitemapRes.body.includes('<loc>https://hireebridge.in/</loc>'));
    console.log('Sitemap contains /pricing:', sitemapRes.body.includes('<loc>https://hireebridge.in/pricing</loc>'));
    console.log('Sitemap contains lastmod:', sitemapRes.body.includes('<lastmod>'));

    const robotsRes = await get('/robots.txt');
    console.log('Robots status:', robotsRes.status, 'Text header:', robotsRes.headers['content-type']);
    console.log('Robots disallow admin:', robotsRes.body.includes('Disallow: /admin'));
    console.log('Robots sitemap line:', robotsRes.body.includes('Sitemap: https://hireebridge.in/sitemap.xml'));

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    server.close();
    process.exit(1);
  }
});
