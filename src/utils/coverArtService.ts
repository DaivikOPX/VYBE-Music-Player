/**
 * Cover Art & Metadata Enrichment Service
 * Fetches high-resolution cover artwork and verified metadata for music files using:
 * 1. Apple Music / iTunes Search API (1000x1000 HD artwork, rich metadata, zero keys required)
 * 2. MusicBrainz / Cover Art Archive (open-source database fallback)
 *
 * Employs fuzzy string similarity, multi-token candidate ranking, and confidence scoring
 * to reject irrelevant/random artwork (e.g. generic titles like "Intro" or "Track 01").
 */

export interface CoverArtMatch {
  coverUrl: string;
  albumName: string;
  artistName: string;
  trackTitle?: string;
  genre?: string;
  releaseYear?: number;
  trackNumber?: number;
  score: number; // 0 to 100 confidence score
  source: 'itunes' | 'musicbrainz';
}

// In-memory cache to prevent duplicate network searches across the app session
const coverArtCache = new Map<string, CoverArtMatch | null>();

/**
 * Checks if an artist name is generic, missing, numeric, or a placeholder
 */
export function isGenericArtist(artist?: string): boolean {
  if (!artist) return true;
  const a = artist.trim().toLowerCase();
  if (!a) return true;
  if (/^\d+$/.test(a)) return true; // Purely numeric like "01", "02"
  if (/^(?:track|artist|audio|sound|cd)\s*\d*$/i.test(a)) return true;
  if (/^\d+[\s.-]+(?:track|artist|audio|sound)$/i.test(a)) return true;

  return (
    a === 'unknown artist' ||
    a === 'unknown' ||
    a === 'various artists' ||
    a === 'various' ||
    a === 'various artist' ||
    a === 'artist' ||
    a === 'track' ||
    a === 'audio' ||
    a === 'sound' ||
    a === 'composer' ||
    a === 'performer' ||
    a === 'singer' ||
    a === 'none' ||
    a === 'untitled' ||
    a === 'null' ||
    a === 'undefined'
  );
}

/**
 * Checks if an album name is generic, folder-derived, or missing
 */
export function isGenericAlbum(album?: string): boolean {
  if (!album) return true;
  const a = album.trim().toLowerCase();
  if (!a) return true;
  if (/^\d+$/.test(a)) return true;

  const genericWords = new Set([
    'local files',
    'unknown album',
    'unknown',
    'music',
    'download',
    'downloads',
    'audio',
    'songs',
    'new folder',
    'desktop',
    'documents',
    'temp',
    'my music',
    'music library',
    'album',
    'various',
    'singles',
    'tracks',
    'files',
    'mp3',
    'media'
  ]);

  if (genericWords.has(a)) return true;

  // Folder names often contain patterns like songs_backup, music_2024, my_downloads, etc.
  if (
    /(?:^|[_\s.-])(?:backup|downloads?|songs?|musics?|audios?|folders?|files?|tracks?|media|rip|desktop|documents?|temp|new|old|copy|misc|all)(?:$|[_\s.-])/i.test(
      a
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a track title is generic, a track number, or placeholder without artist
 */
export function isGenericTitle(title?: string): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  if (!t) return true;
  if (/^\d+$/.test(t)) return true; // Pure number like "01", "1"
  if (/^(?:track|audio|title|sound|song|demo|cd)\s*\d*$/i.test(t)) return true;
  if (/^\d{1,3}[\s.-]+(?:track|audio|title|sound|song)$/i.test(t)) return true;

  const genericTitles = new Set([
    'unknown',
    'unknown track',
    'audio',
    'sound',
    'untitled',
    'track',
    'song',
    'recording',
    'voice note',
    'intro',
    'outro',
    'interlude',
    'skit',
    'bonus',
    'bonus track',
    'demo',
    'test',
    'track 01',
    'track 1',
    'track 2',
    'audio 01',
    'instrumental',
    'untitled track'
  ]);

  return genericTitles.has(t);
}

/**
 * Checks if a track title is generic, unformatted, or ripped with junk
 */
export function isMessyOrGenericTitle(title?: string): boolean {
  if (!title) return true;
  if (isGenericTitle(title)) return true;
  const t = title.trim().toLowerCase();

  // Check if it ends in raw file extension (.mp3, .flac, etc.)
  if (/\.(mp3|flac|wav|m4a|aac|ogg|opus)$/i.test(t)) return true;
  // Check if it starts with track number like "01 - " or "01. "
  if (/^\s*(?:cd\s*\d+[\s.-]*)?(?:\d{1,2}[-_])?\d{1,3}[\s._-]+/i.test(title)) return true;
  // Check if it contains YouTube junk like [Official Video], (Audio), (Lyrics), etc.
  if (
    /[\(\[](?:official\s*(?:video|audio|music\s*video|visualizer)|lyric\s*video|lyrics|hd|4k|320\s*kbps)[\)\]]/i.test(
      title
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Strips YouTube/ripped junk, track numbers, and brackets from titles
 * e.g. "01 - Bohemian Rhapsody (Official Music Video) [HQ]" -> "Bohemian Rhapsody"
 */
export function sanitizeTrackTitle(title: string): string {
  if (!title) return '';
  let clean = title.trim();

  // Strip file extensions
  clean = clean.replace(/\.(mp3|flac|wav|m4a|aac|ogg|wma|opus|webm|aiff|aif)$/i, '');

  // Strip leading track numbers like "01 - ", "01. ", "01 ", "1-02 "
  clean = clean.replace(/^\s*(?:cd\s*\d+[\s.-]*)?(?:\d{1,2}[-_])?\d{1,3}[\s._-]+/i, '');

  // Strip common YouTube / audio tags in parentheses or brackets
  clean = clean.replace(
    /\s*[\(\[](?:official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer|mv|hd\s*video)|lyrics?|audio|video|remastered(?:\s*\d{4})?|remaster|hq|hd|4k|1080p|720p|320\s*kbps|bonus\s*track|explicit|clean|radio\s*edit|live\s*(?:at\s*[^)\]]*)?|studio\s*version)[\)\]]/gi,
    ''
  );

  // Strip featured artists from title to maximize search match
  clean = clean.replace(/\s*[\(\[]?(?:feat\.?|ft\.?)\s+[^)\]]+[\)\]]?/gi, '');

  // If title is "Artist - Title", return just Title
  const dashIdx = clean.indexOf(' - ');
  if (dashIdx > 0 && dashIdx < clean.length - 3) {
    clean = clean.slice(dashIdx + 3).trim();
  }

  // Normalize duplicate spaces without stripping Unicode/accents
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean || title.trim();
}

/**
 * Cleans query terms preserving Unicode letters, numbers, and accents
 */
function cleanQuery(str: string): string {
  return str
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Calculates string similarity ratio (0.0 to 1.0) using token overlap and edit distance
 */
export function stringSimilarity(s1: string, s2: string): number {
  const a = (s1 || '').trim().toLowerCase();
  const b = (s2 || '').trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1.0;

  // Clean punctuation and normalize whitespace
  const cleanA = a.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  const cleanB = b.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  if (!cleanA || !cleanB) return 0;
  if (cleanA === cleanB) return 1.0;

  // Word token Jaccard similarity
  const wordsA = new Set(cleanA.split(' ').filter(Boolean));
  const wordsB = new Set(cleanB.split(' ').filter(Boolean));
  let matchCount = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) matchCount++;
  }
  const jaccard = matchCount / Math.max(1, wordsA.size + wordsB.size - matchCount);

  // Levenshtein similarity
  const maxLen = Math.max(cleanA.length, cleanB.length);
  const dist = levenshteinDistance(cleanA, cleanB);
  const levSim = Math.max(0, 1 - dist / maxLen);

  // Substring overlap boost
  const subSim =
    cleanA.includes(cleanB) || cleanB.includes(cleanA)
      ? Math.min(cleanA.length, cleanB.length) / Math.max(cleanA.length, cleanB.length)
      : 0;

  return Math.max(jaccard * 0.65 + levSim * 0.35, subSim * 0.85);
}

/**
 * Evaluates candidate match against query terms and computes a 0-100 confidence score
 */
function scoreCandidate(
  query: { artist: string; album: string; title: string },
  candidate: {
    artistName?: string;
    albumName?: string;
    trackTitle?: string;
    trackName?: string;
    collectionName?: string;
    primaryGenreName?: string;
  }
): number {
  const candArtist = candidate.artistName || '';
  const candTitle = candidate.trackTitle || candidate.trackName || '';
  const candAlbum = candidate.albumName || candidate.collectionName || '';

  // 1. Detect junk / low-quality rip terms in candidate
  const candFullText = `${candArtist} ${candTitle} ${candAlbum}`.toLowerCase();
  const junkTerms = [
    'karaoke',
    'tribute',
    'in the style of',
    'originally performed by',
    'backing track',
    'ringtone',
    'soundtrack tribute',
    'instrumental tribute',
    'cover band'
  ];
  let junkPenalty = 0;
  for (const term of junkTerms) {
    if (candFullText.includes(term)) {
      // If the user's query didn't ask for karaoke or tribute, heavily penalize it
      const queryText = `${query.artist} ${query.title} ${query.album}`.toLowerCase();
      if (!queryText.includes(term)) {
        junkPenalty = 50;
        break;
      }
    }
  }

  // Slight preference for studio releases/singles over film/movie soundtracks when available
  let soundtrackAdjustment = 0;
  const isSoundtrack =
    candidate.primaryGenreName === 'Soundtrack' ||
    /soundtrack|motion picture|original score|film score/i.test(candAlbum);
  const queryExplicitlyWantsSoundtrack = /soundtrack|ost|motion picture|score/i.test(
    `${query.title} ${query.album}`
  );
  if (isSoundtrack && !queryExplicitlyWantsSoundtrack) {
    soundtrackAdjustment = -8;
  }

  let titleScore = 0;
  let artistScore = 0;
  let albumScore = 0;

  const hasQueryTitle = Boolean(query.title);
  const hasQueryArtist = Boolean(query.artist && !isGenericArtist(query.artist));
  const hasQueryAlbum = Boolean(query.album && !isGenericAlbum(query.album));

  // Title scoring
  if (hasQueryTitle && candTitle) {
    const cleanCandTitle = sanitizeTrackTitle(candTitle);
    const sim = stringSimilarity(query.title, cleanCandTitle);
    if (sim >= 0.95) titleScore = 50;
    else if (sim >= 0.75) titleScore = 40;
    else if (sim >= 0.5) titleScore = 25;
    else if (sim >= 0.3) titleScore = 10;
    else titleScore = -25; // Severe penalty if candidate title does not match at all
  } else if (!hasQueryTitle) {
    // If user has no title, title neutrality
    titleScore = 20;
  }

  // Artist scoring
  if (hasQueryArtist && candArtist) {
    const sim = stringSimilarity(query.artist, candArtist);
    if (sim >= 0.9) artistScore = 40;
    else if (sim >= 0.7) artistScore = 30;
    else if (sim >= 0.45) artistScore = 15;
    else artistScore = -35; // Severe penalty if candidate artist doesn't match
  } else if (!hasQueryArtist) {
    // If query has unknown artist, boost title weight
    artistScore = hasQueryTitle ? (titleScore > 20 ? 25 : 0) : 10;
  }

  // Album scoring
  if (hasQueryAlbum && candAlbum) {
    const sim = stringSimilarity(query.album, candAlbum);
    if (sim >= 0.8) albumScore = 15;
    else if (sim >= 0.5) albumScore = 10;
    else albumScore = 0;
  } else {
    albumScore = 5;
  }

  const rawScore = titleScore + artistScore + albumScore - junkPenalty + soundtrackAdjustment;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Searches online for high-res cover art candidates matching an artist, album, or track title.
 * Returns an array of ranked candidate matches sorted by confidence score.
 */
export async function searchOnlineCoverArt(params: {
  artist?: string;
  album?: string;
  title?: string;
}): Promise<CoverArtMatch[]> {
  const rawArtist = (params.artist || '').trim();
  const rawAlbum = (params.album || '').trim();
  const rawTitle = (params.title || '').trim();

  const cleanArtist = isGenericArtist(rawArtist) ? '' : rawArtist;
  const cleanAlbum = isGenericAlbum(rawAlbum) ? '' : rawAlbum;
  const cleanTitle = sanitizeTrackTitle(rawTitle);

  // CRITICAL SAFEGUARD: Never blind-search for generic titles ("Intro", "Track 01") without an artist
  if (!cleanArtist && isGenericTitle(cleanTitle)) {
    return [];
  }

  if (!cleanArtist && !cleanAlbum && !cleanTitle) {
    return [];
  }

  const candidates: CoverArtMatch[] = [];
  const seenCandidates = new Set<string>();

  const processItunesResults = (results: any[]) => {
    if (!Array.isArray(results)) return;
    for (const match of results) {
      if (!match?.artworkUrl100) continue;
      const albumName = match.collectionName || cleanAlbum || match.trackName || 'Unknown Album';
      const artistName = match.artistName || cleanArtist || 'Unknown Artist';
      const trackTitle = match.trackName || cleanTitle || undefined;
      const dedupeKey = `${artistName.toLowerCase()}::${albumName.toLowerCase()}::${(trackTitle || '').toLowerCase()}`;

      if (seenCandidates.has(dedupeKey)) continue;
      seenCandidates.add(dedupeKey);

      const score = scoreCandidate(
        { artist: cleanArtist, album: cleanAlbum, title: cleanTitle },
        { artistName, albumName, trackTitle, primaryGenreName: match.primaryGenreName }
      );

      // Only accept candidates meeting minimum reasonable relevance (score >= 35)
      if (score >= 35) {
        const highResUrl = match.artworkUrl100.replace('100x100bb', '1000x1000bb');
        candidates.push({
          coverUrl: highResUrl,
          albumName,
          artistName,
          trackTitle,
          genre: match.primaryGenreName || undefined,
          trackNumber: typeof match.trackNumber === 'number' ? match.trackNumber : undefined,
          releaseYear: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
          score,
          source: 'itunes',
        });
      }
    }
  };

  // 1. Try iTunes Song / Track Search (Most accurate for individual tracks)
  if (cleanArtist && cleanTitle) {
    try {
      const term = cleanQuery(`${cleanArtist} ${cleanTitle}`);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        processItunesResults(data.results);
      }
    } catch (err) {
      console.warn('iTunes song search error:', err);
    }
  }

  // 2. Try iTunes Album Search if album name is provided
  if (cleanArtist && cleanAlbum && candidates.length < 4) {
    try {
      const term = cleanQuery(`${cleanArtist} ${cleanAlbum}`);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=8`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        processItunesResults(data.results);
      }
    } catch (err) {
      console.warn('iTunes album search error:', err);
    }
  }

  // 3. Try Search by Clean Title alone (only if non-generic title and few candidates)
  if (cleanTitle && !isGenericTitle(cleanTitle) && candidates.length === 0) {
    try {
      const term = cleanQuery(cleanTitle);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        processItunesResults(data.results);
      }
    } catch (err) {
      console.warn('iTunes title-only search error:', err);
    }
  }

  // 4. Try Search by Artist alone if only artist is known
  if (cleanArtist && !cleanTitle && candidates.length === 0) {
    try {
      const term = cleanQuery(cleanArtist);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=8`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        processItunesResults(data.results);
      }
    } catch (err) {
      console.warn('iTunes artist-only search error:', err);
    }
  }

  // 5. Fallback to MusicBrainz / Cover Art Archive if iTunes yielded no candidates
  if (candidates.length === 0 && cleanAlbum) {
    try {
      const mbQuery = cleanArtist
        ? `release:"${cleanAlbum}" AND artist:"${cleanArtist}"`
        : `release:"${cleanAlbum}"`;
      const mbRes = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(mbQuery)}&limit=3&fmt=json`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'VYBE-Music-Player/1.0.0 (https://github.com/DaivikOPX/VYBE-Music-Player)',
          },
        }
      );
      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const releases = mbData.releases || [];
        for (const rel of releases) {
          if (!rel?.id) continue;
          const caaUrl = `https://coverartarchive.org/release/${rel.id}/front-500`;
          try {
            const check = await fetch(caaUrl, { method: 'HEAD' });
            if (check.ok) {
              const artistName = rel['artist-credit']?.[0]?.name || cleanArtist || 'Unknown Artist';
              const albumName = rel.title || cleanAlbum;
              const score = scoreCandidate(
                { artist: cleanArtist, album: cleanAlbum, title: cleanTitle },
                { artistName, albumName }
              );
              if (score >= 35) {
                candidates.push({
                  coverUrl: caaUrl,
                  albumName,
                  artistName,
                  trackTitle: cleanTitle || undefined,
                  releaseYear: rel.date ? parseInt(rel.date.slice(0, 4), 10) : undefined,
                  score,
                  source: 'musicbrainz',
                });
              }
            }
          } catch {
            // CAA check failed
          }
        }
      }
    } catch (err) {
      console.warn('MusicBrainz cover search failed:', err);
    }
  }

  // Sort candidates by confidence score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 8);
}

/**
 * Searches online for the single most confident cover art match.
 * Returns null if no candidate passes the confidence threshold (score >= 55).
 */
export async function fetchOnlineCoverArt(params: {
  artist: string;
  album?: string;
  title?: string;
}): Promise<CoverArtMatch | null> {
  const cleanArtist = isGenericArtist(params.artist) ? '' : (params.artist || '').trim();
  const cleanAlbum = isGenericAlbum(params.album) ? '' : (params.album || '').trim();
  const cleanTitle = sanitizeTrackTitle(params.title || '');

  // Guard: generic titles without artist never auto-pull
  if (!cleanArtist && isGenericTitle(cleanTitle)) {
    return null;
  }

  const cacheKey = `${cleanArtist.toLowerCase()}::${cleanAlbum.toLowerCase()}::${cleanTitle.toLowerCase()}`;
  if (coverArtCache.has(cacheKey)) {
    return coverArtCache.get(cacheKey) || null;
  }

  const candidates = await searchOnlineCoverArt(params);
  if (candidates.length > 0 && candidates[0].score >= 55) {
    const best = candidates[0];
    coverArtCache.set(cacheKey, best);
    return best;
  }

  coverArtCache.set(cacheKey, null);
  return null;
}

/**
 * Downloads an image from a URL and converts it to a base64 data URL
 * so it can be physically embedded into ID3 tags via Electron.
 */
export async function downloadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Failed to convert image to data URL:', err);
    return null;
  }
}
