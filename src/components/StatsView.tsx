import React, { useMemo, useState } from 'react';
import {
  Clock,
  Play,
  Disc3,
  User,
  Music,
  AlertTriangle,
  CopyCheck,
  Trash2,
  RefreshCw,
  Flame,
  SkipForward,
  Calendar,
  Activity,
  Sparkles,
  HardDrive,
  History,
  Copy,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { findDuplicateTrackGroups } from '../utils/playlistUtils';
import { Track } from '../types';
import { SpotlightCard, CountUp, BlurText } from './reactbits';

type StatsTab = 'all' | 'activity' | 'rankings' | 'recap' | 'storage';

const formatDurationHuman = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${s % 60}s`;
  return `${s}s`;
};

const formatBytesHuman = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
};

const formatHourLabel = (hour: number) => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h12} ${suffix}`;
};

const getLocalKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
};

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const StatsView: React.FC = () => {
  const {
    tracks,
    artists,
    albums,
    playCounts,
    recentlyPlayedIds,
    listeningStats,
    missingTrackIds,
    checkMissingFiles,
    removeMissingTracks,
    removeTrackFromLibrary,
    playTrack,
    navigate,
    setSearchQuery,
    showToast,
    settings,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<StatsTab>('all');

  const totalPlays = useMemo(
    () => Object.values(playCounts).reduce((sum, n) => sum + n, 0),
    [playCounts]
  );

  const totalSkips = useMemo(() => {
    const tracked = listeningStats.totalSkips || 0;
    const fromMap = Object.values(listeningStats.skipCounts || {}).reduce((s, n) => s + n, 0);
    return Math.max(tracked, fromMap);
  }, [listeningStats.totalSkips, listeningStats.skipCounts]);

  const avgSessionSec = useMemo(() => {
    const count = listeningStats.sessionCount || 0;
    const total = listeningStats.totalSessionSec || listeningStats.totalListeningSec || 0;
    if (count > 0) return Math.round(total / count);
    return total > 0 ? Math.round(total) : 0;
  }, [listeningStats.sessionCount, listeningStats.totalSessionSec, listeningStats.totalListeningSec]);

  const currentYear = new Date().getFullYear();

  const periodStats = useMemo(() => {
    const now = new Date();
    const todayKey = getLocalKey(now);
    const monthPrefix = todayKey.slice(0, 7);
    const yearPrefix = String(now.getFullYear());
    const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let daily = { sec: 0, plays: 0 };
    let weekly = { sec: 0, plays: 0 };
    let monthly = { sec: 0, plays: 0 };
    let yearly = { sec: 0, plays: 0 };

    for (const [day, entry] of Object.entries(listeningStats.dailyListening || {})) {
      if (day === todayKey) daily = entry;
      const ts = Date.parse(`${day}T12:00:00`);
      if (!Number.isNaN(ts) && ts >= weekCutoff) {
        weekly.sec += entry.sec;
        weekly.plays += entry.plays;
      }
      if (day.startsWith(monthPrefix)) {
        monthly.sec += entry.sec;
        monthly.plays += entry.plays;
      }
      if (day.startsWith(yearPrefix)) {
        yearly.sec += entry.sec;
        yearly.plays += entry.plays;
      }
    }
    return { daily, weekly, monthly, yearly };
  }, [listeningStats.dailyListening]);

  // Streaks & Active Day of Week
  const { currentStreak, longestStreak, weekdayTotals, peakWeekdayIdx, peakMonthLabel } = useMemo(() => {
    const dailyMap = listeningStats.dailyListening || {};
    const activeDays = new Set(
      Object.entries(dailyMap)
        .filter(([, v]) => v.plays > 0 || v.sec >= 5)
        .map(([k]) => k)
    );

    // Current streak ending today or yesterday
    let cur = 0;
    const d = new Date();
    if (!activeDays.has(getLocalKey(d))) {
      d.setDate(d.getDate() - 1);
    }
    while (activeDays.has(getLocalKey(d))) {
      cur += 1;
      d.setDate(d.getDate() - 1);
    }

    // Longest streak across all recorded days
    const sorted = Array.from(activeDays).sort();
    let best = 0;
    let run = 0;
    let prevTs: number | null = null;
    for (const key of sorted) {
      const ts = Date.parse(`${key}T12:00:00`);
      if (prevTs !== null && Math.round((ts - prevTs) / (24 * 60 * 60 * 1000)) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > best) best = run;
      prevTs = ts;
    }

    const wdTotals = Array.from({ length: 7 }, () => ({ sec: 0, plays: 0 }));
    const monthSec: Record<string, number> = {};
    for (const [key, entry] of Object.entries(dailyMap)) {
      const dt = new Date(`${key}T12:00:00`);
      if (!Number.isNaN(dt.getTime())) {
        const wd = dt.getDay();
        wdTotals[wd].sec += entry.sec;
        wdTotals[wd].plays += entry.plays;
        if (key.startsWith(String(currentYear))) {
          const mIdx = dt.getMonth();
          monthSec[MONTH_NAMES[mIdx]] = (monthSec[MONTH_NAMES[mIdx]] || 0) + entry.sec + entry.plays * 10;
        }
      }
    }

    let bestWd = 0;
    let bestWdWeight = -1;
    wdTotals.forEach((w, i) => {
      const wt = w.sec + w.plays * 10;
      if (wt > bestWdWeight) {
        bestWdWeight = wt;
        bestWd = i;
      }
    });

    const topMonth =
      Object.entries(monthSec).sort((a, b) => b[1] - a[1])[0]?.[0] || MONTH_NAMES[new Date().getMonth()];

    return {
      currentStreak: cur,
      longestStreak: Math.max(best, cur),
      weekdayTotals: wdTotals,
      peakWeekdayIdx: bestWdWeight > 0 ? bestWd : null,
      peakMonthLabel: topMonth,
    };
  }, [listeningStats.dailyListening, currentYear]);

  // 16-week (112 days) Heatmap grid organized into 16 columns x 7 rows
  const heatmapWeeks = useMemo(() => {
    const dailyMap = listeningStats.dailyListening || {};
    const today = new Date();
    const totalDays = 16 * 7;
    const start = new Date(today);
    start.setDate(today.getDate() - (totalDays - 1));
    // Align start backwards to Sunday for clean weekday rows
    start.setDate(start.getDate() - start.getDay());

    const weeks: { key: string; sec: number; plays: number; label: string }[][] = [];
    let maxWeight = 1;
    const cursor = new Date(start);

    while (cursor <= today || weeks.length < 16) {
      const col: { key: string; sec: number; plays: number; label: string }[] = [];
      for (let r = 0; r < 7; r++) {
        const k = getLocalKey(cursor);
        const entry = dailyMap[k] || { sec: 0, plays: 0 };
        const w = entry.sec + entry.plays * 10;
        if (w > maxWeight) maxWeight = w;
        col.push({
          key: k,
          sec: entry.sec,
          plays: entry.plays,
          label: `${k}: ${formatDurationHuman(entry.sec)} (${entry.plays} plays)`,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(col);
      if (weeks.length >= 18) break;
    }

    return { weeks, maxWeight };
  }, [listeningStats.dailyListening]);

  // Hourly histogram (0..23)
  const hourlyStats = useMemo(() => {
    const map = listeningStats.hourlyListening || {};
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      sec: map[h]?.sec || 0,
      plays: map[h]?.plays || 0,
    }));
    let peakHour: number | null = null;
    let maxWeight = 0;
    for (const h of hours) {
      const wt = h.sec + h.plays * 10;
      if (wt > maxWeight) {
        maxWeight = wt;
        peakHour = h.hour;
      }
    }
    return { hours, peakHour, maxWeight: Math.max(1, maxWeight) };
  }, [listeningStats.hourlyListening]);

  const topTracks = useMemo(
    () =>
      tracks
        .filter(t => (playCounts[t.id] || 0) > 0)
        .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
        .slice(0, 8),
    [tracks, playCounts]
  );

  const skippedTracks = useMemo(() => {
    const map = listeningStats.skipCounts || {};
    return tracks
      .filter(t => (map[t.id] || 0) > 0)
      .sort((a, b) => (map[b.id] || 0) - (map[a.id] || 0))
      .slice(0, 8);
  }, [tracks, listeningStats.skipCounts]);

  const recentTracks = useMemo(
    () =>
      recentlyPlayedIds
        .map(id => tracks.find(t => t.id === id))
        .filter((t): t is Track => Boolean(t))
        .slice(0, 8),
    [recentlyPlayedIds, tracks]
  );

  const topArtists = useMemo(
    () =>
      artists
        .map(a => ({
          artist: a,
          plays: a.trackIds.reduce((sum, id) => sum + (playCounts[id] || 0), 0),
        }))
        .filter(x => x.plays > 0)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 6),
    [artists, playCounts]
  );

  const topAlbums = useMemo(
    () =>
      albums
        .map(a => ({
          album: a,
          plays: a.trackIds.reduce((sum, id) => sum + (playCounts[id] || 0), 0),
        }))
        .filter(x => x.plays > 0)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 6),
    [albums, playCounts]
  );

  const genreBreakdown = useMemo(() => {
    const map = new Map<string, { plays: number; tracks: number }>();
    for (const t of tracks) {
      const g = (t.genre || 'Uncategorized').trim();
      const cur = map.get(g) || { plays: 0, tracks: 0 };
      cur.tracks += 1;
      cur.plays += playCounts[t.id] || 0;
      map.set(g, cur);
    }
    return Array.from(map.entries())
      .map(([genre, v]) => ({ genre, ...v }))
      .sort((a, b) => b.plays - a.plays || b.tracks - a.tracks)
      .slice(0, 10);
  }, [tracks, playCounts]);

  // Storage Breakdown by Format & Folder
  const storageStats = useMemo(() => {
    let totalBytes = 0;
    let totalDurationSec = 0;
    let bitrateSum = 0;
    let bitrateCount = 0;
    const byFormat = new Map<string, { count: number; bytes: number }>();
    const byFolder = new Map<string, { count: number; bytes: number }>();

    for (const t of tracks) {
      const bytes = t.fileSize || 0;
      totalBytes += bytes;
      totalDurationSec += t.duration || 0;
      if (t.bitrate && t.bitrate > 0) {
        bitrateSum += t.bitrate > 2000 ? Math.round(t.bitrate / 1000) : t.bitrate;
        bitrateCount += 1;
      }

      const fmt = (t.codec || t.sourceKey?.split('.').pop()?.split('::')[0] || 'Audio')
        .toUpperCase()
        .slice(0, 12);
      const curFmt = byFormat.get(fmt) || { count: 0, bytes: 0 };
      curFmt.count += 1;
      curFmt.bytes += bytes;
      byFormat.set(fmt, curFmt);

      let folder = 'Browser / Direct Imports';
      if (t.sourceKey && !t.sourceKey.includes('::')) {
        const parts = t.sourceKey.split(/[\\/]/).filter(Boolean);
        folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Local Drive';
      }
      const curFold = byFolder.get(folder) || { count: 0, bytes: 0 };
      curFold.count += 1;
      curFold.bytes += bytes;
      byFolder.set(folder, curFold);
    }

    return {
      totalBytes,
      totalDurationSec,
      avgBitrate: bitrateCount > 0 ? Math.round(bitrateSum / bitrateCount) : 0,
      formats: Array.from(byFormat.entries())
        .map(([format, v]) => ({ format, ...v }))
        .sort((a, b) => b.bytes - a.bytes || b.count - a.count),
      folders: Array.from(byFolder.entries())
        .map(([folder, v]) => ({ folder, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  }, [tracks]);

  const duplicateGroups = useMemo(() => findDuplicateTrackGroups(tracks), [tracks]);
  const maxGenreWeight = Math.max(1, ...genreBreakdown.map(g => g.plays || g.tracks));
  const maxWeekdayWeight = Math.max(1, ...weekdayTotals.map(w => w.sec + w.plays * 10));
  const baseBg = settings.amoledMode ? '#000000' : '#121212';

  const topGenre = genreBreakdown.find(g => g.genre !== 'Uncategorized') || genreBreakdown[0];
  const peakHourStr =
    hourlyStats.peakHour !== null ? `${formatHourLabel(hourlyStats.peakHour)}` : 'Not enough data';
  const peakDayStr = peakWeekdayIdx !== null ? WEEKDAY_NAMES[peakWeekdayIdx] : 'Not enough data';

  const showSection = (sec: StatsTab) => activeTab === 'all' || activeTab === sec;

  const handleCopyRecap = async () => {
    const lines = [
      `VYBE ${currentYear} Personal Listening Recap`,
      `• Total Time (${currentYear}): ${formatDurationHuman(periodStats.yearly.sec)} (${periodStats.yearly.plays} plays)`,
      `• Lifetime Listening: ${formatDurationHuman(listeningStats.totalListeningSec)} (${totalPlays} plays)`,
      topArtists[0] ? `• Top Artist: ${topArtists[0].artist.name} (${topArtists[0].plays} plays)` : '',
      topTracks[0] ? `• Top Track: ${topTracks[0].title} — ${topTracks[0].artist} (${playCounts[topTracks[0].id]} plays)` : '',
      topAlbums[0] ? `• Top Album: ${topAlbums[0].album.name} (${topAlbums[0].plays} plays)` : '',
      topGenre ? `• Top Genre: ${topGenre.genre}` : '',
      `• Peak Day & Hour: ${peakDayStr} @ ${peakHourStr}`,
      `• Longest Streak: ${longestStreak} day(s) • Skipped: ${totalSkips}`,
    ]
      .filter(Boolean)
      .join('\n');
    const ok = await copyToClipboard(lines);
    showToast(ok ? 'Yearly recap copied to clipboard' : 'Could not copy recap');
  };

  return (
    <div
      className="min-h-full px-4 md:px-8 py-8 pb-20 space-y-8"
      style={{ background: `linear-gradient(to bottom, #1e1b4b, ${baseBg} 280px)` }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-spotify-green">
            100% Offline Listening Analytics
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-1">
            <BlurText text="Listening Statistics & Library Health" />
          </h1>
          <p className="text-xs text-white/70 mt-1">
            All metrics, streaks, heatmaps, yearly recap & storage data are computed locally on your device.
          </p>
        </div>
        <button
          onClick={() => void checkMissingFiles()}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} />
          <span>Verify Library Health</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {(
          [
            { id: 'all', label: 'All Statistics' },
            { id: 'activity', label: 'Heatmap, Streaks & Hours' },
            { id: 'rankings', label: 'Top Charts, Skips & History' },
            { id: 'recap', label: `${currentYear} Year Recap` },
            { id: 'storage', label: 'Storage & Library Health' },
          ] as { id: StatsTab; label: string }[]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'bg-spotify-green text-black'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-spotify-muted flex items-center gap-1.5">
            <Clock size={14} className="text-spotify-green" /> Total Listening Time
          </p>
          <p className="text-2xl font-black text-white mt-1.5">
            {formatDurationHuman(listeningStats.totalListeningSec)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-0.5">Lifetime offline</p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-spotify-muted flex items-center gap-1.5">
            <Play size={14} className="text-spotify-green" /> Total Plays
          </p>
          <p className="text-2xl font-black text-white mt-1.5">
            <CountUp to={totalPlays} />
          </p>
          <p className="text-[11px] text-spotify-muted mt-0.5">{tracks.length} tracks in library</p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-spotify-muted flex items-center gap-1.5">
            <Flame size={14} className="text-orange-400" /> Listening Streak
          </p>
          <p className="text-2xl font-black text-white mt-1.5">
            {currentStreak} <span className="text-sm font-bold text-spotify-muted">days</span>
          </p>
          <p className="text-[11px] text-spotify-muted mt-0.5">Longest: {longestStreak} days</p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-spotify-muted flex items-center gap-1.5">
            <Activity size={14} className="text-sky-400" /> Avg Session
          </p>
          <p className="text-2xl font-black text-white mt-1.5">{formatDurationHuman(avgSessionSec)}</p>
          <p className="text-[11px] text-spotify-muted mt-0.5">
            {listeningStats.sessionCount || 0} recorded sessions
          </p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-spotify-muted flex items-center gap-1.5">
            <SkipForward size={14} className="text-amber-400" /> Skipped Songs
          </p>
          <p className="text-2xl font-black text-white mt-1.5">
            <CountUp to={totalSkips} />
          </p>
          <p className="text-[11px] text-spotify-muted mt-0.5">
            {totalPlays > 0 ? `${Math.round((totalSkips / totalPlays) * 100)}% skip ratio` : '0% skip ratio'}
          </p>
        </SpotlightCard>
      </div>

      {/* Daily / Weekly / Monthly / Yearly Period Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-spotify-muted flex items-center gap-1.5">
            <Calendar size={13} className="text-spotify-green" /> Daily (Today)
          </p>
          <p className="text-xl font-black text-white mt-1.5">
            {formatDurationHuman(periodStats.daily.sec)}
          </p>
          <p className="text-xs text-spotify-green font-semibold mt-0.5">
            {periodStats.daily.plays} plays today
          </p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-spotify-muted flex items-center gap-1.5">
            <Calendar size={13} className="text-spotify-green" /> Weekly (7 Days)
          </p>
          <p className="text-xl font-black text-white mt-1.5">
            {formatDurationHuman(periodStats.weekly.sec)}
          </p>
          <p className="text-xs text-spotify-green font-semibold mt-0.5">
            {periodStats.weekly.plays} plays this week
          </p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-spotify-muted flex items-center gap-1.5">
            <Calendar size={13} className="text-spotify-green" /> Monthly
          </p>
          <p className="text-xl font-black text-white mt-1.5">
            {formatDurationHuman(periodStats.monthly.sec)}
          </p>
          <p className="text-xs text-spotify-green font-semibold mt-0.5">
            {periodStats.monthly.plays} plays this month
          </p>
        </SpotlightCard>

        <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-spotify-muted flex items-center gap-1.5">
            <Calendar size={13} className="text-spotify-green" /> Yearly ({currentYear})
          </p>
          <p className="text-xl font-black text-white mt-1.5">
            {formatDurationHuman(periodStats.yearly.sec)}
          </p>
          <p className="text-xs text-spotify-green font-semibold mt-0.5">
            {periodStats.yearly.plays} plays this year
          </p>
        </SpotlightCard>
      </div>

      {/* Personal Yearly Recap Card */}
      {showSection('recap') && (
        <section className="rounded-2xl p-6 border border-spotify-green/30 bg-gradient-to-br from-[#064e3b]/80 via-[#181818] to-[#312e81]/60 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-spotify-green">
                <Sparkles size={14} /> Personal Yearly Recap
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                Your {currentYear} in Music
              </h2>
            </div>
            <button
              onClick={() => void handleCopyRecap()}
              className="px-4 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={14} />
              <span>Copy Recap Summary</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-black/35 rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] text-spotify-muted uppercase font-bold">#1 Artist</p>
              <p className="text-base font-black text-white truncate mt-1">
                {topArtists[0]?.artist.name || '—'}
              </p>
              <p className="text-xs text-spotify-green">
                {topArtists[0] ? `${topArtists[0].plays} plays` : 'Play songs to unlock'}
              </p>
            </div>

            <div className="bg-black/35 rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] text-spotify-muted uppercase font-bold">#1 Track</p>
              <p className="text-base font-black text-white truncate mt-1">
                {topTracks[0]?.title || '—'}
              </p>
              <p className="text-xs text-spotify-green">
                {topTracks[0] ? `${playCounts[topTracks[0].id]} plays` : 'Play songs to unlock'}
              </p>
            </div>

            <div className="bg-black/35 rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] text-spotify-muted uppercase font-bold">Top Genre & Peak Month</p>
              <p className="text-base font-black text-white truncate mt-1">
                {topGenre ? topGenre.genre : '—'}
              </p>
              <p className="text-xs text-spotify-muted">Peak month: {peakMonthLabel}</p>
            </div>

            <div className="bg-black/35 rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] text-spotify-muted uppercase font-bold">Peak Listening Time</p>
              <p className="text-base font-black text-white truncate mt-1">
                {peakDayStr} • {peakHourStr}
              </p>
              <p className="text-xs text-spotify-muted">Best streak: {longestStreak} days</p>
            </div>
          </div>
        </section>
      )}

      {/* Heatmap, Active Day & Active Hour */}
      {showSection('activity') && (
        <div className="space-y-6">
          <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white">Listening Heatmap (Recent Weeks)</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-spotify-muted">
                <span>Less</span>
                <span className="w-3 h-3 rounded-xs bg-white/10" />
                <span className="w-3 h-3 rounded-xs bg-[#1ed760]/30" />
                <span className="w-3 h-3 rounded-xs bg-[#1ed760]/60" />
                <span className="w-3 h-3 rounded-xs bg-[#1ed760]" />
                <span>More</span>
              </div>
            </div>

            <div className="flex items-start gap-2 overflow-x-auto pb-1">
              <div className="grid grid-rows-7 gap-1.5 text-[10px] text-spotify-muted pr-1 pt-0.5 shrink-0">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="flex gap-1.5">
                {heatmapWeeks.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                    {week.map(day => {
                      const weight = day.sec + day.plays * 10;
                      const ratio = weight / heatmapWeeks.maxWeight;
                      const colorClass =
                        weight === 0
                          ? 'bg-white/10'
                          : ratio < 0.25
                          ? 'bg-[#1ed760]/30'
                          : ratio < 0.6
                          ? 'bg-[#1ed760]/65'
                          : 'bg-[#1ed760]';
                      return (
                        <div
                          key={day.key}
                          title={day.label}
                          className={`w-4 h-4 rounded-xs ${colorClass} transition-transform hover:scale-125`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Active Hour */}
            <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Most Active Listening Hour</h2>
                <span className="text-xs font-bold text-spotify-green bg-spotify-green/15 px-2.5 py-1 rounded-full">
                  Peak: {peakHourStr}
                </span>
              </div>
              <div className="h-32 flex items-end gap-1 pt-2">
                {hourlyStats.hours.map(h => {
                  const weight = h.sec + h.plays * 10;
                  const pct = weight > 0 ? Math.max(8, Math.round((weight / hourlyStats.maxWeight) * 100)) : 4;
                  const isPeak = h.hour === hourlyStats.peakHour;
                  return (
                    <div
                      key={h.hour}
                      title={`${formatHourLabel(h.hour)}: ${formatDurationHuman(h.sec)} (${h.plays} plays)`}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                    >
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t transition-all ${
                          isPeak
                            ? 'bg-spotify-green'
                            : weight > 0
                            ? 'bg-white/45 group-hover:bg-spotify-green/80'
                            : 'bg-white/10'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-spotify-muted font-mono">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
              </div>
            </section>

            {/* Most Active Listening Day */}
            <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Most Active Listening Day</h2>
                <span className="text-xs font-bold text-spotify-green bg-spotify-green/15 px-2.5 py-1 rounded-full">
                  Peak: {peakDayStr}
                </span>
              </div>
              <div className="space-y-2">
                {WEEKDAY_NAMES.map((dayName, idx) => {
                  const entry = weekdayTotals[idx];
                  const weight = entry.sec + entry.plays * 10;
                  const pct = weight > 0 ? Math.max(6, Math.round((weight / maxWeekdayWeight) * 100)) : 0;
                  const isPeak = idx === peakWeekdayIdx;
                  return (
                    <div key={dayName} className="flex items-center gap-3 text-xs">
                      <span className={`w-9 font-bold ${isPeak ? 'text-spotify-green' : 'text-white/80'}`}>
                        {dayName}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPeak ? 'bg-spotify-green' : 'bg-white/55'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-[11px] text-spotify-muted tabular-nums">
                        {formatDurationHuman(entry.sec)} • {entry.plays}p
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Top Charts, Skips, History & Genres */}
      {showSection('rankings') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Music size={16} className="text-spotify-green" /> Most Played Tracks
                </h2>
                <button
                  onClick={() => navigate({ name: 'most-played' })}
                  className="text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
                >
                  Show all
                </button>
              </div>
              {topTracks.length > 0 ? (
                <div className="space-y-2">
                  {topTracks.map((t: Track, i) => (
                    <button
                      key={t.id}
                      onClick={() => playTrack(t, topTracks, null)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-white/10 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {i + 1}. {t.title}
                        </p>
                        <p className="text-[11px] text-spotify-muted truncate">{t.artist}</p>
                      </div>
                      <span className="text-xs font-bold text-spotify-green shrink-0 tabular-nums">
                        {playCounts[t.id]}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">Play tracks to build rankings.</p>
              )}
            </section>

            <section className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User size={16} className="text-spotify-green" /> Most Played Artists
              </h2>
              {topArtists.length > 0 ? (
                <div className="space-y-2">
                  {topArtists.map(({ artist, plays }, i) => (
                    <button
                      key={artist.id}
                      onClick={() => navigate({ name: 'artist', id: artist.id })}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-white/10 text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold text-white truncate">
                        {i + 1}. {artist.name}
                      </span>
                      <span className="text-xs font-bold text-spotify-green shrink-0 tabular-nums">
                        {plays} plays
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">No artist plays recorded yet.</p>
              )}
            </section>

            <section className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Disc3 size={16} className="text-spotify-green" /> Most Played Albums
              </h2>
              {topAlbums.length > 0 ? (
                <div className="space-y-2">
                  {topAlbums.map(({ album, plays }, i) => (
                    <button
                      key={album.id}
                      onClick={() =>
                        navigate({ name: 'album', albumName: album.name, artistName: album.artist })
                      }
                      className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-white/10 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {i + 1}. {album.name}
                        </p>
                        <p className="text-[11px] text-spotify-muted truncate">{album.artist}</p>
                      </div>
                      <span className="text-xs font-bold text-spotify-green shrink-0 tabular-nums">
                        {plays} plays
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">No album plays recorded yet.</p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skipped Songs */}
            <section className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <SkipForward size={16} className="text-amber-400" /> Most Skipped Tracks ({totalSkips} total)
              </h2>
              {skippedTracks.length > 0 ? (
                <div className="space-y-2">
                  {skippedTracks.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => playTrack(t, skippedTracks, null)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-white/10 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {i + 1}. {t.title}
                        </p>
                        <p className="text-[11px] text-spotify-muted truncate">{t.artist}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-300 shrink-0 tabular-nums">
                        {listeningStats.skipCounts?.[t.id]} skips
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">
                  Tracks you skip mid-song appear here automatically.
                </p>
              )}
            </section>

            {/* Recent Listening History */}
            <section className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History size={16} className="text-spotify-green" /> Listening History
                </h2>
                <button
                  onClick={() => navigate({ name: 'recently-played' })}
                  className="text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
                >
                  Full history
                </button>
              </div>
              {recentTracks.length > 0 ? (
                <div className="space-y-2">
                  {recentTracks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => playTrack(t, recentTracks, null)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-white/10 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{t.title}</p>
                        <p className="text-[11px] text-spotify-muted truncate">{t.artist}</p>
                      </div>
                      <span className="text-[11px] text-spotify-muted shrink-0 tabular-nums">
                        {playCounts[t.id] || 1} plays
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">Your recent playback log will appear here.</p>
              )}
            </section>
          </div>

          {/* Favourite Genres Breakdown */}
          <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-white">Favourite Genres Breakdown</h2>
            {genreBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {genreBreakdown.map(g => {
                  const weight = g.plays > 0 ? g.plays : g.tracks;
                  const pct = Math.max(6, Math.round((weight / maxGenreWeight) * 100));
                  return (
                    <button
                      key={g.genre}
                      onClick={() => {
                        if (g.genre !== 'Uncategorized') setSearchQuery(g.genre);
                      }}
                      className="w-full text-left space-y-1 hover:bg-white/5 p-1 rounded cursor-pointer"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">{g.genre}</span>
                        <span className="text-spotify-muted tabular-nums">
                          {g.plays} plays • {g.tracks} tracks
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-spotify-green transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-spotify-muted">Import tracks with genre tags to see breakdown.</p>
            )}
          </section>
        </div>
      )}

      {/* Storage Usage & Library Health */}
      {showSection('storage') && (
        <div className="space-y-6">
          <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive size={16} className="text-spotify-green" /> Storage Usage & Audio Quality
              </h2>
              <span className="text-xs font-mono text-spotify-green">
                {formatBytesHuman(storageStats.totalBytes)} total • {formatDurationHuman(storageStats.totalDurationSec)} audio
                {storageStats.avgBitrate > 0 ? ` • Avg ${storageStats.avgBitrate} kbps` : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-spotify-muted">
                  Storage by Format
                </h3>
                {storageStats.formats.length > 0 ? (
                  <div className="space-y-2">
                    {storageStats.formats.map(f => (
                      <div
                        key={f.format}
                        className="flex items-center justify-between text-xs bg-white/5 px-3 py-2 rounded-lg"
                      >
                        <span className="font-bold text-white">{f.format}</span>
                        <span className="text-spotify-muted tabular-nums">
                          {f.count} {f.count === 1 ? 'track' : 'tracks'} • {formatBytesHuman(f.bytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-spotify-muted">No imported tracks yet.</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-spotify-muted">
                  Storage by Folder / Source
                </h3>
                {storageStats.folders.length > 0 ? (
                  <div className="space-y-2">
                    {storageStats.folders.map(f => (
                      <div
                        key={f.folder}
                        className="flex items-center justify-between gap-3 text-xs bg-white/5 px-3 py-2 rounded-lg"
                      >
                        <span className="font-mono text-white truncate" title={f.folder}>
                          {f.folder}
                        </span>
                        <span className="text-spotify-muted shrink-0 tabular-nums">
                          {f.count} tracks • {formatBytesHuman(f.bytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-spotify-muted">No folders scanned yet.</p>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CopyCheck size={16} className="text-spotify-green" /> Duplicate Tracks ({duplicateGroups.length} groups)
              </h2>
              {duplicateGroups.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {duplicateGroups.map((group, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {group[0].title} — {group[0].artist}
                        </p>
                        <p className="text-[11px] text-spotify-muted">{group.length} copies in library</p>
                      </div>
                      <button
                        onClick={() => group.slice(1).forEach(dup => removeTrackFromLibrary(dup.id))}
                        className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        Keep 1
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">No duplicate tracks detected.</p>
              )}
            </section>

            <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" /> Missing / Broken Paths ({missingTrackIds.length})
                </h2>
                {missingTrackIds.length > 0 && (
                  <button
                    onClick={removeMissingTracks}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} /> Remove All
                  </button>
                )}
              </div>
              {missingTrackIds.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {missingTrackIds.map(id => {
                    const tr = tracks.find(t => t.id === id);
                    if (!tr) return null;
                    return (
                      <div key={id} className="text-xs text-red-300 bg-red-500/10 p-2 rounded truncate">
                        {tr.title} — {tr.sourceKey}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-spotify-muted">
                  No broken paths flagged. Click "Verify Library Health" above anytime to check library files.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
