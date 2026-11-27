import { parseBlob, selectCover } from 'music-metadata';
import { LyricLine } from '../types';
import { parseLrcText } from './lrcParser';
import { extractDominantColor } from './colorExtract';

const AUDIO_EXT_RE = /\.(mp3|wav|ogg|flac|m4a|aac|opus|webm|aiff|aif)$/i;

export function parseFallbackFilename(fileName: string) {
  const base = fileName.replace(AUDIO_EXT_RE, '').trim();

  // Strip leading track number patterns like '01 - ', '01. ', '01 ', '1-02 ', 'A1. '
  const trackNumRe = /^\s*(?:cd\s*\d+[\s.-]*)?(?:\d{1,2}[-_])?\d{1,3}[\s._-]+/i;
  const withoutTrackNum = base.replace(trackNumRe, '').trim();

  let title = withoutTrackNum || base || fileName;
  let artist = 'Unknown Artist';

  // Check if stripped string has ' - ' separator
  const dashInClean = withoutTrackNum.indexOf(' - ');
  const dashInBase = base.indexOf(' - ');

  if (dashInClean > 0) {
    const p1 = withoutTrackNum.slice(0, dashInClean).trim();
    const p2 = withoutTrackNum.slice(dashInClean + 3).trim();
    if (!/^\d+$/.test(p1) && !/^(?:track|audio|sound)\s*\d*$/i.test(p1)) {
      artist = p1;
      title = p2 || withoutTrackNum;
    }
  } else if (dashInBase > 0) {
    const p1 = base.slice(0, dashInBase).trim();
    const p2 = base.slice(dashInBase + 3).trim();
    if (!/^\d+$/.test(p1) && !/^(?:track|audio|sound)\s*\d*$/i.test(p1)) {
      artist = p1;
      title = p2 || base;
    }
  }

  return {
    artist: artist || 'Unknown Artist',
    title: title || fileName
  };
}

/**
 * Downscales an embedded cover image into a compact JPEG data URL (max 320px)
 * so storing hundreds of album covers stays fast and memory-safe.
 */
async function createCompactCoverDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  const safeBytes = new Uint8Array(bytes);
  const blob = new Blob([safeBytes], { type: mime || 'image/jpeg' });
  const tempUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = tempUrl;
    });
    const maxDim = 320;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

export interface ParsedAudioMeta {
  title: string;
  artist: string;
  album: string;
  trackNumber?: number;
  year?: number;
  genre?: string;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  codec?: string;
  coverUrl: string;
  accentColor: string;
  lyrics?: LyricLine[];
}

export async function parseBrowserAudioFile(file: File, sidecarLrcText?: string): Promise<ParsedAudioMeta> {
  const fallback = parseFallbackFilename(file.name);
  let title = fallback.title;
  let artist = fallback.artist;
  let album = 'Local Files';
  let trackNumber: number | undefined;
  let year: number | undefined;
  let genre: string | undefined;
  let duration = 0;
  let bitrate: number | undefined;
  let sampleRate: number | undefined;
  let bitDepth: number | undefined;
  let codec: string | undefined;
  let coverUrl = '';
  let accentColor = '#282828';
  let lyrics: LyricLine[] | undefined;

  if (sidecarLrcText) {
    const parsedLrc = parseLrcText(sidecarLrcText);
    if (parsedLrc.length > 0) lyrics = parsedLrc;
  }

  try {
    const meta = await parseBlob(file, { duration: true });
    const { common, format } = meta;

    if (common.title?.trim()) title = common.title.trim();
    if (common.artist?.trim()) artist = common.artist.trim();
    else if (common.artists && common.artists.length > 0) artist = common.artists.join(', ');
    if (common.album?.trim()) album = common.album.trim();
    if (common.track?.no) trackNumber = common.track.no;
    if (common.year) year = common.year;
    if (common.genre && common.genre.length > 0) genre = common.genre[0];

    if (format.duration && Number.isFinite(format.duration)) duration = format.duration;
    if (format.bitrate) bitrate = Math.round(format.bitrate / 1000);
    if (format.sampleRate) sampleRate = format.sampleRate;
    if (format.bitsPerSample) bitDepth = format.bitsPerSample;
    if (format.codec) codec = format.codec;

    if (!lyrics && common.lyrics && common.lyrics.length > 0) {
      const lyrTag = common.lyrics[0];
      if (lyrTag.syncText && lyrTag.syncText.length > 0) {
        lyrics = lyrTag.syncText
          .filter(s => s.text.trim())
          .map(s => ({ time: (s.timestamp ?? 0) / 1000, text: s.text.trim() }));
      } else if (lyrTag.text) {
        const parsed = parseLrcText(lyrTag.text);
        if (parsed.length > 0) lyrics = parsed;
      }
    }

    const cover = selectCover(common.picture);
    if (cover) {
      coverUrl = await createCompactCoverDataUrl(cover.data, cover.format);
      if (coverUrl) {
        accentColor = await extractDominantColor(coverUrl);
      }
    }
  } catch {
    // Fallback gracefully to filename-derived metadata
  }

  return {
    title,
    artist,
    album,
    trackNumber,
    year,
    genre,
    duration,
    bitrate,
    sampleRate,
    bitDepth,
    codec,
    coverUrl,
    accentColor,
    lyrics
  };
}
