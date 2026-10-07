'use strict';

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.HB_DISABLE_DATABASE = 'true';

const { app } = require('../server.js');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(__dirname, '..', 'docs', 'seo', 'hub-screenshots');
const port = 9345;

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { return await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); }
    catch (_) { await delay(100); }
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function openTarget(url) {
  return (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
}

async function capture(pageUrl, { width, height, mobile, deviceScaleFactor }, filename) {
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

  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile });
  await send('Page.enable');
  await send('Page.navigate', { url: pageUrl });
  await delay(1200);

  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
  socket.close();
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });

  const httpServer = http.createServer(app);
  await new Promise(resolve => httpServer.listen(0, resolve));
  const serverPort = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${serverPort}`;

  const profile = path.join(process.env.TEMP || process.cwd(), `hb-hubs-${process.pid}`);
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await waitForChrome();
    console.log('Connected to headless Chrome via CDP.');

    const pages = [
      { name: 'internships', path: '/internships/' },
      { name: 'virtual', path: '/virtual-internships/' },
      { name: 'project-based', path: '/project-based-internships/' },
      { name: 'certificate', path: '/internship-certificate/' },
      { name: 'projects', path: '/internship-projects/' }
    ];

    for (const p of pages) {
      console.log(`Capturing ${p.path}...`);
      // Desktop: 1440 x 900
      await capture(`${baseUrl}${p.path}`, { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 }, `${p.name}-desktop.png`);
      // Mobile: 390 x 844
      await capture(`${baseUrl}${p.path}`, { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }, `${p.name}-mobile.png`);
    }

    console.log('All 5 topical hub screenshots captured successfully on Desktop and Mobile!');
  } finally {
    chrome.kill();
    httpServer.close();
  }
}

run().catch(err => { console.error('Screenshot capture failed:', err); process.exitCode = 1; });
