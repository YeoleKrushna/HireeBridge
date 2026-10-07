'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';
const outputDir = path.join(__dirname, '..', 'docs', 'seo', 'screenshots');
const port = 9335;

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

async function captureElement(slug, selector, filename) {
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
  await send('Page.navigate', { url: `${baseUrl}/internships/${slug}/` });
  await delay(1500);

  if (selector) {
    await send('Runtime.evaluate', {
      expression: `
        const el = document.querySelector('${selector}');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
          window.scrollBy(0, -60);
        }
      `
    });
    await delay(800);
  }

  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
  socket.close();
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const profile = path.join(process.env.TEMP || process.cwd(), `hb-verify-${process.pid}`);
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await waitForChrome();
    // 1. Capture Hero of Ethical Hacking
    await captureElement('ethical-hacking', null, 'verify-mobile-hero.png');
    // 2. Capture Mistakes section (image 1 from user)
    await captureElement('ethical-hacking', '.domain-mistakes', 'verify-mobile-mistakes.png');
    // 3. Capture College checklist (image 2 from user)
    await captureElement('ethical-hacking', '.domain-college', 'verify-mobile-college.png');
    // 5. Capture Diagram
    await captureElement('ethical-hacking', '.domain-hero__diagram', 'verify-mobile-diagram.png');
    console.log('Mobile verification screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
