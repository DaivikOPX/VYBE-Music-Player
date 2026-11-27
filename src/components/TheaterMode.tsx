import React, { useState, useEffect, useRef } from 'react';
import {
  Minimize2,
  Music,
  Sliders,
  ListMusic,
  Volume2,
  VolumeX,
  Volume1,
  Disc,
  X,
  Trash2,
  Mic2,
  Layers,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { TheaterVisualizer } from './TheaterVisualizer';
import {
  Play16Icon,
  Pause16Icon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  SpotifyLogoIcon,
} from './SpotifyIcons';
import { TiltedCard, BlurText, ShinyText, ClickSpark, Aurora } from './reactbits';

const formatTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const TheaterMode: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    seek,
    togglePlay,
    nextTrack,
    prevTrack,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    queue,
    removeFromQueue,
    clearQueue,
    playTrack,
    settings,
    updateAudioSettings,
    setEqPreset,
    activeAccentColor,
    setIsTheaterMode,
    getFrequencyData,
  } = usePlayer();

  // Primary theater presentation mode (Default: 'vinyl')
  const [viewMode, setViewMode] = useState<'vinyl' | 'card' | 'lyrics'>('vinyl');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAudioFxOpen, setIsAudioFxOpen] = useState(false);

  // Real-time Bass Transient Energy for Bass-Reactive Spring Bump
  const [bassScale, setBassScale] = useState(1);
  const bassBinsRef = useRef(new Uint8Array(32));

  // Karaoke lyric refs
  const theaterLyricsContainerRef = useRef<HTMLDivElement>(null);
  const theaterLineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const theaterScrollRafRef = useRef<number | null>(null);

  // Active synced lyric index
  const activeLyricIdx = (() => {
    if (viewMode !== 'lyrics' || !currentTrack?.lyrics?.length) return -1;
    const lyrics = currentTrack.lyrics;
    const offset = currentTrack.lyricsOffsetSec || 0;
    const effectiveTime = currentTime + offset;
    for (let i = 0; i < lyrics.length; i++) {
      const line = lyrics[i];
      if (line.time < 0) continue;
      const nextSynced = lyrics.slice(i + 1).find(l => l.time >= 0)?.time ?? Infinity;
      if (effectiveTime >= line.time && effectiveTime < nextSynced) return i;
    }
    return -1;
  })();

  // Physics-based smooth scroll active lyric in theater mode
  useEffect(() => {
    if (viewMode !== 'lyrics' || activeLyricIdx < 0) return;
    const container = theaterLyricsContainerRef.current;
    const lineEl = theaterLineRefs.current[activeLyricIdx];
    if (!container || !lineEl) return;

    const targetY = Math.max(
      0,
      lineEl.offsetTop - (container.clientHeight / 2) + (lineEl.clientHeight / 2)
    );
    const startY = container.scrollTop;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    if (theaterScrollRafRef.current) cancelAnimationFrame(theaterScrollRafRef.current);
    const startTime = performance.now();
    const duration = 520;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      container.scrollTop = startY + distance * easeOutCubic(progress);
      if (progress < 1) {
        theaterScrollRafRef.current = requestAnimationFrame(step);
      } else {
        theaterScrollRafRef.current = null;
      }
    };
    theaterScrollRafRef.current = requestAnimationFrame(step);
  }, [viewMode, activeLyricIdx, currentTrack?.id]);

  // Bass-Reactive Audio Spring Bump (reads Web Audio sub-bass frequencies 0-4)
  useEffect(() => {
    let raf = 0;
    const checkBass = () => {
      if (isPlaying && getFrequencyData) {
        const hasData = getFrequencyData(bassBinsRef.current);
        if (hasData) {
          let energy = 0;
          for (let i = 0; i < 4; i++) {
            energy += bassBinsRef.current[i];
          }
          const norm = energy / (4 * 255);
          // Spring scale between 1.00 and 1.032 based on sub-bass punch
          setBassScale(1 + norm * 0.032);
        } else {
          setBassScale(1);
        }
      } else {
        setBassScale(1);
      }
      raf = requestAnimationFrame(checkBass);
    };

    raf = requestAnimationFrame(checkBass);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, getFrequencyData]);

  if (!currentTrack) return null;

  const accentHex =
    currentTrack.accentColor && currentTrack.accentColor !== '#282828'
      ? currentTrack.accentColor
      : activeAccentColor || '#1ed760';

  const visualizerStyle = settings.visualizerStyle || 'bars';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between p-5 sm:p-8 md:p-10 select-none overflow-hidden"
      style={{
        background: settings.amoledMode
          ? '#000000'
          : `radial-gradient(circle at 40% 35%, ${accentHex}38 0%, #08080a 78%)`,
      }}
    >
      {/* Background Animated Aurora Glow */}
      {!settings.amoledMode && settings.animationsEnabled !== false && (
        <Aurora
          colorStops={[accentHex, activeAccentColor, '#08080a']}
          className="opacity-45 pointer-events-none transition-opacity duration-700"
        />
      )}

      {/* Top Header Bar (Always visible with buttery microanimations) */}
      <div className="flex items-center justify-between relative z-20 gap-4">
        {/* Brand logo & title */}
        <div className="flex items-center gap-2.5 text-white/90">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md shadow-inner">
            <SpotifyLogoIcon size={22} className="text-white" />
          </div>
          <ShinyText text="Theater Mode" className="font-extrabold text-sm tracking-wider uppercase hidden sm:inline" />
        </div>

        {/* Center Presentation Switcher: Vinyl Turntable vs 3D Album Art vs Lyrics */}
        <div className="flex items-center bg-black/50 backdrop-blur-2xl p-1 rounded-full border border-white/15 shadow-2xl gap-1 text-xs font-bold">
          <button
            onClick={() => setViewMode('vinyl')}
            className={`px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'vinyl'
                ? 'bg-spotify-green text-black shadow-lg scale-102'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Disc size={14} className={viewMode === 'vinyl' && isPlaying ? 'animate-spin' : ''} />
            <span>Vinyl</span>
          </button>

          <button
            onClick={() => setViewMode('card')}
            className={`px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'card'
                ? 'bg-white text-black shadow-lg scale-102'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers size={14} />
            <span>3D Art</span>
          </button>

          <button
            onClick={() => setViewMode('lyrics')}
            className={`px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'lyrics'
                ? 'bg-white text-black shadow-lg scale-102'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Mic2 size={14} />
            <span>Lyrics</span>
          </button>
        </div>

        {/* Right Controls: Visualizer Selector, Audio FX, Queue, and Exit */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Visualizer Style Dropdown/Pills */}
          <div className="hidden lg:flex items-center bg-black/45 backdrop-blur-md rounded-full p-1 border border-white/10 text-[11px] font-medium text-white/70 shadow-lg">
            {(['bars', 'fluid', 'waveform', 'radial', 'particles'] as const).map(style => (
              <button
                key={style}
                onClick={() => updateAudioSettings({ visualizerStyle: style })}
                className={`px-2.5 py-0.5 rounded-full capitalize transition-all duration-200 cursor-pointer ${
                  visualizerStyle === style
                    ? 'bg-spotify-green text-black font-bold shadow'
                    : 'hover:text-white hover:bg-white/5'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Audio FX Button */}
          <button
            onClick={() => {
              setIsAudioFxOpen(p => !p);
              setIsQueueOpen(false);
            }}
            title="Audio Equalizer & Sound Effects"
            className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 border shadow-lg ${
              isAudioFxOpen
                ? 'bg-spotify-green text-black border-spotify-green scale-105'
                : 'bg-black/45 hover:bg-white/20 border-white/10 text-white hover:scale-105'
            }`}
          >
            <Sliders size={16} />
          </button>

          {/* Queue Peeker Button */}
          <button
            onClick={() => {
              setIsQueueOpen(p => !p);
              setIsAudioFxOpen(false);
            }}
            title="Up Next Queue"
            className={`px-3 h-9 rounded-full flex items-center gap-1.5 cursor-pointer transition-all duration-200 border text-xs font-bold shadow-lg ${
              isQueueOpen
                ? 'bg-white text-black border-white scale-105'
                : 'bg-black/45 hover:bg-white/20 border-white/10 text-white hover:scale-105'
            }`}
          >
            <ListMusic size={16} />
            <span className="hidden md:inline">Queue</span>
            {queue.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-spotify-green text-black text-[10px] flex items-center justify-center font-black">
                {queue.length}
              </span>
            )}
          </button>

          {/* Exit Full Screen */}
          <button
            onClick={() => setIsTheaterMode(false)}
            title="Exit Theater Mode (Esc or F)"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Audio FX Popover */}
      {isAudioFxOpen && (
        <div className="absolute top-20 right-6 sm:right-10 z-40 w-72 bg-[#181818]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Sliders size={15} className="text-spotify-green" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Audio Tools & EQ</h4>
            </div>
            <button
              onClick={() => setIsAudioFxOpen(false)}
              className="text-white/60 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-white/60 uppercase mb-2">Equalizer Presets</p>
              <div className="grid grid-cols-2 gap-1.5">
                {['Flat', 'Bass Boost', 'Acoustic', 'Electronic', 'Rock', 'Vocal'].map(pName => (
                  <button
                    key={pName}
                    onClick={() => setEqPreset(pName)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      settings.eqPreset === pName
                        ? 'bg-spotify-green text-black font-bold shadow'
                        : 'bg-white/5 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    {pName}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/70">Playback Speed</span>
                <span className="text-spotify-green font-bold">
                  {settings.playbackRate || 1}x
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.75, 1.0, 1.25, 1.5].map(rate => (
                  <button
                    key={rate}
                    onClick={() => updateAudioSettings({ playbackRate: rate })}
                    className={`py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      (settings.playbackRate || 1) === rate
                        ? 'bg-spotify-green text-black shadow'
                        : 'bg-white/10 hover:bg-white/15 text-white/80'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Up Next Queue Peeker Drawer */}
      {isQueueOpen && (
        <div className="absolute top-20 right-6 sm:right-10 z-40 w-80 max-h-[60vh] bg-[#181818]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl text-white flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
            <div className="flex items-center gap-2">
              <ListMusic size={16} className="text-spotify-green" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Up Next ({queue.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsQueueOpen(false)}
                className="text-white/60 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto no-scrollbar space-y-1.5 flex-1 pr-1">
            {queue.length === 0 ? (
              <p className="text-xs text-white/50 text-center py-8">Queue is empty</p>
            ) : (
              queue.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  onClick={() => playTrack(track, queue, null)}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] text-white/40 font-mono w-4 text-center">
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded bg-[#282828] overflow-hidden shrink-0">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={14} className="text-white/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{track.title}</p>
                      <p className="text-[11px] text-white/60 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      removeFromQueue(i);
                    }}
                    className="p-1 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Remove from queue"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Center Stage */}
      {viewMode === 'vinyl' ? (
        /* High-End Realistic Spinning Vinyl Turntable Deck */
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 max-w-5xl mx-auto w-full my-auto relative z-10 px-4">
          {/* Turntable Platter Deck with Stylus Tonearm */}
          <div
            className="relative shrink-0 flex items-center justify-center"
            style={{
              transform: `scale(${bassScale})`,
              transition: 'transform 90ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            {/* Turntable Base Chassis / Platter */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl bg-[#141416]/95 border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-4 sm:p-5 flex items-center justify-center overflow-visible backdrop-blur-xl">
              {/* Circular Recessed Platter Well */}
              <div
                className="w-full h-full rounded-full flex items-center justify-center relative shadow-inner border border-white/10"
                style={{
                  background: 'radial-gradient(circle, #0a0a0c 0%, #151518 70%, #0d0d10 100%)',
                  boxShadow: `0 0 45px ${accentHex}33, inset 0 0 25px rgba(0,0,0,0.9)`,
                }}
              >
                {/* 12" LP Grooved Vinyl Disc */}
                <div
                  className={`w-[90%] h-[90%] rounded-full shadow-2xl relative flex items-center justify-center ${
                    isPlaying ? 'animate-vinyl-spin' : 'animate-vinyl-spin-paused'
                  }`}
                  style={{
                    background:
                      'repeating-radial-gradient(circle, #1a1a1e, #1a1a1e 2px, #0c0c0e 3px, #0c0c0e 6px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.95), inset 0 0 30px rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Holographic Light Reflection Sheen Overlays */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none opacity-40"
                    style={{
                      background:
                        'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.18) 50deg, transparent 100deg, rgba(255,255,255,0.18) 230deg, transparent 280deg)',
                    }}
                  />

                  {/* Center Record Label Artwork Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl relative flex items-center justify-center">
                    {currentTrack.coverUrl ? (
                      <img
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: accentHex }}
                      >
                        <Music size={32} className="text-black" />
                      </div>
                    )}
                    {/* Metal Spindle Center Ring */}
                    <div className="w-5 h-5 rounded-full bg-[#18181b] border-2 border-white/80 absolute z-10 shadow-lg" />
                  </div>
                </div>

                {/* Turntable Stylus Tonearm (Pivots onto record when playing, rests when paused) */}
                <div
                  className="absolute -top-3 -right-2 sm:-top-4 sm:-right-3 z-30 pointer-events-none"
                  style={{
                    transformOrigin: '24px 24px',
                    transform: isPlaying ? 'rotate(32deg)' : 'rotate(0deg)',
                    transition: 'transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {/* Pivot Base */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#444] via-[#222] to-[#111] border border-white/30 shadow-2xl flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-[#111] border border-white/40 shadow-inner" />
                  </div>

                  {/* Chrome Curved Tonearm Rod */}
                  <div
                    className="w-1.5 h-36 sm:h-44 md:h-52 bg-gradient-to-b from-[#888] via-[#e5e5e5] to-[#777] rounded-full shadow-lg ml-[21px] -mt-1 origin-top"
                    style={{
                      transform: 'rotate(8deg)',
                    }}
                  >
                    {/* Stylus Cartridge & Needle Head */}
                    <div className="absolute -bottom-2 -left-2.5 w-6 h-9 rounded-sm bg-[#1c1c20] border border-white/30 shadow-xl flex flex-col items-center justify-between p-1">
                      <div className="w-2.5 h-1.5 bg-spotify-green rounded-full shadow-[0_0_8px_#1ed760]" />
                      <div className="w-1 h-3 bg-white/80 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accompanying 3D Vinyl Sleeve Jacket (Tucked beside the deck) */}
            <div
              onClick={() => setViewMode('card')}
              title="Click to view 3D Card Art"
              className="hidden lg:block absolute -left-16 bottom-2 w-36 h-36 rounded-xl bg-[#202020] shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/15 overflow-hidden -rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer z-0"
            >
              {currentTrack.coverUrl ? (
                <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={36} className="text-white/40" />
                </div>
              )}
            </div>
          </div>

          {/* Stage Right: Track Details & Interactive Playback Controls */}
          <div className="text-center md:text-left min-w-0 flex-1 w-full max-w-xl">
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-spotify-green bg-spotify-green/15 px-3 py-1 rounded-full border border-spotify-green/25 mb-3 shadow-inner">
              Now Spinning • 33 RPM
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-2 truncate drop-shadow-md">
              <BlurText text={currentTrack.title} />
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/80 font-medium mb-6 truncate">
              {currentTrack.artist} • {currentTrack.album}
            </p>

            {/* Scrubber Progress Bar */}
            <div className="w-full flex items-center gap-3 text-xs text-white/70 font-mono mb-6">
              <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div className="flex-1 relative flex items-center group cursor-pointer h-4">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.1}
                  value={currentTime}
                  onChange={e => seek(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-spotify-green hover:h-2 transition-all"
                />
              </div>
              <span className="w-10 tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* Fluid Playback Controls */}
            <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-6 flex-wrap">
              <button
                onClick={toggleShuffle}
                title="Toggle Shuffle"
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer relative hover:scale-110 active:scale-90 ${
                  isShuffle ? 'text-spotify-green' : 'text-white/60 hover:text-white'
                }`}
              >
                <ShuffleIcon size={22} />
                {isShuffle && (
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2 shadow-[0_0_6px_#1ed760]" />
                )}
              </button>

              <button
                onClick={prevTrack}
                title="Previous track"
                className="p-2 text-white/80 hover:text-white hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <SkipBackIcon size={26} />
              </button>

              <ClickSpark sparkColor={accentHex}>
                <button
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    boxShadow: isPlaying
                      ? `0 0 35px ${accentHex}99, 0 10px 30px rgba(0,0,0,0.6)`
                      : '0 10px 30px rgba(0,0,0,0.6)',
                  }}
                  className="w-16 h-16 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-2xl"
                >
                  {isPlaying ? (
                    <Pause16Icon size={26} />
                  ) : (
                    <Play16Icon size={26} className="ml-1" />
                  )}
                </button>
              </ClickSpark>

              <button
                onClick={nextTrack}
                title="Next track"
                className="p-2 text-white/80 hover:text-white hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <SkipForwardIcon size={26} />
              </button>

              <button
                onClick={cycleRepeat}
                title="Cycle Repeat"
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer relative hover:scale-110 active:scale-90 ${
                  repeatMode !== 'off' ? 'text-spotify-green' : 'text-white/60 hover:text-white'
                }`}
              >
                <RepeatIcon size={22} />
                {repeatMode !== 'off' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2 shadow-[0_0_6px_#1ed760]" />
                )}
                {repeatMode === 'one' && (
                  <span className="text-[10px] font-bold absolute -top-1 -right-1 text-spotify-green">
                    1
                  </span>
                )}
              </button>

              {/* In-Bar Volume Slider (No accidental mouse wheel scrolling) */}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-md">
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="text-white/70 hover:text-white cursor-pointer transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={18} className="text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 size={18} />
                  ) : (
                    <Volume2 size={18} className="text-spotify-green" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={e => {
                    if (isMuted) toggleMute();
                    setVolume(Number(e.target.value));
                  }}
                  className="w-16 sm:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-spotify-green hover:h-1.5 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'card' ? (
        /* 3D Tilted Card Stage with Bass Spring Bounce */
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 max-w-5xl mx-auto w-full my-auto relative z-10 px-4">
          <div
            style={{
              transform: `scale(${bassScale})`,
              transition: 'transform 90ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            className="shrink-0"
          >
            <TiltedCard
              rotateAmplitude={8}
              scaleOnHover={1.03}
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl bg-[#282828] flex items-center justify-center overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/10 cursor-pointer"
            >
              {currentTrack.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music size={80} className="text-spotify-muted" />
              )}
            </TiltedCard>
          </div>

          {/* Track Details & Controls */}
          <div className="text-center md:text-left min-w-0 flex-1 w-full max-w-xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-2 truncate drop-shadow-md">
              <BlurText text={currentTrack.title} />
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/80 font-medium mb-6 truncate">
              {currentTrack.artist} • {currentTrack.album}
            </p>

            {/* Scrubber Progress Bar */}
            <div className="w-full flex items-center gap-3 text-xs text-white/70 font-mono mb-6">
              <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div className="flex-1 relative flex items-center group cursor-pointer h-4">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.1}
                  value={currentTime}
                  onChange={e => seek(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-spotify-green hover:h-2 transition-all"
                />
              </div>
              <span className="w-10 tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-6 flex-wrap">
              <button
                onClick={toggleShuffle}
                title="Toggle Shuffle"
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer relative hover:scale-110 active:scale-90 ${
                  isShuffle ? 'text-spotify-green' : 'text-white/60 hover:text-white'
                }`}
              >
                <ShuffleIcon size={22} />
                {isShuffle && (
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2 shadow-[0_0_6px_#1ed760]" />
                )}
              </button>

              <button
                onClick={prevTrack}
                title="Previous track"
                className="p-2 text-white/80 hover:text-white hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <SkipBackIcon size={26} />
              </button>

              <ClickSpark sparkColor={accentHex}>
                <button
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    boxShadow: isPlaying
                      ? `0 0 35px ${accentHex}99, 0 10px 30px rgba(0,0,0,0.6)`
                      : '0 10px 30px rgba(0,0,0,0.6)',
                  }}
                  className="w-16 h-16 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-2xl"
                >
                  {isPlaying ? (
                    <Pause16Icon size={26} />
                  ) : (
                    <Play16Icon size={26} className="ml-1" />
                  )}
                </button>
              </ClickSpark>

              <button
                onClick={nextTrack}
                title="Next track"
                className="p-2 text-white/80 hover:text-white hover:scale-115 active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <SkipForwardIcon size={26} />
              </button>

              <button
                onClick={cycleRepeat}
                title="Cycle Repeat"
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer relative hover:scale-110 active:scale-90 ${
                  repeatMode !== 'off' ? 'text-spotify-green' : 'text-white/60 hover:text-white'
                }`}
              >
                <RepeatIcon size={22} />
                {repeatMode !== 'off' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2 shadow-[0_0_6px_#1ed760]" />
                )}
                {repeatMode === 'one' && (
                  <span className="text-[10px] font-bold absolute -top-1 -right-1 text-spotify-green">
                    1
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-md">
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="text-white/70 hover:text-white cursor-pointer transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={18} className="text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 size={18} />
                  ) : (
                    <Volume2 size={18} className="text-spotify-green" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={e => {
                    if (isMuted) toggleMute();
                    setVolume(Number(e.target.value));
                  }}
                  className="w-16 sm:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-spotify-green hover:h-1.5 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Synced Real-Time Lyrics View with Zero-Reflow GPU Typography */
        <div
          ref={theaterLyricsContainerRef}
          className="max-w-4xl mx-auto w-full flex-1 my-auto overflow-y-auto px-6 py-8 relative z-10 space-y-8 text-center select-text no-scrollbar max-h-[60vh]"
        >
          {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (
            currentTrack.lyrics.map((line, idx) => {
              const isActive = idx === activeLyricIdx;
              const isPast = activeLyricIdx >= 0 && idx < activeLyricIdx;
              const lineIsSynced = line.time >= 0;
              const offset = currentTrack.lyricsOffsetSec || 0;
              const effTime = currentTime + offset;
              const isUpcoming =
                !isActive &&
                !isPast &&
                lineIsSynced &&
                line.time > effTime &&
                line.time - effTime <= 1.5;

              let lineShadow = '0 0 0px transparent, 0 0 0px transparent';
              let lineTransform = 'scale(0.96)';
              let lineOpacity = 0.28;
              let lineBlur = 'blur(0.6px)';
              let lineFontWeight = 700;

              if (isActive) {
                lineShadow = `0 0 35px rgba(255, 255, 255, 0.8), 0 0 70px ${currentTrack.accentColor || '#1ed760'}bb`;
                lineTransform = 'scale(1.05)';
                lineOpacity = 1;
                lineBlur = 'blur(0px)';
                lineFontWeight = 900;
              } else if (isUpcoming) {
                lineShadow = `0 0 15px rgba(255, 255, 255, 0.35), 0 0 30px ${currentTrack.accentColor || '#1ed760'}55`;
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
                  key={idx}
                  ref={el => { theaterLineRefs.current[idx] = el; }}
                  onClick={() => {
                    if (lineIsSynced) seek(Math.max(0, line.time - offset));
                  }}
                  style={{
                    transformOrigin: 'center center',
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
                  className={`text-2xl sm:text-3xl md:text-5xl leading-[1.38] select-none text-white ${
                    lineIsSynced ? 'cursor-pointer hover:opacity-90' : ''
                  }`}
                >
                  {line.text || '♪'}
                </p>
              );
            })
          ) : (
            <div className="py-16 space-y-4">
              <Mic2 size={48} className="mx-auto text-spotify-muted" />
              <p className="text-xl font-bold text-white">No Synced Lyrics Available</p>
              <button
                onClick={() => setViewMode('vinyl')}
                className="px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 cursor-pointer shadow-lg transition-transform"
              >
                View Vinyl Turntable
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Audio Visualizer Bar */}
      <div className="relative z-10 w-full max-w-4xl mx-auto pt-4">
        {settings.showVisualizer !== false && (
          <TheaterVisualizer
            accentColor={currentTrack.accentColor}
            height={visualizerStyle === 'radial' ? 120 : 80}
            className={`w-full ${visualizerStyle === 'radial' ? 'h-28' : 'h-18'} opacity-95`}
          />
        )}
      </div>
    </div>
  );
};
