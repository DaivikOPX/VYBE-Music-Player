/**
 * Cover Art Service
 * Fetches high-resolution cover artwork for local music files using public, free APIs:
 * 1. Apple Music / iTunes Search API (fast, 600x600 to 1000x1000, zero keys required)
 * 2. MusicBrainz / Cover Art Archive (open-source database fallback)
 */

export interface CoverArtMatch {
  coverUrl: string;
  albumName: string;
  artistName: string;
  trackTitle?: string;
  genre?: string;
  releaseYear?: number;
  trackNumber?: number;
  source: 'itunes' | 'musicbrainz';
}

// In-memory cache to prevent duplicate network searches across the app session
const coverArtCache = new Map<string, CoverArtMatch | null>();

/**
 * Checks if an artist name is generic/missing
 */
export function isGenericArtist(artist?: string): boolean {
  if (!artist) return true;
  const a = artist.trim().toLowerCase();
  return (
    !a ||
    a === 'unknown artist' ||
    a === 'unknown' ||
    a === 'various artists' ||
    a === 'various' ||
    a === 'various artist' ||
    a === 'artist' ||
    a === 'track'
  );
}

/**
 * Checks if an album name is generic/missing
 */
export function isGenericAlbum(album?: string): boolean {
  if (!album) return true;
  const a = album.trim().toLowerCase();
  return (
    !a ||
    a === 'local files' ||
    a === 'unknown album' ||
    a === 'unknown' ||
    a === 'music' ||
    a === 'download' ||
    a === 'downloads' ||
    a === 'audio' ||
    a === 'songs' ||
    a === 'new folder'
  );
}

/**
 * Checks if a track title is generic, unformatted, or ripped with junk
 */
export function isMessyOrGenericTitle(title?: string): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  if (
    !t ||
    t === 'unknown' ||
    t === 'unknown track' ||
    t === 'audio' ||
    t === 'sound' ||
    t === 'untitled' ||
    t === 'track' ||
    /^track\s*\d+$/i.test(t) ||
    /^\d+[\s.-]+track/i.test(t)
  ) {
    return true;
  }
  // Check if it ends in raw file extension (.mp3, .flac, etc.)
  if (/\.(mp3|flac|wav|m4a|aac|ogg|opus)$/i.test(title)) return true;
  // Check if it starts with track number like "01 - " or "01. "
  if (/^\d{1,3}[\s.-]+[a-zA-Z]/i.test(title)) return true;
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
  clean = clean.replace(/\.(mp3|flac|wav|m4a|aac|ogg|wma|opus)$/i, '');

  // Strip leading track numbers like "01 - ", "01. ", "01 ", "1 - "
  clean = clean.replace(/^\s*\d+[\s.-]+/, '');

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
 * Searches online for high-res album art matching an artist, album, or track title.
 */
export async function fetchOnlineCoverArt(params: {
  artist: string;
  album?: string;
  title?: string;
}): Promise<CoverArtMatch | null> {
  const rawArtist = (params.artist || '').trim();
  const rawAlbum = (params.album || '').trim();
  const rawTitle = (params.title || '').trim();

  const cleanArtist = isGenericArtist(rawArtist) ? '' : rawArtist;
  const cleanAlbum = isGenericAlbum(rawAlbum) ? '' : rawAlbum;
  const cleanTitle = sanitizeTrackTitle(rawTitle);

  if (!cleanArtist && !cleanAlbum && !cleanTitle) return null;

  const cacheKey = `${cleanArtist.toLowerCase()}::${cleanAlbum.toLowerCase()}::${cleanTitle.toLowerCase()}`;
  if (coverArtCache.has(cacheKey)) {
    return coverArtCache.get(cacheKey) || null;
  }

  // 1. Try iTunes Album Search first (most accurate for complete albums)
  if (cleanArtist && cleanAlbum) {
    try {
      const term = cleanQuery(`${cleanArtist} ${cleanAlbum}`);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=4`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const match = data.results[0];
          if (match.artworkUrl100) {
            const highResUrl = match.artworkUrl100.replace('100x100bb', '1000x1000bb');
            const result: CoverArtMatch = {
              coverUrl: highResUrl,
              albumName: match.collectionName || cleanAlbum,
              artistName: match.artistName || cleanArtist,
              trackTitle: match.trackName || cleanTitle || undefined,
              genre: match.primaryGenreName || undefined,
              trackNumber: typeof match.trackNumber === 'number' ? match.trackNumber : undefined,
              releaseYear: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
              source: 'itunes',
            };
            coverArtCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (err) {
      console.warn('iTunes album cover search failed:', err);
    }
  }

  // 2. Try iTunes Song / Track Search (with artist + title or clean album)
  if (cleanArtist && (cleanTitle || cleanAlbum)) {
    try {
      const term = cleanQuery(`${cleanArtist} ${cleanTitle || cleanAlbum}`);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=4`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const match = data.results[0];
          if (match.artworkUrl100) {
            const highResUrl = match.artworkUrl100.replace('100x100bb', '1000x1000bb');
            const result: CoverArtMatch = {
              coverUrl: highResUrl,
              albumName: match.collectionName || cleanAlbum,
              artistName: match.artistName || cleanArtist,
              trackTitle: match.trackName || cleanTitle || undefined,
              genre: match.primaryGenreName || undefined,
              trackNumber: typeof match.trackNumber === 'number' ? match.trackNumber : undefined,
              releaseYear: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
              source: 'itunes',
            };
            coverArtCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (err) {
      console.warn('iTunes track cover search failed:', err);
    }
  }

  // 3. Try iTunes Search by Clean Title alone (handles songs with Unknown Artist or extracted titles)
  if (cleanTitle) {
    try {
      const term = cleanQuery(cleanTitle);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=4`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const match = data.results[0];
          if (match.artworkUrl100) {
            const highResUrl = match.artworkUrl100.replace('100x100bb', '1000x1000bb');
            const result: CoverArtMatch = {
              coverUrl: highResUrl,
              albumName: match.collectionName || cleanAlbum || match.trackName,
              artistName: match.artistName || cleanArtist,
              trackTitle: match.trackName || cleanTitle || undefined,
              genre: match.primaryGenreName || undefined,
              trackNumber: typeof match.trackNumber === 'number' ? match.trackNumber : undefined,
              releaseYear: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
              source: 'itunes',
            };
            coverArtCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (err) {
      console.warn('iTunes single title search failed:', err);
    }
  }

  // 4. Fallback to MusicBrainz + Cover Art Archive
  if (cleanAlbum) {
    try {
      const mbQuery = cleanArtist
        ? `release:"${cleanAlbum}" AND artist:"${cleanArtist}"`
        : `release:"${cleanAlbum}"`;
      const mbRes = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(mbQuery)}&limit=1&fmt=json`,
        { headers: { Accept: 'application/json', 'User-Agent': 'VYBE-Music-Player/1.0.0 (https://github.com/DaivikOPX/VYBE-Music-Player)' } }
      );
      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const release = mbData.releases?.[0];
        if (release?.id) {
          const caaUrl = `https://coverartarchive.org/release/${release.id}/front-500`;
          const check = await fetch(caaUrl, { method: 'HEAD' });
          if (check.ok) {
            const result: CoverArtMatch = {
              coverUrl: caaUrl,
              albumName: release.title || cleanAlbum,
              artistName: release['artist-credit']?.[0]?.name || cleanArtist,
              source: 'musicbrainz',
            };
            coverArtCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (err) {
      console.warn('MusicBrainz cover search failed:', err);
    }
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
