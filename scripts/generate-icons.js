import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNG(width, height, getPixel) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image scanlines
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Pixel generator for Aviator Icon: Dark metallic rounded background with glowing red jet & wing
function aviatorPixel(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const nx = (x - cx) / (width / 2); // -1 to 1
  const ny = (y - cy) / (height / 2); // -1 to 1
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background
  let r = 16, g = 22, b = 34, a = 255; // #101622 dark slate
  
  // Radial gradient background
  const bgGrad = Math.max(0, 1 - dist * 0.7);
  r = Math.floor(16 + bgGrad * 12);
  g = Math.floor(22 + bgGrad * 10);
  b = Math.floor(34 + bgGrad * 18);

  // Red glow center
  const glowDist = Math.sqrt(nx * nx + (ny + 0.05) * (ny + 0.05));
  if (glowDist < 0.75) {
    const glow = (1 - glowDist / 0.75) * 0.55;
    r = Math.min(255, Math.floor(r + 229 * glow));
    g = Math.min(255, Math.floor(g + 29 * glow * 0.2));
    b = Math.min(255, Math.floor(b + 36 * glow * 0.2));
  }

  // Draw Jet Plane Icon
  // Plane points upwards-right (towards (0.35, -0.35))
  // Transform coordinates rotated by -45 degrees
  const angle = Math.PI / 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const px = nx * cos + ny * sin; // aligned horizontally
  const py = -nx * sin + ny * cos; // aligned vertically

  // Jet fuselage: narrow teardrop centered around py = 0, px between -0.4 and 0.4
  // Jet scale adjustment
  const s = isMaskable ? 0.75 : 0.88;
  const jx = px / s;
  const jy = py / s;

  // Fuselage
  let inPlane = false;
  let planeColor = [229, 29, 36]; // #E51D24

  // Fuselage shape
  if (jx >= -0.38 && jx <= 0.4) {
    const fuselageWidth = jx < 0.2 ? 0.06 + (jx + 0.38) * 0.05 : 0.09 * (1 - (jx - 0.2) / 0.2);
    if (Math.abs(jy) < fuselageWidth) {
      inPlane = true;
      planeColor = jx > 0.15 ? [255, 60, 60] : [229, 29, 36];
    }
  }

  // Wings (swept back)
  if (jx >= -0.15 && jx <= 0.15) {
    const wingY = Math.abs(jy);
    const wingExtent = 0.42;
    if (wingY >= 0.05 && wingY <= wingExtent) {
      const wingFront = 0.15 - (wingY - 0.05) * 0.5;
      const wingBack = -0.12 - (wingY - 0.05) * 0.3;
      if (jx >= wingBack && jx <= wingFront) {
        inPlane = true;
        planeColor = [235, 40, 45];
      }
    }
  }

  // Tail fin (stabilizers)
  if (jx >= -0.36 && jx <= -0.22) {
    const tailY = Math.abs(jy);
    const tailExtent = 0.22;
    if (tailY >= 0.04 && tailY <= tailExtent) {
      const tailFront = -0.22 - (tailY - 0.04) * 0.4;
      const tailBack = -0.36;
      if (jx >= tailBack && jx <= tailFront) {
        inPlane = true;
        planeColor = [200, 20, 30];
      }
    }
  }

  // Propeller / Cockpit gold highlight
  if (inPlane) {
    if (jx > 0.05 && jx < 0.25 && Math.abs(jy) < 0.04) {
      planeColor = [255, 215, 0]; // Gold cockpit
    }
    r = planeColor[0];
    g = planeColor[1];
    b = planeColor[2];
  }

  // Outer border ring for non-maskable icons
  if (!isMaskable && dist > 0.88 && dist < 0.94) {
    const ringAlpha = (1 - Math.abs(dist - 0.91) / 0.03);
    r = Math.min(255, Math.floor(r + 229 * ringAlpha * 0.6));
    g = Math.min(255, Math.floor(g + 29 * ringAlpha * 0.3));
    b = Math.min(255, Math.floor(b + 36 * ringAlpha * 0.3));
  }

  return [r, g, b, a];
}

const outDir = path.resolve('./public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating PWA icons in /public...');

// 192x192
const icon192 = createPNG(192, 192, (x, y, w, h) => aviatorPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), icon192);

// 512x512
const icon512 = createPNG(512, 512, (x, y, w, h) => aviatorPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), icon512);

// 512x512 Maskable
const iconMaskable = createPNG(512, 512, (x, y, w, h) => aviatorPixel(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), iconMaskable);

// Apple Touch Icon (180x180)
const iconApple = createPNG(180, 180, (x, y, w, h) => aviatorPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), iconApple);

// SVG Vector Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1f293d"/>
      <stop offset="100%" stop-color="#0a0e17"/>
    </radialGradient>
    <radialGradient id="glowGrad" cx="45%" cy="45%" r="40%">
      <stop offset="0%" stop-color="#E51D24" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#E51D24" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff3b42"/>
      <stop offset="100%" stop-color="#b80f15"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#ff9900"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#E51D24" flood-opacity="0.6"/>
    </filter>
  </defs>
  
  <!-- Rounded Rect App Shell -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" stroke="#E51D24" stroke-width="6" stroke-opacity="0.4"/>
  <circle cx="256" cy="256" r="210" fill="url(#glowGrad)"/>
  
  <!-- Sleek Jet in flight -->
  <g transform="translate(256, 256) rotate(-45) translate(-256, -256)" filter="url(#shadow)">
    <!-- Main Jet Body -->
    <path d="M420,256 L150,210 L120,180 L90,195 L120,256 L90,317 L120,332 L150,302 Z" fill="url(#planeGrad)"/>
    <!-- Swept Wing Left -->
    <path d="M280,256 L160,80 L210,80 L330,256 Z" fill="#E51D24"/>
    <!-- Swept Wing Right -->
    <path d="M280,256 L160,432 L210,432 L330,256 Z" fill="#c01218"/>
    <!-- Cockpit Glass Window -->
    <ellipse cx="330" cy="256" rx="36" ry="12" fill="url(#goldGrad)"/>
    <!-- Speed Lines -->
    <path d="M80,256 L40,256 M100,230 L50,230 M100,282 L50,282" stroke="#ff4d52" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
  </g>
  
  <!-- Badge text -->
  <text x="256" y="455" font-family="'Plus Jakarta Sans', sans-serif" font-size="38" font-weight="900" font-style="italic" fill="#ffffff" text-anchor="middle" letter-spacing="2">
    AVIATOR <tspan fill="#E51D24">PRO</tspan>
  </text>
</svg>`;

fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent);
console.log('PWA icons created successfully!');
