export interface AccentPalette {
  moodHex: string;
  accentHex: string;
  accentHoverHex: string;
  r: number;
  g: number;
  b: number;
}

const colorCache = new Map<string, string>();
const paletteCache = new Map<string, AccentPalette>();

export const DEFAULT_ACCENT_PALETTE: AccentPalette = {
  moodHex: '#1db954',
  accentHex: '#1ed760',
  accentHoverHex: '#3be477',
  r: 30,
  g: 215,
  b: 96,
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const norm = [r, g, b].map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

/**
 * Builds a vivid, accessible accent palette from an arbitrary RGB color
 * so black foreground text stays crisp on buttons and dark surfaces glow cleanly.
 */
export function buildVibrantPaletteFromRgb(r: number, g: number, b: number, moodHex?: string): AccentPalette {
  const [h, s] = rgbToHsl(r, g, b);
  if (s < 0.12) {
    return {
      ...DEFAULT_ACCENT_PALETTE,
      moodHex: moodHex || '#2a2a38',
    };
  }

  const vibrantSat = Math.min(0.96, Math.max(0.68, s * 1.2));
  let light = 0.62;
  let [ar, ag, ab] = hslToRgb(h, vibrantSat, light);

  // Boost lightness until WCAG contrast vs #000000 text is high and crisp
  while (relativeLuminance(ar, ag, ab) < 0.43 && light < 0.84) {
    light += 0.03;
    [ar, ag, ab] = hslToRgb(h, vibrantSat, light);
  }

  const [hr, hg, hb] = hslToRgb(h, Math.min(1, vibrantSat + 0.04), Math.min(0.88, light + 0.08));
  return {
    moodHex: moodHex || toHex(r * 0.72, g * 0.72, b * 0.72),
    accentHex: toHex(ar, ag, ab),
    accentHoverHex: toHex(hr, hg, hb),
    r: ar,
    g: ag,
    b: ab,
  };
}

export function buildVibrantPaletteFromHex(hex: string): AccentPalette {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return DEFAULT_ACCENT_PALETTE;
  }
  const clean =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  if ([r, g, b].some(Number.isNaN)) return DEFAULT_ACCENT_PALETTE;
  if (clean.toLowerCase() === '#282828' || clean.toLowerCase() === '#2a2a38') {
    return DEFAULT_ACCENT_PALETTE;
  }
  return buildVibrantPaletteFromRgb(r, g, b, clean);
}

/**
 * Extracts both a rich dark-UI mood background color and a vivid, high-contrast UI accent color.
 */
export function extractAccentPalette(imageUrl: string): Promise<AccentPalette> {
  if (!imageUrl) return Promise.resolve(DEFAULT_ACCENT_PALETTE);
  if (paletteCache.has(imageUrl)) return Promise.resolve(paletteCache.get(imageUrl)!);

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_ACCENT_PALETTE);
        ctx.drawImage(img, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let weightSum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (lum < 0.08 || lum > 0.92) continue;
          const weight = 0.2 + sat * 2.8;
          rSum += r * weight;
          gSum += g * weight;
          bSum += b * weight;
          weightSum += weight;
        }

        if (weightSum === 0) {
          const fallback: AccentPalette = { ...DEFAULT_ACCENT_PALETTE, moodHex: '#2a2a38' };
          colorCache.set(imageUrl, '#2a2a38');
          paletteCache.set(imageUrl, fallback);
          return resolve(fallback);
        }

        const avgR = Math.round(rSum / weightSum);
        const avgG = Math.round(gSum / weightSum);
        const avgB = Math.round(bSum / weightSum);

        let mr = avgR;
        let mg = avgG;
        let mb = avgB;
        const maxC = Math.max(mr, mg, mb);
        if (maxC > 175) {
          const scale = 175 / maxC;
          mr = Math.round(mr * scale);
          mg = Math.round(mg * scale);
          mb = Math.round(mb * scale);
        } else if (maxC < 45) {
          mr = Math.min(90, mr + 28);
          mg = Math.min(90, mg + 28);
          mb = Math.min(90, mb + 28);
        }

        const moodHex = toHex(mr, mg, mb);
        colorCache.set(imageUrl, moodHex);
        const palette = buildVibrantPaletteFromRgb(avgR, avgG, avgB, moodHex);
        paletteCache.set(imageUrl, palette);
        resolve(palette);
      } catch {
        resolve(DEFAULT_ACCENT_PALETTE);
      }
    };
    img.onerror = () => resolve(DEFAULT_ACCENT_PALETTE);
    img.src = imageUrl;
  });
}

/**
 * Extracts a rich, dark-UI-friendly accent hex color from a cover image URL.
 */
export function extractDominantColor(imageUrl: string): Promise<string> {
  if (!imageUrl) return Promise.resolve('#282828');
  if (colorCache.has(imageUrl)) return Promise.resolve(colorCache.get(imageUrl)!);
  return extractAccentPalette(imageUrl).then(p => {
    if (!colorCache.has(imageUrl)) colorCache.set(imageUrl, p.moodHex);
    return p.moodHex;
  });
}
