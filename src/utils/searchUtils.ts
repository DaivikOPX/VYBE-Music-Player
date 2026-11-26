import { AlbumSummary, Artist, Playlist, Track } from '../types';

/** Extract clean filename from track sourceKey or fallback to title */
export function extractFileName(track: Track): string {
  const raw = track.sourceKey || '';
  if (!raw) return track.title;
  if (raw.includes('::')) return raw.split('::')[0] || track.title;
  const parts = raw.split(/[\\/]/);
  return parts[parts.length - 1] || track.title;
}

/** Extract parent folder name from track sourceKey */
export function extractFolderName(track: Track): string {
  const raw = track.sourceKey || '';
  if (!raw || raw.includes('::')) return '';
  const parts = raw.split(/[\\/]/).filter(Boolean);
  if (parts.length < 2) return '';
  return parts[parts.length - 2] || '';
}

/**
 * Computes fuzzy relevance score (>0 = match, 0 = no match).
 * Prioritizes exact prefix/substring matches, then ordered subsequence,
 * then light edit-distance tolerance for typos.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = (target || '').toLowerCase();
  if (!q || !t) return 0;

  const idx = t.indexOf(q);
  if (idx === 0) return 100;
  if (idx > 0) return 80 - Math.min(30, idx);

  // Subsequence match (e.g. "mddl" matches "Middle")
  let qi = 0;
  let gaps = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
    } else if (qi > 0) {
      gaps++;
    }
  }
  if (qi === q.length) {
    return Math.max(25, 65 - gaps);
  }

  // Word-level bounded Levenshtein typo tolerance (1 edit per short token, 2 for longer)
  if (q.length >= 4) {
    const tokens = t.split(/[\s\-_.,()]+/).filter(Boolean);
    const maxDist = q.length >= 7 ? 2 : 1;
    for (const tok of tokens) {
      if (Math.abs(tok.length - q.length) > maxDist) continue;
      if (levenshtein(q, tok) <= maxDist) return 35;
    }
  }
  return 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

export interface LyricMatch {
  track: Track;
  line: string;
  time: number;
}

export interface LibrarySearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: AlbumSummary[];
  playlists: Playlist[];
  genres: string[];
  lyricMatches: LyricMatch[];
}

export function searchLibrary(
  query: string,
  tracks: Track[],
  artists: Artist[],
  albums: AlbumSummary[],
  playlists: Playlist[]
): LibrarySearchResults {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { tracks: [], artists: [], albums: [], playlists: [], genres: [], lyricMatches: [] };
  }

  const scoredTracks = tracks
    .map(t => {
      const fileName = extractFileName(t);
      const folderName = extractFolderName(t);
      const score = Math.max(
        fuzzyScore(q, t.title) * 1.3,
        fuzzyScore(q, t.artist) * 1.1,
        fuzzyScore(q, t.album),
        fuzzyScore(q, t.genre || ''),
        fuzzyScore(q, t.codec || ''),
        fuzzyScore(q, fileName) * 0.9,
        fuzzyScore(q, folderName) * 0.85
      );
      return { track: t, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.track);

  const matchedArtists = artists
    .map(a => ({ a, score: fuzzyScore(q, a.name) }))
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map(x => x.a);

  const matchedAlbums = albums
    .map(a => ({ a, score: Math.max(fuzzyScore(q, a.name), fuzzyScore(q, a.artist) * 0.8) }))
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map(x => x.a);

  const matchedPlaylists = playlists
    .map(p => ({ p, score: fuzzyScore(q, p.title) }))
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map(x => x.p);

  const genreSet = new Set<string>();
  for (const t of tracks) {
    if (t.genre && fuzzyScore(q, t.genre) > 0) genreSet.add(t.genre);
  }

  const lyricMatches: LyricMatch[] = [];
  for (const t of tracks) {
    if (!t.lyrics?.length) continue;
    for (const l of t.lyrics) {
      if (l.text.toLowerCase().includes(q)) {
        lyricMatches.push({ track: t, line: l.text, time: l.time });
        break;
      }
    }
  }

  return {
    tracks: scoredTracks,
    artists: matchedArtists,
    albums: matchedAlbums,
    playlists: matchedPlaylists,
    genres: Array.from(genreSet),
    lyricMatches
  };
}
