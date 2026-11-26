import { LyricLine, Track } from '../types';
import { parseLrcText } from './lrcParser';

export interface OnlineLyricsResult {
  lines: LyricLine[];
  synced: boolean;
  sourceLabel: string;
  matchedTitle?: string;
  matchedArtist?: string;
}

interface LrcLibRecord {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const lyricsCache = new Map<string, OnlineLyricsResult | null>();

function cleanQueryText(raw: string): string {
  return raw
    .replace(/\.(mp3|wav|ogg|flac|m4a|aac|opus|webm|aiff|aif)$/i, '')
    .replace(/\[(?:official|lyrics?|audio|hd|hq|4k|visualizer|music video|mv|flac|320\s*kbps|24bit|remaster(?:ed)?|explicit)[^\]]*\]/gi, '')
    .replace(/\((?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics?|audio|visualizer|hd|hq)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchParams(track: Track): {
  title: string;
  artist: string;
  album: string;
  durationSec: number;
} {
  let title = cleanQueryText(track.title || '');
  let artist = cleanQueryText(track.artist || '');

  if ((!artist || artist.toLowerCase() === 'unknown artist') && title.includes(' - ')) {
    const idx = title.indexOf(' - ');
    artist = title.slice(0, idx).trim();
    title = title.slice(idx + 3).trim();
  }

  if (artist.toLowerCase() === 'unknown artist') {
    artist = '';
  }

  let album = cleanQueryText(track.album || '');
  if (
    album.toLowerCase() === 'local files' ||
    album.toLowerCase() === 'unknown album' ||
    album.toLowerCase() === 'downloads' ||
    album.toLowerCase() === 'music'
  ) {
    album = '';
  }

  return {
    title,
    artist,
    album,
    durationSec: Number.isFinite(track.duration) && track.duration > 1 ? Math.round(track.duration) : 0,
  };
}

function recordToLyrics(rec: LrcLibRecord): OnlineLyricsResult | null {
  if (rec.instrumental) {
    return {
      lines: [{ time: 0, text: '♪ Instrumental Track ♪' }],
      synced: true,
      sourceLabel: 'LRCLIB (Instrumental)',
      matchedTitle: rec.trackName,
      matchedArtist: rec.artistName,
    };
  }
  if (rec.syncedLyrics && rec.syncedLyrics.trim()) {
    const parsed = parseLrcText(rec.syncedLyrics);
    if (parsed.length > 0) {
      return {
        lines: parsed,
        synced: true,
        sourceLabel: 'LRCLIB (Synced)',
        matchedTitle: rec.trackName,
        matchedArtist: rec.artistName,
      };
    }
  }
  if (rec.plainLyrics && rec.plainLyrics.trim()) {
    const parsed = parseLrcText(rec.plainLyrics);
    if (parsed.length > 0) {
      return {
        lines: parsed,
        synced: false,
        sourceLabel: 'LRCLIB (Plain)',
        matchedTitle: rec.trackName,
        matchedArtist: rec.artistName,
      };
    }
  }
  return null;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 6500): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Queries LRCLIB for synchronized LRC lyrics matching the playing track's
 * title, artist, album, and exact duration (preventing live/remix mismatches).
 */
export async function fetchOnlineLyrics(
  track: Track,
  force = false
): Promise<OnlineLyricsResult | null> {
  const { title, artist, album, durationSec } = buildSearchParams(track);
  if (!title) return null;

  const cacheKey = `${track.id}::${title.toLowerCase()}::${artist.toLowerCase()}::${durationSec}`;
  if (!force && lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) ?? null;
  }

  // Step 1: Strict LRCLIB exact match (requires artist + duration if known)
  if (artist && durationSec > 0) {
    const strictParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
      duration: String(durationSec),
    });
    if (album) strictParams.set('album_name', album);

    const exact = await fetchJsonWithTimeout<LrcLibRecord>(
      `https://lrclib.net/api/get?${strictParams.toString()}`
    );
    if (exact) {
      const converted = recordToLyrics(exact);
      if (converted && converted.synced) {
        lyricsCache.set(cacheKey, converted);
        return converted;
      }
      // Keep plain match only if search doesn't yield a synced one
      if (converted) {
        lyricsCache.set(cacheKey, converted);
        return converted;
      }
    }
  }

  // Step 2: LRCLIB search fallback ranked by synced availability & duration accuracy
  const searchParams = new URLSearchParams();
  if (artist) {
    searchParams.set('track_name', title);
    searchParams.set('artist_name', artist);
  } else {
    searchParams.set('q', title);
  }

  const candidates = await fetchJsonWithTimeout<LrcLibRecord[]>(
    `https://lrclib.net/api/search?${searchParams.toString()}`
  );

  if (Array.isArray(candidates) && candidates.length > 0) {
    const scored = candidates
      .map(c => {
        const parsed = recordToLyrics(c);
        if (!parsed) return null;
        const durDiff =
          durationSec > 0 && typeof c.duration === 'number' && c.duration > 0
            ? Math.abs(c.duration - durationSec)
            : 0;
        // Reject wildly different track versions (e.g., radio edit vs 9-min extended live)
        if (durationSec > 15 && durDiff > 25) return null;

        let score = parsed.synced ? 1000 : 100;
        if (album && c.albumName && c.albumName.toLowerCase().includes(album.toLowerCase())) {
          score += 50;
        }
        score -= durDiff * 15;
        return { parsed, score };
      })
      .filter((item): item is { parsed: OnlineLyricsResult; score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const best = scored[0].parsed;
      lyricsCache.set(cacheKey, best);
      return best;
    }
  }

  lyricsCache.set(cacheKey, null);
  return null;
}

export function clearLyricsCacheForTrack(trackId: string): void {
  for (const key of lyricsCache.keys()) {
    if (key.startsWith(`${trackId}::`)) {
      lyricsCache.delete(key);
    }
  }
}
