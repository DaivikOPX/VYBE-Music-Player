import { LyricLine } from '../types';

const LRC_LINE_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrcText(raw: string): LyricLine[] {
  if (!raw || !raw.trim()) return [];
  const parsed: LyricLine[] = [];
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const matches = Array.from(line.matchAll(LRC_LINE_RE));
    if (matches.length === 0) continue;
    const text = line.replace(LRC_LINE_RE, '').trim();
    if (!text) continue;

    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const fracStr = m[3] || '0';
      const frac = fracStr.length === 3 ? parseInt(fracStr, 10) / 1000 : parseInt(fracStr, 10) / 100;
      const time = mins * 60 + secs + frac;
      parsed.push({ time, text });
    }
  }

  if (parsed.length > 0) {
    parsed.sort((a, b) => a.time - b.time);
    return parsed;
  }

  // Fallback for unsynchronized lyrics text: split lines with evenly spaced placeholder times (-1 = unsynced)
  return lines
    .map(l => l.trim())
    .filter(Boolean)
    .map(text => ({ time: -1, text }));
}
