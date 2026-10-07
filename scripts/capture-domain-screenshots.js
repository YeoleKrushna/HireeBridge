'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const slugs = process.argv.slice(3);
const outputDir = path.join(__dirname, '..', 'docs', 'seo', 'screenshots');
const port = 9333;

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

async function capture(target, slug, viewport, suffix) {
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
  await send('Emulation.setDeviceMetricsOverride', viewport);
  await send('Page.enable');
  await send('Page.navigate', { url: `${baseUrl}/internships/${slug}/` });
  await delay(1500);
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(outputDir, `${slug}-${suffix}.png`), Buffer.from(result.data, 'base64'));
  socket.close();
}

async function run() {
  if (!slugs.length) throw new Error('Provide at least one domain slug.');
  fs.mkdirSync(outputDir, { recursive: true });
  const profile = path.join(process.env.TEMP || process.cwd(), `hb-capture-${process.pid}`);
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });
  try {
    await waitForChrome();
    for (const slug of slugs) {
      await capture(await openTarget('about:blank'), slug, { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, 'mobile');
      await capture(await openTarget('about:blank'), slug, { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, 'desktop');
      console.log(`Captured ${slug} at 390x844 and 1280x900.`);
    }
  } finally { chrome.kill(); }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
