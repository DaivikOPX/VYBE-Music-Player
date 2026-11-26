import { SmartRuleConfig, Track } from '../types';

export const BUILTIN_SMART_RULES: SmartRuleConfig[] = [
  {
    id: 'smart-recently-added',
    title: 'Recently Added',
    description: 'Latest tracks imported into your library',
    kind: 'recently-added'
  },
  {
    id: 'smart-never-played',
    title: 'Never Played',
    description: 'Unheard tracks waiting in your collection',
    kind: 'never-played'
  },
  {
    id: 'smart-last-7-days',
    title: 'Played Last 7 Days',
    description: 'Songs in your recent weekly rotation',
    kind: 'last-7-days'
  },
  {
    id: 'smart-not-played-30d',
    title: 'Dusty Gems (30+ Days)',
    description: 'Not played in the last 30 days',
    kind: 'not-played-30d'
  },
  {
    id: 'smart-not-played-90d',
    title: 'Deep Vault (90+ Days)',
    description: 'Rediscover songs unplayed for 90+ days',
    kind: 'not-played-90d'
  }
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateSmartRule(
  rule: SmartRuleConfig,
  tracks: Track[],
  playCounts: Record<string, number>,
  lastPlayedMap: Record<string, number>
): Track[] {
  const now = Date.now();

  switch (rule.kind) {
    case 'recently-added':
      return [...tracks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    case 'never-played':
      return tracks.filter(t => (playCounts[t.id] || 0) === 0);

    case 'last-7-days':
      return tracks
        .filter(t => {
          const ts = lastPlayedMap[t.id] ?? t.lastPlayedAt ?? 0;
          return ts > 0 && now - ts <= 7 * DAY_MS;
        })
        .sort((a, b) => (lastPlayedMap[b.id] || 0) - (lastPlayedMap[a.id] || 0));

    case 'not-played-30d':
      return tracks.filter(t => {
        const ts = lastPlayedMap[t.id] ?? t.lastPlayedAt ?? 0;
        return ts === 0 || now - ts >= 30 * DAY_MS;
      });

    case 'not-played-90d':
      return tracks.filter(t => {
        const ts = lastPlayedMap[t.id] ?? t.lastPlayedAt ?? 0;
        return ts === 0 || now - ts >= 90 * DAY_MS;
      });

    case 'custom':
    default:
      return tracks.filter(t => {
        if (rule.artist && !t.artist.toLowerCase().includes(rule.artist.toLowerCase())) {
          return false;
        }
        if (rule.genre && !(t.genre || '').toLowerCase().includes(rule.genre.toLowerCase())) {
          return false;
        }
        if (rule.year && t.year !== rule.year) {
          return false;
        }
        if (rule.maxDurationSec && (t.duration || 0) > rule.maxDurationSec) {
          return false;
        }
        if (rule.codec && !(t.codec || '').toLowerCase().includes(rule.codec.toLowerCase())) {
          return false;
        }
        return true;
      });
  }
}

/**
 * Matches lines of an .m3u / .m3u8 file against tracks currently in the local library.
 * Supports file paths, filenames, and #EXTINF metadata ("Artist - Title").
 */
export function matchM3uTracks(content: string, libraryTracks: Track[]): Track[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== '#EXTM3U');

  const matched: Track[] = [];
  const seenIds = new Set<string>();
  let pendingExtInf = '';

  const addIfMatch = (tr: Track | undefined) => {
    if (tr && !seenIds.has(tr.id)) {
      seenIds.add(tr.id);
      matched.push(tr);
    }
  };

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',');
      pendingExtInf = comma >= 0 ? line.slice(comma + 1).trim().toLowerCase() : '';
      continue;
    }
    if (line.startsWith('#')) continue;

    const normLine = line.replace(/\\/g, '/').toLowerCase();
    const baseName = normLine.split('/').pop() || normLine;

    const byPath = libraryTracks.find(t => {
      const sk = (t.sourceKey || '').replace(/\\/g, '/').toLowerCase();
      if (!sk) return false;
      const skName = sk.includes('::') ? sk.split('::')[0] : sk.split('/').pop() || '';
      return sk === normLine || sk.endsWith('/' + baseName) || skName === baseName;
    });

    if (byPath) {
      addIfMatch(byPath);
    } else if (pendingExtInf) {
      const byMeta = libraryTracks.find(
        t =>
          `${t.artist} - ${t.title}`.toLowerCase() === pendingExtInf ||
          t.title.toLowerCase() === pendingExtInf
      );
      addIfMatch(byMeta);
    }
    pendingExtInf = '';
  }

  return matched;
}

/** Detect duplicate groups in library by normalized artist+title+approx duration */
export function findDuplicateTrackGroups(tracks: Track[]): Track[][] {
  const buckets = new Map<string, Track[]>();
  for (const t of tracks) {
    const key = `${t.title.trim().toLowerCase()}::${t.artist.trim().toLowerCase()}`;
    const arr = buckets.get(key) || [];
    arr.push(t);
    buckets.set(key, arr);
  }
  return Array.from(buckets.values()).filter(g => g.length > 1);
}
