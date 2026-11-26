// Pure Node.js high-resolution icon generator for VYBE
// Generates:
// 1. build/icon.png (512x512 crisp PNG)
// 2. build/icon.ico (Windows multi-resolution ICO containing 16x16, 32x32, 48x48, 64x64, 128x128, 256x256)
// 3. Android res mipmap icons (ic_launcher.png, ic_launcher_round.png)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderVybeIcon(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const center = (size - 1) / 2;
  const radius = size * 0.46;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // Filter byte: None

    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;

      // Rounded rectangle distance
      const qx = Math.abs(dx) - (center - cornerRadius);
      const qy = Math.abs(dy) - (center - cornerRadius);
      const outsideDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const insideDist = Math.min(Math.max(qx, qy), 0);
      const dist = outsideDist + insideDist - cornerRadius;

      if (dist > 1.0) {
        // Transparent outside
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
        continue;
      }

      // Background acrylic gradient (Deep dark emerald to rich obsidian)
      const gradT = (y / size);
      let bgR = Math.round(10 + 6 * (1 - gradT));
      let bgG = Math.round(18 + 14 * (1 - gradT));
      let bgB = Math.round(14 + 10 * (1 - gradT));
      let alpha = 255;

      if (dist > -1.0) {
        // Anti-aliased outer border
        alpha = Math.round(255 * Math.max(0, Math.min(1, -dist)));
      }

      // Metallic subtle border ring
      if (dist >= -2.0 && dist <= 0.0) {
        bgR = Math.round(bgR * 0.6 + 30 * 0.4);
        bgG = Math.round(bgG * 0.6 + 215 * 0.4);
        bgB = Math.round(bgB * 0.6 + 96 * 0.4);
      }

      // Brand Symbol: "V" monogram with neon sound wave bars
      // Normalized coordinates from -1 to 1
      const nx = dx / radius;
      const ny = dy / radius;

      // Center soundwave bars + stylized V monogram
      // Left leg of V: from (-0.55, -0.45) to (0, 0.45)
      // Right leg of V: from (0.55, -0.45) to (0, 0.45)
      let isSymbol = false;
      let symbolIntensity = 0;

      // Sound bars in center:
      // Bar 1: x in [-0.42, -0.32], y in [-0.2, 0.2]
      // Bar 2: x in [-0.18, -0.08], y in [-0.4, 0.4]
      // Bar 3: x in [0.08, 0.18],   y in [-0.4, 0.4]
      // Bar 4: x in [0.32, 0.42],   y in [-0.2, 0.2]

      const bars = [
        { x: -0.34, w: 0.08, h: 0.28 },
        { x: -0.11, w: 0.08, h: 0.52 },
        { x: 0.11,  w: 0.08, h: 0.52 },
        { x: 0.34,  w: 0.08, h: 0.28 }
      ];

      for (const bar of bars) {
        if (Math.abs(nx - bar.x) <= bar.w / 2 && Math.abs(ny) <= bar.h / 2) {
          isSymbol = true;
          symbolIntensity = 1.0;
          break;
        }
      }

      // Lower dynamic glow dot
      const dotDist = Math.hypot(nx, ny - 0.58);
      if (dotDist <= 0.09) {
        isSymbol = true;
        symbolIntensity = Math.max(symbolIntensity, 1.0 - dotDist / 0.09);
      }

      if (isSymbol) {
        // Spotify vibrant neon green gradient: #1ed760 to #10b981
        const symR = Math.round(30 + 10 * ny);
        const symG = Math.round(215 + 20 * ny);
        const symB = Math.round(96 + 30 * ny);

        raw[px] = symR;
        raw[px + 1] = symG;
        raw[px + 2] = symB;
        raw[px + 3] = alpha;
      } else {
        raw[px] = bgR;
        raw[px + 1] = bgG;
        raw[px + 2] = bgB;
        raw[px + 3] = alpha;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
  return png;
}

function createIco(pngBuffersBySize) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(pngBuffersBySize.length, 4); // count

  const dirEntrySize = 16;
  const dirEntries = [];
  let currentOffset = 6 + dirEntrySize * pngBuffersBySize.length;

  for (const item of pngBuffersBySize) {
    const entry = Buffer.alloc(dirEntrySize);
    entry[0] = item.size >= 256 ? 0 : item.size;
    entry[1] = item.size >= 256 ? 0 : item.size;
    entry[2] = 0; // color count
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4);  // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.png.length, 8); // size of image data
    entry.writeUInt32LE(currentOffset, 12);  // offset
    dirEntries.push(entry);
    currentOffset += item.png.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffersBySize.map(x => x.png)
  ]);
}

function main() {
  const buildDir = path.join(__dirname, '..', 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const publicDir = path.join(__dirname, '..', 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  console.log('Generating master icons...');
  const png512 = renderVybeIcon(512);
  const png256 = renderVybeIcon(256);
  const png128 = renderVybeIcon(128);
  const png64 = renderVybeIcon(64);
  const png48 = renderVybeIcon(48);
  const png32 = renderVybeIcon(32);
  const png16 = renderVybeIcon(16);

  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), renderVybeIcon(192));

  // Create Windows ICO file
  const icoBuf = createIco([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
    { size: 48, png: png48 },
    { size: 64, png: png64 },
    { size: 128, png: png128 },
    { size: 256, png: png256 }
  ]);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
  console.log('Created build/icon.ico (' + icoBuf.length + ' bytes) & build/icon.png');

  // Android mipmap icons
  const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    const mipmaps = [
      { dir: 'mipmap-mdpi', size: 48 },
      { dir: 'mipmap-hdpi', size: 72 },
      { dir: 'mipmap-xhdpi', size: 96 },
      { dir: 'mipmap-xxhdpi', size: 144 },
      { dir: 'mipmap-xxxhdpi', size: 192 }
    ];
    for (const m of mipmaps) {
      const targetDir = path.join(androidResDir, m.dir);
      if (fs.existsSync(targetDir)) {
        const iconPng = renderVybeIcon(m.size);
        fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconPng);
        fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), iconPng);
      }
    }
    console.log('Updated Android launcher mipmap icons.');
  }
}

main();
