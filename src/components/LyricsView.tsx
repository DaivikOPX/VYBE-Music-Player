import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Music,
  Globe,
  Loader2,
  FileText,
  Pencil,
  Copy,
  Maximize2,
  MoreVertical,
  ChevronDown,
  Sparkles,
  RotateCcw,
  X
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { FluidAurora, ShinyText } from './reactbits';
import { parseLrcText } from '../utils/lrcParser';
import { extractAccentPalette, getSpotifyTrackFallback } from '../utils/colorExtract';

export const LyricsView: React.FC = () => {
  const {
    currentTrack,
    currentTime,
    seek,
    settings,
    isFetchingLyrics,
    fetchLyricsForTrack,
    updateTrackLyrics,
    setIsTheaterMode,
    showToast,
    updateAudioSettings,
    isPlaying,
    activeAccentColor
  } = usePlayer();

  const [lyricsEditOpen, setLyricsEditOpen] = useState(false);
  const [lyricsDraft, setLyricsDraft] = useState('');
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const [coverAccent, setCoverAccent] = useState<string | null>(null);

  const lrcFileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const lyricsOffset = currentTrack?.lyricsOffsetSec || 0;
  const effectiveLyricsTime = currentTime + lyricsOffset;

  // Click outside listener for options menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOptionsMenuOpen(false);
      }
    };
    if (optionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [optionsMenuOpen]);

  // Robust calculation of currently playing line
  const activeLyricIdx = useMemo(() => {
    const lyrics = currentTrack?.lyrics;
    if (!lyrics || lyrics.length === 0) return -1;
    let active = -1;
    let maxTime = -1;
    for (let i = 0; i < lyrics.length; i++) {
      const t = lyrics[i].time;
      if (t >= 0 && t <= effectiveLyricsTime && t >= maxTime) {
        active = i;
        maxTime = t;
      }
    }
    return active;
  }, [currentTrack?.lyrics, effectiveLyricsTime]);

  // Center active lyric into view
  const scrollToActiveLine = useCallback(() => {
    if (activeLyricIdx < 0) return;
    const lineEl = lineRefs.current[activeLyricIdx];
    if (lineEl) {
      lineEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      setUserIsScrolling(false);
    }
  }, [activeLyricIdx]);

  // Handle user manual scroll interaction: pause auto-scroll gracefully
  const handleUserScroll = useCallback(() => {
    setUserIsScrolling(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 4000);
  }, []);

  // Extract cover art accent directly for instantaneous Spotify background tinting
  useEffect(() => {
    let isSubscribed = true;
    if (currentTrack?.coverUrl) {
      extractAccentPalette(currentTrack.coverUrl)
        .then(palette => {
          if (isSubscribed && palette && palette.accentHex && palette.accentHex !== '#1ed760') {
            setCoverAccent(palette.accentHex);
          }
        })
        .catch(() => {});
    } else {
      setCoverAccent(null);
    }
    return () => {
      isSubscribed = false;
    };
  }, [currentTrack?.coverUrl]);

  // Reset user scroll lock when track changes
  useEffect(() => {
    setUserIsScrolling(false);
  }, [currentTrack?.id]);

  // BUTTERY 60FPS SPRING-DAMPED AUTO-SCROLL TO ACTIVE LYRIC AT 40% VIEWPORT HEIGHT
  useEffect(() => {
    if (userIsScrolling || activeLyricIdx < 0) return;
    const lineEl = lineRefs.current[activeLyricIdx];
    const container = scrollContainerRef.current;
    if (!lineEl || !container) return;

    let rafId: number;
    const targetTop = Math.max(
      0,
      lineEl.offsetTop - container.clientHeight * 0.40 + lineEl.clientHeight / 2
    );

    const step = () => {
      const diff = targetTop - container.scrollTop;
      if (Math.abs(diff) < 0.5) {
        container.scrollTop = targetTop;
        return;
      }
      container.scrollTop += diff * 0.11;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [activeLyricIdx, userIsScrolling]);

  // Primary accent color derived from track artwork or deterministic Spotify palette
  const rawAccent = useMemo(() => {
    if (coverAccent && coverAccent !== '#282828' && coverAccent !== '#000000') {
      return coverAccent;
    }
    if (currentTrack?.accentColor && currentTrack.accentColor !== '#282828' && currentTrack.accentColor !== '#000000') {
      return currentTrack.accentColor;
    }
    if (activeAccentColor && activeAccentColor !== '#282828' && activeAccentColor !== '#000000') {
      return activeAccentColor;
    }
    return getSpotifyTrackFallback(currentTrack?.title || '', currentTrack?.artist || '');
  }, [coverAccent, currentTrack?.accentColor, currentTrack?.title, currentTrack?.artist, activeAccentColor]);

  // Dynamic Spotify-style rich colored background matching track album artwork
  const lyricsBackground = useMemo(() => {
    return `radial-gradient(ellipse at 50% 12%, ${rawAccent}e6 0%, ${rawAccent}88 35%, #13131c 78%, #08080c 100%)`;
  }, [rawAccent]);

  // Harmonic color palette for FluidAurora liquid mesh
  const auroraStops = useMemo<[string, string, string, string]>(() => {
    return [
      rawAccent,
      `${rawAccent}cc`,
      '#4f46e5', // Deep indigo harmonic
      '#08080c'  // Deep backdrop
    ];
  }, [rawAccent]);

  if (!currentTrack) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8 text-center text-white/50 space-y-3">
        <Music size={48} className="text-white/20 animate-pulse" />
        <p className="text-lg font-bold text-white/80">No Track Playing</p>
        <p className="text-xs">Play any song from your library to view synced lyrics</p>
      </div>
    );
  }

  const hasLyrics = Boolean(currentTrack.lyrics && currentTrack.lyrics.length > 0);
  const isSynced = Boolean(hasLyrics && currentTrack.lyrics?.some(l => l.time >= 0));

  return (
    <div
      className="h-full flex-1 relative overflow-hidden flex flex-col selection:bg-spotify-green selection:text-black transition-[background] duration-700 ease-out"
      style={{
        background: lyricsBackground,
      }}
    >
      {/* 1. ReactBits Fluid Liquid Aurora Background with track harmony */}
      {settings.animationsEnabled !== false && (
        <FluidAurora colorStops={auroraStops} opacity={0.65} />
      )}

      {/* Hidden file input for loading .lrc/.txt */}
      <input
        ref={lrcFileInputRef}
        type="file"
        accept=".lrc,.txt"
        className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f || !currentTrack) return;
          const text = await f.text().catch(() => '');
          if (text) {
            const parsed = parseLrcText(text);
            updateTrackLyrics(currentTrack.id, parsed, currentTrack.lyricsOffsetSec || 0);
            showToast(`Loaded lyrics from "${f.name}"`);
          }
        }}
      />

      {/* 2. Sleek Floating Glassmorphic Header Bar */}
      <header className="sticky top-0 z-30 px-4 md:px-8 pt-4 pb-3">
        <div className="max-w-4xl mx-auto backdrop-blur-2xl bg-black/40 border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-4 transition-all">
          {/* Left: Album Artwork Squircle & Song Info */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 rounded-xl bg-[#222222] overflow-hidden shadow-lg border border-white/10 shrink-0 group">
              {currentTrack.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-spotify-muted">
                  <Music size={20} />
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 rounded-full bg-spotify-green animate-ping" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-white truncate leading-tight tracking-tight">
                {currentTrack.title}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-medium text-white/70 truncate">{currentTrack.artist}</p>
                {isFetchingLyrics ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white animate-pulse">
                    <Loader2 size={10} className="animate-spin text-spotify-green" />
                    <span>Syncing...</span>
                  </span>
                ) : isSynced ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-spotify-green/20 text-spotify-green border border-spotify-green/30">
                    <Sparkles size={10} />
                    <ShinyText text="Synced Lyrics" className="text-[10px] font-bold" />
                  </span>
                ) : hasLyrics ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    <FileText size={10} />
                    <span>Plain Lyrics</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Consolidated Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Timing Sync Capsule (only if synced lyrics present) */}
            {isSynced && (
              <div className="hidden sm:flex items-center bg-white/10 border border-white/10 rounded-full px-2 py-1 text-[11px] font-bold shadow-inner">
                <button
                  onClick={() =>
                    updateTrackLyrics(
                      currentTrack.id,
                      currentTrack.lyrics || [],
                      Number((lyricsOffset - 0.5).toFixed(1))
                    )
                  }
                  title="Delay lyrics (-0.5s)"
                  className="px-1.5 py-0.5 hover:text-spotify-green active:scale-95 transition-all cursor-pointer rounded"
                >
                  -0.5s
                </button>
                <span className="text-white/80 tabular-nums px-1 text-[10px]">
                  {lyricsOffset === 0 ? 'Sync' : `${lyricsOffset > 0 ? '+' : ''}${lyricsOffset}s`}
                </span>
                <button
                  onClick={() =>
                    updateTrackLyrics(
                      currentTrack.id,
                      currentTrack.lyrics || [],
                      Number((lyricsOffset + 0.5).toFixed(1))
                    )
                  }
                  title="Advance lyrics (+0.5s)"
                  className="px-1.5 py-0.5 hover:text-spotify-green active:scale-95 transition-all cursor-pointer rounded"
                >
                  +0.5s
                </button>
              </div>
            )}

            {/* Options Menu Dropdown Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOptionsMenuOpen(p => !p)}
                title="Lyrics Options"
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  optionsMenuOpen
                    ? 'bg-white/25 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                }`}
              >
                <MoreVertical size={16} />
              </button>

              {/* Glass Dropdown Menu */}
              {optionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#1e1e1e]/95 backdrop-blur-2xl border border-white/15 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  {settings.lyricsSource !== 'local' && (
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        void fetchLyricsForTrack(currentTrack, true);
                      }}
                      disabled={isFetchingLyrics}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Globe size={14} className="text-spotify-green" />
                      <span>{hasLyrics ? 'Re-sync from LRCLIB' : 'Fetch from LRCLIB'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      lrcFileInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="text-spotify-green" />
                    <span>Load .lrc / .txt file</span>
                  </button>

                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      const raw = (currentTrack.lyrics || [])
                        .map(l => {
                          if (l.time < 0) return l.text;
                          const m = Math.floor(l.time / 60);
                          const s = (l.time % 60).toFixed(2).padStart(5, '0');
                          return `[${String(m).padStart(2, '0')}:${s}] ${l.text}`;
                        })
                        .join('\n');
                      setLyricsDraft(raw);
                      setLyricsEditOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Pencil size={14} className="text-spotify-green" />
                    <span>Edit lyrics editor</span>
                  </button>

                  {hasLyrics && (
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        const text = currentTrack.lyrics?.map(l => l.text).join('\n') || '';
                        void navigator.clipboard?.writeText(text).then(() => showToast('Lyrics copied to clipboard'));
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Copy size={14} className="text-spotify-green" />
                      <span>Copy full text</span>
                    </button>
                  )}

                  {isSynced && (
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        updateTrackLyrics(currentTrack.id, currentTrack.lyrics || [], 0);
                        showToast('Reset timing offset to 0s');
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-t border-white/10 mt-1 pt-2"
                    >
                      <RotateCcw size={14} className="text-spotify-green" />
                      <span>Reset timing sync</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Theater / Fullscreen Mode */}
            <button
              onClick={() => setIsTheaterMode(true)}
              title="Fullscreen Theater Mode (F)"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 3. In-Place Lyrics Editor Drawer */}
      {lyricsEditOpen && (
        <div className="relative z-40 px-4 md:px-8 mb-6">
          <div className="max-w-4xl mx-auto p-5 rounded-2xl bg-[#1e1e1e]/95 backdrop-blur-3xl border border-white/15 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-spotify-green" />
                <h3 className="text-sm font-bold text-white">Manual Lyrics Editor</h3>
              </div>
              <button
                onClick={() => setLyricsEditOpen(false)}
                className="text-white/50 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-white/60">
              Paste or type lines below. Use <span className="font-mono text-spotify-green">[mm:ss.xx]</span> timestamps for synced karaoke playback, or leave timestamps out for plain text scrolling.
            </p>
            <textarea
              rows={9}
              value={lyricsDraft}
              onChange={e => setLyricsDraft(e.target.value)}
              placeholder="[00:12.30] I got this feelin' inside my bones..."
              className="w-full bg-[#121212] text-white text-xs p-3.5 rounded-xl border border-white/10 focus:border-spotify-green focus:outline-none font-mono leading-relaxed"
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setLyricsEditOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-white/70 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const parsed = parseLrcText(lyricsDraft);
                  updateTrackLyrics(currentTrack.id, parsed, lyricsOffset);
                  setLyricsEditOpen(false);
                  showToast('Lyrics updated');
                }}
                className="px-5 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold cursor-pointer transition-all active:scale-98 shadow-lg shadow-spotify-green/20"
              >
                Save Lyrics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Scrollable Lyrics Body with Zero-Reflow GPU Typography */}
      <div
        ref={scrollContainerRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        className="flex-1 overflow-y-auto px-6 md:px-16 py-8 relative z-10 custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto">
          {hasLyrics ? (
            <div className="space-y-7 md:space-y-8 pb-40 pt-6">
              {currentTrack.lyrics!.map((line, i) => {
                const lineIsSynced = line.time >= 0;
                const isActive = i === activeLyricIdx;
                const isPast = activeLyricIdx >= 0 && i < activeLyricIdx;
                // Pre-warming anticipation: line about to play within 1.5s
                const isUpcoming =
                  !isActive &&
                  !isPast &&
                  lineIsSynced &&
                  line.time > effectiveLyricsTime &&
                  line.time - effectiveLyricsTime <= 1.5;

                let lineShadow = '0 0 0px transparent, 0 0 0px transparent';
                let lineTransform = 'scale(0.96)';
                let lineOpacity = 0.28;
                let lineBlur = 'blur(0.6px)';
                let lineFontWeight = 700;

                if (isActive) {
                  lineShadow = `0 0 32px rgba(255, 255, 255, 0.8), 0 0 60px ${rawAccent}99`;
                  lineTransform = 'scale(1.04)';
                  lineOpacity = 1;
                  lineBlur = 'blur(0px)';
                  lineFontWeight = 900;
                } else if (isUpcoming) {
                  lineShadow = `0 0 14px rgba(255, 255, 255, 0.35), 0 0 28px ${rawAccent}44`;
                  lineTransform = 'scale(1.01)';
                  lineOpacity = 0.65;
                  lineBlur = 'blur(0.2px)';
                  lineFontWeight = 800;
                } else if (isPast) {
                  lineShadow = '0 0 0px transparent, 0 0 0px transparent';
                  lineTransform = 'scale(0.98)';
                  lineOpacity = 0.40;
                  lineBlur = 'blur(0.35px)';
                  lineFontWeight = 700;
                }

                return (
                  <p
                    key={`${line.time}-${i}`}
                    ref={el => { lineRefs.current[i] = el; }}
                    onClick={() => {
                      if (lineIsSynced) {
                        seek(Math.max(0, line.time - lyricsOffset));
                        setUserIsScrolling(false);
                      }
                    }}
                    style={{
                      transformOrigin: 'left center',
                      fontFamily: 'var(--font-lyrics)',
                      fontWeight: lineFontWeight,
                      letterSpacing: '-0.02em',
                      willChange: 'transform, opacity, filter, text-shadow',
                      transform: lineTransform,
                      opacity: lineOpacity,
                      filter: lineBlur,
                      textShadow: lineShadow,
                      transition:
                        'transform 550ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 450ms cubic-bezier(0.2, 0.9, 0.2, 1), filter 450ms ease, text-shadow 450ms ease, color 450ms ease',
                    }}
                    className={`select-none text-2xl sm:text-3xl md:text-5xl leading-[1.38] text-white ${
                      lineIsSynced ? 'cursor-pointer hover:opacity-90' : ''
                    }`}
                  >
                    {line.text || '♪'}
                  </p>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-24 text-center text-white/80 space-y-6">
              {isFetchingLyrics ? (
                <div className="space-y-4">
                  <Loader2 size={36} className="mx-auto animate-spin text-spotify-green" />
                  <p className="text-xl font-bold text-white">
                    <ShinyText text="Finding synchronized lyrics on LRCLIB..." />
                  </p>
                  <p className="text-xs text-white/50 max-w-sm mx-auto">
                    Matching duration ({Math.round(currentTrack.duration || 0)}s) with global verified database
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-spotify-muted">
                    <Music size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Lyrics Found</h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      We couldn't automatically locate synced lyrics for this song. You can search LRCLIB online, load a local .lrc file, or paste your own lyrics.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {settings.lyricsSource !== 'local' ? (
                      <button
                        onClick={() => void fetchLyricsForTrack(currentTrack, true)}
                        className="px-5 py-2.5 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-spotify-green/20 transition-all active:scale-95"
                      >
                        <Globe size={14} />
                        <span>Search Online via LRCLIB</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          updateAudioSettings({ lyricsSource: 'online' });
                          void fetchLyricsForTrack(currentTrack, true);
                        }}
                        className="px-5 py-2.5 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-spotify-green/20 transition-all active:scale-95"
                      >
                        <Globe size={14} />
                        <span>Enable Online Lyrics</span>
                      </button>
                    )}

                    <button
                      onClick={() => lrcFileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <FileText size={14} />
                      <span>Load .lrc File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Floating "Resume Sync" Pill when user scrolled away */}
      {userIsScrolling && isSynced && activeLyricIdx >= 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={scrollToActiveLine}
            className="px-4 py-2 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 text-white text-xs font-bold flex items-center gap-2 shadow-2xl hover:bg-black/90 active:scale-95 transition-all cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-spotify-green animate-ping" />
            <span>Sync to playback</span>
            <ChevronDown size={14} className="text-spotify-green group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};
