'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cdpPort = 9349;
const brandDir = path.join(__dirname, '..', 'public', 'brand');

const adaptiveFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Light Mode Gradients -->
    <linearGradient id="hbLeftLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#071526" />
      <stop offset="100%" stop-color="#0B1F36" />
    </linearGradient>
    <linearGradient id="hbRightLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1F36" />
      <stop offset="100%" stop-color="#0d6e6e" />
    </linearGradient>
    <linearGradient id="hbBridgeLight" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#0B1F36" />
      <stop offset="50%" stop-color="#0d6e6e" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <!-- Dark Mode Gradients: High-Contrast Pure Cyan & Vibrant Emerald-Teal (Zero White) -->
    <linearGradient id="hbLeftDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>
    <linearGradient id="hbRightDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="hbBridgeDark" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
  </defs>

  <style>
    .hb-p-left { fill: url(#hbLeftLight); }
    .hb-p-right { fill: url(#hbRightLight); }
    .hb-p-bridge { fill: url(#hbBridgeLight); }

    @media (prefers-color-scheme: dark) {
      .hb-p-left { fill: url(#hbLeftDark); }
      .hb-p-right { fill: url(#hbRightDark); }
      .hb-p-bridge { fill: url(#hbBridgeDark); }
    }
  </style>

  <g>
    <!-- Left Pillar of H -->
    <path class="hb-p-left" d="M 80 80 L 175 80 L 175 432 L 80 432 Z" rx="14" />

    <!-- Right Pillar of H -->
    <path class="hb-p-right" d="M 337 80 L 432 80 L 432 432 L 337 432 Z" rx="14" />

    <!-- Connecting Arch Bridge -->
    <path class="hb-p-bridge" d="M 175 220 
             C 210 270, 302 270, 337 220 
             L 337 295 
             C 302 345, 210 345, 175 295 
             Z" />
  </g>
</svg>`;

// Write favicon.svg
fs.writeFileSync(path.join(brandDir, 'favicon.svg'), adaptiveFaviconSvg);
console.log('Saved adaptive favicon.svg');

// Generate Apple Touch Icon with deep navy squircle (no white background box)
const appleIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="aiLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="aiRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="aiBridge" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#0B1F36" />
  <g transform="translate(38, 38) scale(0.85)">
    <path d="M 80 80 L 175 80 L 175 432 L 80 432 Z" fill="url(#aiLeft)" rx="14" />
    <path d="M 337 80 L 432 80 L 432 432 L 337 432 Z" fill="url(#aiRight)" rx="14" />
    <path d="M 175 220 C 210 270, 302 270, 337 220 L 337 295 C 302 345, 210 345, 175 295 Z" fill="url(#aiBridge)" />
  </g>
</svg>`;

async function renderPngs() {
  const tmpHtml = path.join(brandDir, '_tmp_render_icons.html');
  fs.writeFileSync(tmpHtml, `<!doctype html>
<html>
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  body { background: transparent; display: flex; align-items: center; justify-content: center; }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`);

  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=' + cdpPort, 'about:blank'], { stdio: 'ignore' });
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
                   document.querySelector('svg').setAttribute('width', '${size}');
                   document.querySelector('svg').setAttribute('height', '${size}');`
    });
    await new Promise(r => setTimeout(r, 150));
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(outputPath, Buffer.from(shot.data, 'base64'));
    console.log(`Rendered ${path.basename(outputPath)} (${size}x${size})`);
  }

  // 1. Apple Touch Icon 180x180
  await snapElement(appleIconSvg, 180, path.join(brandDir, 'apple-touch-icon.png'));

  // 2. High-contrast Favicon PNGs:
  // Full-bleed rounded squircle badge with pure transparent corners (no white padding/border)
  const universalFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="uLeft" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="uRight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2dd4bf" />
        <stop offset="100%" stop-color="#0d9488" />
      </linearGradient>
      <linearGradient id="uBridge" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="40%" stop-color="#2dd4bf" />
        <stop offset="100%" stop-color="#0d9488" />
      </linearGradient>
    </defs>
    <!-- Full-bleed container: fills exact frame with rounded corners, background outside is 100% transparent -->
    <rect x="0" y="0" width="512" height="512" rx="112" fill="#0B1F36" />
    <g transform="translate(38, 38) scale(0.85)">
      <path d="M 80 80 L 175 80 L 175 432 L 80 432 Z" fill="url(#uLeft)" rx="14" />
      <path d="M 337 80 L 432 80 L 432 432 L 337 432 Z" fill="url(#uRight)" rx="14" />
      <path d="M 175 220 C 210 270, 302 270, 337 220 L 337 295 C 302 345, 210 345, 175 295 Z" fill="url(#uBridge)" />
    </g>
  </svg>`;

  await snapElement(universalFaviconSvg, 32, path.join(brandDir, 'favicon-32x32.png'));
  await snapElement(universalFaviconSvg, 192, path.join(brandDir, 'favicon-192x192.png'));
  await snapElement(universalFaviconSvg, 512, path.join(brandDir, 'favicon.png'));

  // Also write 32x32 PNG to favicon.ico (valid PNG-in-ICO format accepted by all modern browsers)
  // Let's create a standard ICO header wrapper containing the 32x32 PNG:
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
  console.log('Saved standard favicon.ico (32x32)');

  chrome.kill('SIGKILL');
  try { fs.unlinkSync(tmpHtml); } catch (_) {}
}

renderPngs();
