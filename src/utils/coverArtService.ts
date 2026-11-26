/**
 * Cover Art Service
 * Fetches high-resolution cover artwork for local music files using public, free APIs:
 * 1. Apple Music / iTunes Search API (fast, 600x600 to 1200x1200, zero keys required)
 * 2. MusicBrainz / Cover Art Archive (open-source database fallback)
 */

export interface CoverArtMatch {
  coverUrl: string;
  albumName: string;
  artistName: string;
  releaseYear?: number;
  source: 'itunes' | 'musicbrainz';
}

/**
 * Searches online for high-res album art matching an artist and album/track.
 */
export async function fetchOnlineCoverArt(params: {
  artist: string;
  album?: string;
  title?: string;
}): Promise<CoverArtMatch | null> {
  const cleanArtist = (params.artist || '').trim();
  const cleanAlbum = (params.album || '').trim();
  const cleanTitle = (params.title || '').trim();

  if (!cleanArtist && !cleanAlbum && !cleanTitle) return null;

  // 1. Try iTunes Album Search first (most accurate for complete albums)
  if (cleanArtist && cleanAlbum && cleanAlbum.toLowerCase() !== 'unknown album' && cleanAlbum.toLowerCase() !== 'local files') {
    try {
      const term = `${cleanArtist} ${cleanAlbum}`.replace(/[^\w\s]/gi, ' ').trim();
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=4`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const match = data.results[0];
          if (match.artworkUrl100) {
            const highResUrl = match.artworkUrl100.replace('100x100bb', '600x600bb');
            return {
              coverUrl: highResUrl,
              albumName: match.collectionName || cleanAlbum,
              artistName: match.artistName || cleanArtist,
              releaseYear: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
              source: 'itunes',
            };
          }
        }
      }
    } catch (err) {
      console.warn('iTunes album cover search failed:', err);
    }
  }

  // 2. Try iTunes Song / Track Search (great for singles or standalone tracks)
  if (cleanArtist || cleanTitle) {
    try {
      const term = `${cleanArtist} ${cleanTitle || cleanAlbum}`.replace(/[^\w\s]/gi, ' ').trim();
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=4`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const match = data.results[0];
          if (match.artworkUrl100) {
            const highResUrl = match.artworkUrl100.replace('100x100bb', '600x600bb');
            return {
              coverUrl: highResUrl,
              albumName: match.collectionName || cleanAlbum,
              artistName: match.artistName || cleanArtist,
              releaseYear: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
              source: 'itunes',
            };
          }
        }
      }
    } catch (err) {
      console.warn('iTunes track cover search failed:', err);
    }
  }

  // 3. Fallback to MusicBrainz + Cover Art Archive
  if (cleanAlbum && cleanAlbum.toLowerCase() !== 'unknown album') {
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
          // Verify CAA image exists
          const check = await fetch(caaUrl, { method: 'HEAD' });
          if (check.ok) {
            return {
              coverUrl: caaUrl,
              albumName: release.title || cleanAlbum,
              artistName: release['artist-credit']?.[0]?.name || cleanArtist,
              source: 'musicbrainz',
            };
          }
        }
      }
    } catch (err) {
      console.warn('MusicBrainz cover search failed:', err);
    }
  }

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
