const colorCache = new Map<string, string>();

/**
 * Extracts a rich, dark-UI-friendly accent hex color from a cover image URL.
 */
export function extractDominantColor(imageUrl: string): Promise<string> {
  if (!imageUrl) return Promise.resolve('#282828');
  if (colorCache.has(imageUrl)) return Promise.resolve(colorCache.get(imageUrl)!);

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('#282828');
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
          // Prefer colorful mid-tones over pure black or pure white
          if (lum < 0.08 || lum > 0.92) continue;
          const weight = 0.2 + sat * 2.5;
          rSum += r * weight;
          gSum += g * weight;
          bSum += b * weight;
          weightSum += weight;
        }

        if (weightSum === 0) {
          colorCache.set(imageUrl, '#2a2a38');
          return resolve('#2a2a38');
        }

        // Clamp brightness so white text over gradient always maintains high contrast
        let r = Math.round(rSum / weightSum);
        let g = Math.round(gSum / weightSum);
        let b = Math.round(bSum / weightSum);
        const maxC = Math.max(r, g, b);
        if (maxC > 175) {
          const scale = 175 / maxC;
          r = Math.round(r * scale);
          g = Math.round(g * scale);
          b = Math.round(b * scale);
        } else if (maxC < 45) {
          r = Math.min(90, r + 28);
          g = Math.min(90, g + 28);
          b = Math.min(90, b + 28);
        }

        const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
        colorCache.set(imageUrl, hex);
        resolve(hex);
      } catch {
        resolve('#282828');
      }
    };
    img.onerror = () => resolve('#282828');
    img.src = imageUrl;
  });
}
