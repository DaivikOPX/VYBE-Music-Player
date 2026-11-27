const fs = require('fs');
const path = require('path');

async function downloadFonts() {
  try {
    const css = await fetch('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@700;800;900&family=Poppins:wght@700;800;900&display=swap', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }).then(r => r.text());

    const dir = path.join(__dirname, '..', 'public', 'fonts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Find font-family, font-weight, and url
    const regex = /font-family:\s*['"]([^'"]+)['"][^}]+?font-weight:\s*(\d+)[^}]+?url\((https:\/\/[^)]+)\)/g;
    let match;
    while ((match = regex.exec(css)) !== null) {
      const family = match[1].replace(/\s+/g, '');
      const weight = match[2];
      const fontUrl = match[3];
      const filename = `${family}-${weight}.woff2`;
      const targetPath = path.join(dir, filename);
      if (!fs.existsSync(targetPath)) {
        console.log(`Downloading ${filename} from ${fontUrl}...`);
        const res = await fetch(fontUrl);
        const arrayBuf = await res.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuf));
        console.log(`Saved ${filename} (${arrayBuf.byteLength} bytes)`);
      }
    }
    console.log('Font download completed!');
  } catch (err) {
    console.error('Failed to download fonts:', err);
  }
}

downloadFonts();
