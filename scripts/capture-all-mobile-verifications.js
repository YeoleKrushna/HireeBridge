'use strict';

process.env.HB_DISABLE_DATABASE = 'true';
process.env.NODE_ENV = 'test';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { app } = require('../server');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(__dirname, '..', 'docs', 'seo', 'screenshots');
const cdpPort = 9338;

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { return await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json(); }
    catch (_) { await delay(100); }
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function openTarget(url) {
  return (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
}

async function capturePage(baseUrl, routePath, selector, filename) {
  const target = await openTarget('about:blank');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      return message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.enable');
  await send('Page.navigate', { url: `${baseUrl}${routePath}` });
  await delay(1800);

  if (selector) {
    await send('Runtime.evaluate', {
      expression: `
        const el = document.querySelector('${selector}');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
          window.scrollBy(0, -20);
        }
      `
    });
    await delay(600);
  }

  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
  socket.close();
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const profile = path.join(process.env.TEMP || process.cwd(), `hb-verify-${Date.now()}`);
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    `--remote-debugging-port=${cdpPort}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await waitForChrome();
    console.log('Connected to headless Chrome. Capturing mobile screenshots...');

    // 1. Homepage Hero (centered, calibrated typography)
    await capturePage(baseUrl, '/', '.hero', 'verify-home-hero.png');

    // 2. Footer Logo (high contrast light logo against dark navy background - Image 1 fix)
    await capturePage(baseUrl, '/', 'footer', 'verify-footer-logo.png');

    // 3. Internships Catalog Grid (compact, ergonomic mobile boxes - Image 2 fix)
    await capturePage(baseUrl, '/internships', '.domain-grid', 'verify-internships-catalog.png');

    // 4. Interactive 404 Error Page (interactive search, chips, route diagnostics terminal)
    await capturePage(baseUrl, '/non-existent-route-for-testing', null, 'verify-error-404.png');

    // 5. Deep Learning Domain page with sticky footer ("Deep Learning internship")
    await capturePage(baseUrl, '/internships/deep-learning/', null, 'verify-dl-sticky-footer.png');

    // 6. Deep Learning Mistakes section (01/02 alignment)
    await capturePage(baseUrl, '/internships/deep-learning/', '.domain-mistakes', 'verify-dl-mistakes.png');

    console.log('All mobile verification screenshots captured successfully!');
  } finally {
    chrome.kill();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
