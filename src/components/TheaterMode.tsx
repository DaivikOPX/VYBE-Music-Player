import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // Theater Stage Tab & Mode States
  const [stageMode, setStageMode] = useState<'card' | 'vinyl'>('card');
  const [theaterTab, setTheaterTab] = useState<'art' | 'lyrics'>('art');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAudioFxOpen, setIsAudioFxOpen] = useState(false);

  // Cinema Immersion: Auto-hide controls when idle
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Floating Volume Wheel HUD
  const [volumeHud, setVolumeHud] = useState<{ val: number; visible: boolean }>({
    val: volume,
    visible: false,
  });
  const volumeHudTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time Bass Transient Energy for Bass-Reactive Spring Bump
  const [bassScale, setBassScale] = useState(1);
  const bassBinsRef = useRef(new Uint8Array(32));

  // Karaoke lyric ref
  const activeLyricRef = useRef<HTMLParagraphElement>(null);

  // Active synced lyric index
  const activeLyricIdx = (() => {
    if (theaterTab !== 'lyrics' || !currentTrack?.lyrics?.length) return -1;
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

  useEffect(() => {
    if (theaterTab === 'lyrics' && activeLyricIdx >= 0) {
      activeLyricRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [theaterTab, activeLyricIdx, currentTrack?.id]);

  // Reset idle timer on any mouse / touch / key interaction
  const handleUserActivity = useCallback(() => {
    setIsControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isPlaying) {
      idleTimerRef.current = setTimeout(() => {
        // Do not auto-hide if a popover/drawer is open
        if (!isQueueOpen && !isAudioFxOpen) {
          setIsControlsVisible(false);
        }
      }, 3500);
    }
  }, [isPlaying, isQueueOpen, isAudioFxOpen]);

  useEffect(() => {
    handleUserActivity();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isPlaying, handleUserActivity]);

  // Global mouse-wheel volume adjustment with floating HUD
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      handleUserActivity();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const nextVol = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
      setVolume(nextVol);

      setVolumeHud({ val: nextVol, visible: true });
      if (volumeHudTimerRef.current) clearTimeout(volumeHudTimerRef.current);
      volumeHudTimerRef.current = setTimeout(() => {
        setVolumeHud(prev => ({ ...prev, visible: false }));
      }, 1500);
    },
    [volume, setVolume, handleUserActivity]
  );

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
          // Spring scale between 1.00 and 1.035 based on sub-bass punch
          setBassScale(1 + norm * 0.038);
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
      onMouseMove={handleUserActivity}
      onMouseDown={handleUserActivity}
      onKeyDown={handleUserActivity}
      onWheel={handleWheel}
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden"
      style={{
        background: settings.amoledMode
          ? '#000000'
          : `radial-gradient(circle at 35% 35%, ${accentHex}33 0%, #08080a 78%)`,
      }}
    >
      {/* Background Animated Aurora Glow */}
      {!settings.amoledMode && settings.animationsEnabled !== false && (
        <Aurora
          colorStops={[accentHex, activeAccentColor, '#08080a']}
          className="opacity-40 pointer-events-none"
        />
      )}

      {/* Floating Volume Wheel HUD */}
      <div
        className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
          volumeHud.visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-4 scale-95'
        }`}
      >
        <div className="bg-black/80 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-white">
          {volumeHud.val === 0 ? (
            <VolumeX size={18} className="text-red-400" />
          ) : volumeHud.val < 0.5 ? (
            <Volume1 size={18} className="text-white" />
          ) : (
            <Volume2 size={18} className="text-spotify-green" />
          )}
          <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-spotify-green rounded-full transition-all duration-100"
              style={{ width: `${Math.round(volumeHud.val * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold tabular-nums">
            {Math.round(volumeHud.val * 100)}%
          </span>
        </div>
      </div>

      {/* Top Header Bar */}
      <div
        className={`flex items-center justify-between relative z-20 gap-4 transition-all duration-500 ${
          isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 text-white/85">
          <SpotifyLogoIcon size={28} className="text-white" />
          <ShinyText text="Theater Mode" className="font-extrabold text-sm tracking-wider uppercase" />
        </div>

        {/* Center Mode Controls: Art vs Lyrics & Vinyl Turntable Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/45 backdrop-blur-xl p-1 rounded-full border border-white/10 gap-1 text-xs font-semibold shadow-lg">
            <button
              onClick={() => setTheaterTab('art')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                theaterTab === 'art'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Artwork
            </button>
            <button
              onClick={() => setTheaterTab('lyrics')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                theaterTab === 'lyrics'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Mic2 size={13} />
              <span>Lyrics</span>
            </button>
          </div>

          {theaterTab === 'art' && (
            <button
              onClick={() => setStageMode(s => (s === 'card' ? 'vinyl' : 'card'))}
              title={stageMode === 'vinyl' ? 'Switch to Card view' : 'Switch to Vinyl Turntable view'}
              className={`px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
                stageMode === 'vinyl'
                  ? 'bg-spotify-green text-black border-spotify-green'
                  : 'bg-black/45 backdrop-blur-xl text-white/80 hover:text-white hover:border-white/20'
              }`}
            >
              <Disc size={14} className={stageMode === 'vinyl' && isPlaying ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Vinyl Mode</span>
            </button>
          )}
        </div>

        {/* Right Controls: Visualizer Selector, Audio FX, Queue, and Exit */}
        <div className="flex items-center gap-2">
          {/* Visualizer Style Dropdown/Pills */}
          <div className="hidden sm:flex items-center bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 text-[11px] font-medium text-white/70">
            {(['bars', 'fluid', 'waveform', 'radial', 'particles'] as const).map(style => (
              <button
                key={style}
                onClick={() => updateAudioSettings({ visualizerStyle: style })}
                className={`px-2.5 py-0.5 rounded-full capitalize transition-all cursor-pointer ${
                  visualizerStyle === style
                    ? 'bg-spotify-green text-black font-bold shadow'
                    : 'hover:text-white'
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
            className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all border ${
              isAudioFxOpen
                ? 'bg-spotify-green text-black border-spotify-green'
                : 'bg-black/40 hover:bg-white/20 border-white/10 text-white'
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
            className={`px-3 h-9 rounded-full flex items-center gap-1.5 cursor-pointer transition-all border text-xs font-bold ${
              isQueueOpen
                ? 'bg-white text-black border-white'
                : 'bg-black/40 hover:bg-white/20 border-white/10 text-white'
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
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Audio FX Popover */}
      {isAudioFxOpen && (
        <div className="absolute top-20 right-8 z-30 w-72 bg-[#181818]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Sliders size={15} className="text-spotify-green" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Audio Tools & EQ</h4>
            </div>
            <button
              onClick={() => setIsAudioFxOpen(false)}
              className="text-white/60 hover:text-white p-1"
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
                        ? 'bg-spotify-green text-black'
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
                        ? 'bg-spotify-green text-black'
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
        <div className="absolute top-20 right-8 z-30 w-80 max-h-[60vh] bg-[#181818]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl text-white flex flex-col animate-in fade-in zoom-in-95 duration-150">
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
                className="text-white/60 hover:text-white p-1"
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
                    className="p-1 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
      {theaterTab === 'art' ? (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 max-w-5xl mx-auto w-full my-auto relative z-10 px-4">
          {/* Stage Left: Artwork (Card Mode vs Vinyl Turntable Mode) */}
          {stageMode === 'vinyl' ? (
            /* 3D Spinning Vinyl Record Stage */
            <div
              className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center shrink-0"
              style={{
                transform: `scale(${bassScale})`,
                transition: 'transform 80ms ease-out',
              }}
            >
              {/* Rotating Vinyl Record Disc (Slides 45% out to the right) */}
              <div
                className={`absolute w-56 h-56 sm:w-72 sm:h-72 md:w-84 md:h-84 rounded-full bg-[#121214] shadow-[0_15px_50px_rgba(0,0,0,0.9)] flex items-center justify-center transition-all duration-700 ease-out border border-white/10 ${
                  isPlaying ? 'translate-x-12 sm:translate-x-16 md:translate-x-20' : 'translate-x-6'
                }`}
                style={{
                  boxShadow: `0 15px 50px rgba(0,0,0,0.9), 0 0 35px ${accentHex}44`,
                }}
              >
                {/* Concentric Vinyl Grooves */}
                <div
                  className="w-full h-full rounded-full flex items-center justify-center"
                  style={{
                    background:
                      'repeating-radial-gradient(circle, #151515, #151515 2px, #0b0b0d 3px, #0b0b0d 5px)',
                    animation: isPlaying ? 'spin 12s linear infinite' : 'none',
                  }}
                >
                  {/* Center Record Label Artwork Thumbnail */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-2 border-white/20 overflow-hidden shadow-inner relative flex items-center justify-center">
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
                        <Music size={28} className="text-black" />
                      </div>
                    )}
                    {/* Spindle hole */}
                    <div className="w-4 h-4 rounded-full bg-[#0a0a0c] border border-white/40 absolute z-10" />
                  </div>
                </div>
              </div>

              {/* Album Jacket Sleeve */}
              <div
                onClick={() => setStageMode('card')}
                title="Click to toggle full card view"
                className="w-56 h-56 sm:w-72 sm:h-72 md:w-84 md:h-84 rounded-2xl bg-[#282828] relative z-10 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden border border-white/10 cursor-pointer group"
              >
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={72} className="text-spotify-muted" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                    Switch to Card
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* 3D Tilted Card Stage with Bass Spring Bounce */
            <div
              style={{
                transform: `scale(${bassScale})`,
                transition: 'transform 80ms ease-out',
              }}
              className="shrink-0"
            >
              <TiltedCard
                rotateAmplitude={8}
                scaleOnHover={1.03}
                className="w-56 h-56 sm:w-72 sm:h-72 md:w-88 md:h-88 rounded-2xl bg-[#282828] flex items-center justify-center overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/10 cursor-pointer"
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
          )}

          {/* Stage Right: Track Details & Interactive Playback Controls */}
          <div className="text-center md:text-left min-w-0 flex-1 w-full max-w-xl">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-2 truncate drop-shadow-md">
              <BlurText text={currentTrack.title} />
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/80 font-medium mb-6 truncate">
              {currentTrack.artist} • {currentTrack.album}
            </p>

            {/* Scrubber Progress Bar */}
            <div
              className={`w-full flex items-center gap-3 text-xs text-white/70 font-mono mb-6 transition-all duration-500 ${
                isControlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
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
              <span className="w-10 text-left tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* Playback Controls with Cinema Immersion Fade */}
            <div
              className={`flex items-center justify-center md:justify-start gap-6 transition-all duration-500 ${
                isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
              }`}
            >
              <button
                onClick={toggleShuffle}
                title="Toggle Shuffle"
                className={`p-2 transition-colors cursor-pointer relative ${
                  isShuffle ? 'text-spotify-green' : 'text-white/60 hover:text-white'
                }`}
              >
                <ShuffleIcon size={22} />
                {isShuffle && (
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2" />
                )}
              </button>

              <button
                onClick={prevTrack}
                title="Previous track"
                className="p-2 text-white/80 hover:text-white hover:scale-110 transition-transform cursor-pointer"
              >
                <SkipBackIcon size={26} />
              </button>

              <ClickSpark sparkColor={accentHex}>
                <button
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="w-16 h-16 rounded-full bg-white text-black hover:scale-106 active:scale-95 transition-transform flex items-center justify-center shadow-2xl cursor-pointer"
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
                className="p-2 text-white/80 hover:text-white hover:scale-110 transition-transform cursor-pointer"
              >
                <SkipForwardIcon size={26} />
              </button>

              <button
                onClick={cycleRepeat}
                title="Cycle Repeat"
                className={`p-2 transition-colors cursor-pointer relative ${
                  repeatMode !== 'off' ? 'text-spotify-green' : 'text-white/60 hover:text-white'
                }`}
              >
                <RepeatIcon size={22} />
                {repeatMode !== 'off' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2" />
                )}
                {repeatMode === 'one' && (
                  <span className="text-[10px] font-bold absolute -top-1 -right-1 text-spotify-green">
                    1
                  </span>
                )}
              </button>

              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Lyrics View */
        <div className="max-w-4xl mx-auto w-full flex-1 my-auto overflow-y-auto px-6 py-8 relative z-10 space-y-6 text-center select-text no-scrollbar max-h-[60vh]">
          {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (
            currentTrack.lyrics.map((line, idx) => {
              const isActive = idx === activeLyricIdx;
              return (
                <p
                  key={idx}
                  ref={isActive ? activeLyricRef : null}
                  onClick={() => {
                    if (line.time >= 0) seek(line.time);
                  }}
                  className={`text-2xl sm:text-3xl md:text-5xl font-extrabold transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'text-white scale-105 opacity-100 drop-shadow-[0_0_24px_rgba(255,255,255,0.7)]'
                      : 'text-white/35 hover:text-white/70 scale-100'
                  }`}
                  style={
                    isActive && currentTrack.accentColor
                      ? { textShadow: `0 0 30px ${currentTrack.accentColor}cc` }
                      : undefined
                  }
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
                onClick={() => setTheaterTab('art')}
                className="px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 cursor-pointer"
              >
                View Artwork
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
