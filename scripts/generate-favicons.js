'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cdpPort = 9349;
const brandDir = path.join(__dirname, '..', 'public', 'brand');

// Pristine, ultra-clean SVG favicon with luminous cyan and emerald-teal pillars and connecting arch
const cleanFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Luminous Cyan Gradient -->
    <linearGradient id="hbCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>

    <!-- Vibrant Mint-Teal Gradient -->
    <linearGradient id="hbTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>

    <!-- Connecting Arch Bridge Gradient -->
    <linearGradient id="hbBridge" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
  </defs>

  <!-- Left Pillar of H in luminous cyan -->
  <rect x="76" y="76" width="104" height="360" rx="20" fill="url(#hbCyan)" />

  <!-- Right Pillar of H in vibrant mint-teal -->
  <rect x="332" y="76" width="104" height="360" rx="20" fill="url(#hbTeal)" />

  <!-- Connecting Arch Bridge in radiant cyan-teal -->
  <path d="M 180 220 C 215 270, 297 270, 332 220 L 332 295 C 297 345, 215 345, 180 295 Z" fill="url(#hbBridge)" />
</svg>`;

// Write favicon.svg
fs.writeFileSync(path.join(brandDir, 'favicon.svg'), cleanFaviconSvg);
console.log('Saved clean transparent favicon.svg');

// Apple Touch Icon with deep navy squircle background (Apple iOS standard)
const appleIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="aiCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>
    <linearGradient id="aiTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="aiBridge" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#0B1F36" />
  <g transform="translate(38, 38) scale(0.85)">
    <rect x="76" y="76" width="104" height="360" rx="20" fill="url(#aiCyan)" />
    <rect x="332" y="76" width="104" height="360" rx="20" fill="url(#aiTeal)" />
    <path d="M 180 220 C 215 270, 297 270, 332 220 L 332 295 C 297 345, 215 345, 180 295 Z" fill="url(#aiBridge)" />
  </g>
</svg>`;

async function renderPngs() {
  const tmpHtml = path.join(brandDir, '_tmp_render_icons.html');
  fs.writeFileSync(tmpHtml, `<!doctype html>
<html>
<head><meta charset="utf-8">
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    overflow: hidden !important;
    background: transparent !important;
  }
  ::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  #container {
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  svg {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`);

  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=' + cdpPort, 'about:blank'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const target = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const send = (m, p = {}) => new Promise((resolve, reject) => {
    const cur = ++id;
    const h = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id === cur) { ws.removeEventListener('message', h); msg.error ? reject(msg.error) : resolve(msg.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  const fileUrl = 'file:///' + tmpHtml.replace(/\\/g, '/');
  await send('Page.navigate', { url: fileUrl });
  await new Promise(r => setTimeout(r, 400));

  async function snapElement(svgContent, size, outputPath) {
    await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
    await send('Runtime.evaluate', {
      expression: `document.getElementById('container').innerHTML = ${JSON.stringify(svgContent)};
                   var s = document.querySelector('svg');
                   s.setAttribute('width', '${size}');
                   s.setAttribute('height', '${size}');`
    });
    await new Promise(r => setTimeout(r, 150));
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      clip: { x: 0, y: 0, width: size, height: size, scale: 1 }
    });
    fs.writeFileSync(outputPath, Buffer.from(shot.data, 'base64'));
    console.log(`Rendered ${path.basename(outputPath)} (${size}x${size})`);
  }

  // 1. Apple Touch Icon 180x180
  await snapElement(appleIconSvg, 180, path.join(brandDir, 'apple-touch-icon.png'));

  // 2. High-contrast Favicon PNGs on pure transparent background (no background box, no scrollbars)
  await snapElement(cleanFaviconSvg, 32, path.join(brandDir, 'favicon-32x32.png'));
  await snapElement(cleanFaviconSvg, 192, path.join(brandDir, 'favicon-192x192.png'));
  await snapElement(cleanFaviconSvg, 512, path.join(brandDir, 'favicon.png'));

  // 3. Write standard ICO wrapper
  const png32Buffer = fs.readFileSync(path.join(brandDir, 'favicon-32x32.png'));
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type 1 = icon
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(32, 0); // width
  icoEntry.writeUInt8(32, 1); // height
  icoEntry.writeUInt8(0, 2);  // palette size
  icoEntry.writeUInt8(0, 3);  // reserved
  icoEntry.writeUInt16LE(1, 4); // color planes
  icoEntry.writeUInt16LE(32, 6); // bits per pixel
  icoEntry.writeUInt32LE(png32Buffer.length, 8); // size of image data
  icoEntry.writeUInt32LE(22, 12); // offset of image data (6 header + 16 entry = 22)

  const icoData = Buffer.concat([icoHeader, icoEntry, png32Buffer]);
  fs.writeFileSync(path.join(brandDir, 'favicon.ico'), icoData);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), icoData);
  console.log('Saved clean standard favicon.ico (32x32)');

  chrome.kill('SIGKILL');
  try { fs.unlinkSync(tmpHtml); } catch (_) {}
}

renderPngs();
