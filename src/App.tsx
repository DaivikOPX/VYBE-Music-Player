import React, { useState, useRef, useEffect } from 'react';
import { X, Minimize2, ChevronDown, Music, Upload, Sliders, Keyboard, Plus, BarChart3, FolderOpen, FileAudio, Trash2, ArrowUp, ArrowDown, Shuffle, ArrowUpDown, Moon, BookmarkPlus } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { MainViewport } from './components/MainViewport';
import { RightDrawer } from './components/RightDrawer';
import { PlayerBar } from './components/PlayerBar';
import { AudioToolsPopover } from './components/AudioToolsPopover';
import { TheaterVisualizer } from './components/TheaterVisualizer';
import { Aurora, TiltedCard, BlurText, ShinyText, ClickSpark, GradientText } from './components/reactbits';
import {
  Play16Icon,
  Pause16Icon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  SpotifyLogoIcon,
  HomeFilledIcon,
  HomeOutlineIcon,
  SearchIcon,
  LibraryExpandedIcon,
  LibraryCollapsedIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  LyricsIcon,
  QueueIcon,
} from './components/SpotifyIcons';

const SHORTCUTS_LIST = [
  { keys: 'Space', desc: 'Play / Pause' },
  { keys: '/  or  Ctrl + K', desc: 'Focus Search' },
  { keys: '← / →', desc: 'Seek -5s / +5s' },
  { keys: 'Ctrl + ← / →', desc: 'Previous / Next track' },
  { keys: 'M', desc: 'Mute / Unmute' },
  { keys: 'S', desc: 'Toggle shuffle' },
  { keys: 'R', desc: 'Cycle repeat mode' },
  { keys: 'A / B', desc: 'Set A–B loop point A or B' },
  { keys: 'C', desc: 'Clear A–B loop' },
  { keys: 'Ctrl + ,', desc: 'Open Settings' },
  { keys: 'Ctrl + + / -', desc: 'Zoom in / out' },
  { keys: 'Ctrl + 0', desc: 'Reset zoom' },
  { keys: '?  or  Ctrl + /', desc: 'Open / close shortcuts' },
];

const SpotifyShell: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seek,
    beginScrub,
    commitScrub,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    likedTrackIds,
    toggleLikeTrack,
    artists,
    albums,
    isMiniplayer,
    setIsMiniplayer,
    isTheaterMode,
    setIsTheaterMode,
    isMobilePlayerOpen,
    setIsMobilePlayerOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    handleDroppedFiles,
    settings,
    abLoop,
    setLoopA,
    setLoopB,
    clearAbLoop,
    route,
    navigate,
    goBack,
    canGoBack,
    queue,
    playTrack,
    removeFromQueue,
    clearQueue,
    moveQueueItem,
    shuffleQueue,
    reverseQueue,
    saveQueueAsPlaylist,
    queueRemainingSec,
    queueEstimatedEndTime,
    sleepTimer,
    startSleepTimer,
    sleepRemainingSec,
    createPlaylist,
    pickNativeAudioFiles,
    pickNativeAudioFolder,
    toastMessage,
    updateAudioSettings,
    activeAccentColor,
  } = usePlayer();

  const [mobileScrubbing, setMobileScrubbing] = useState(false);
  const [mobileScrubVal, setMobileScrubVal] = useState(0);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepthRef = useRef(0);
  const mobileSheetTouchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: { remove: () => Promise<void> } | null = null;
    void CapApp.addListener('backButton', () => {
      if (mobileQueueOpen) {
        setMobileQueueOpen(false);
      } else if (mobileToolsOpen) {
        setMobileToolsOpen(false);
      } else if (mobileCreateOpen) {
        setMobileCreateOpen(false);
      } else if (isMobilePlayerOpen) {
        setIsMobilePlayerOpen(false);
      } else if (isShortcutsOpen) {
        setIsShortcutsOpen(false);
      } else if (canGoBack) {
        goBack();
      } else {
        void CapApp.minimizeApp();
      }
    }).then(h => {
      listener = h;
    });
    return () => {
      void listener?.remove();
    };
  }, [
    mobileQueueOpen,
    mobileToolsOpen,
    mobileCreateOpen,
    isMobilePlayerOpen,
    isShortcutsOpen,
    canGoBack,
    goBack,
    setIsMobilePlayerOpen,
    setIsShortcutsOpen,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        navigate({ name: 'settings' });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const zoomLevels = [70, 80, 90, 100, 110, 120, 130];
        const cur = settings.zoomLevel || 100;
        const next = zoomLevels.find(z => z > cur) ?? 130;
        updateAudioSettings({ zoomLevel: next });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        const zoomLevels = [70, 80, 90, 100, 110, 120, 130];
        const cur = settings.zoomLevel || 100;
        const next = [...zoomLevels].reverse().find(z => z < cur) ?? 70;
        updateAudioSettings({ zoomLevel: next });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        updateAudioSettings({ zoomLevel: 100 });
        return;
      }
      if (e.key === 'Escape' && isShortcutsOpen) {
        setIsShortcutsOpen(false);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight' && duration > 0) {
        e.preventDefault();
        seek(Math.min(duration, currentTime + 5));
      } else if (e.key === 'ArrowLeft' && duration > 0) {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
      } else if (e.key === 's' || e.key === 'S') {
        toggleShuffle();
      } else if (e.key === 'r' || e.key === 'R') {
        cycleRepeat();
      } else if (e.key === 'a' || e.key === 'A') {
        if (currentTrack) setLoopA();
      } else if (e.key === 'b' || e.key === 'B') {
        if (currentTrack) setLoopB();
      } else if (e.key === 'c' || e.key === 'C') {
        if (abLoop.a !== null || abLoop.b !== null) clearAbLoop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isShortcutsOpen,
    setIsShortcutsOpen,
    duration,
    currentTime,
    seek,
    toggleShuffle,
    cycleRepeat,
    currentTrack,
    setLoopA,
    setLoopB,
    abLoop.a,
    abLoop.b,
    clearAbLoop,
    settings.zoomLevel,
    updateAudioSettings,
  ]);

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayTime = mobileScrubbing ? mobileScrubVal : currentTime;
  const progressPct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

  const isExternalFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    void handleDroppedFiles(e.dataTransfer);
  };

  const currentArtistObj = currentTrack
    ? artists.find(
        a =>
          a.trackIds.includes(currentTrack.id) ||
          a.name.toLowerCase() === currentTrack.artist.toLowerCase()
      )
    : undefined;

  const currentAlbumObj = currentTrack
    ? albums.find(
        a =>
          a.trackIds.includes(currentTrack.id) ||
          a.name.toLowerCase() === currentTrack.album.toLowerCase()
      )
    : undefined;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-screen w-screen ${settings.hazyMode ? 'bg-[#09090d]' : 'bg-black'} text-white flex flex-col overflow-hidden relative pt-safe pb-safe ${
        settings.animationsEnabled === false ? 'reduce-motion' : ''
      }`}
    >
      {/* Spicetify Hazy Dynamic Ambient Album Art Backdrop */}
      {settings.hazyMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-all duration-700 ease-in-out">
          {currentTrack?.coverUrl ? (
            <div
              className="absolute -inset-16 bg-cover bg-center transition-all duration-700 ease-in-out will-change-transform"
              style={{
                backgroundImage: `url("${currentTrack.coverUrl}")`,
                filter: `blur(var(--hazy-bg-blur, ${Math.round(((settings.hazyBlur ?? 45) / 100) * 80)}px)) saturate(${115 + Math.round(((settings.hazyBlur ?? 45) / 100) * 70)}%) brightness(${0.46 - ((settings.hazyBlur ?? 45) / 100) * 0.12})`,
                transform: (settings.hazyBlur ?? 45) <= 5 ? 'scale(1.02)' : 'scale(1.18)',
              }}
            />
          ) : (
            <div
              className="absolute -inset-16 transition-all duration-700 ease-in-out"
              style={{
                background: `radial-gradient(circle at 35% 25%, ${currentTrack?.accentColor || '#1db954'}40 0%, rgba(18, 18, 28, 0.85) 55%, #08080c 100%)`,
                filter: `blur(var(--hazy-bg-blur, ${Math.round(((settings.hazyBlur ?? 45) / 100) * 60)}px))`,
              }}
            />
          )}
          {/* Subtle frosted glass ambient mesh and vignette */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none transition-opacity duration-500"
            style={{ opacity: Math.max(0.08, (settings.hazyBlur ?? 45) / 100) }}
          />
          <div
            className="absolute inset-0 bg-radial from-transparent via-transparent to-black/50 pointer-events-none transition-opacity duration-500"
            style={{ opacity: Math.max(0.08, (settings.hazyBlur ?? 45) / 100) }}
          />
        </div>
      )}

      {/* Desktop Top Titlebar */}
      <div className="relative z-50">
        <TopNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex md:px-2 md:pb-2 overflow-hidden min-h-0 relative z-10">
        <Sidebar />
        <MainViewport />
        <RightDrawer />
      </div>

      {/* Persistent Player Bar (Desktop Full / Mobile Mini) */}
      <div className="relative z-20">
        <PlayerBar />
      </div>

      {/* Spotify Mobile Bottom Navigation Bar (< 768px for Android APK) */}
      <nav className="md:hidden h-16 bg-gradient-to-t from-black via-black/95 to-black/75 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-around px-2 shrink-0 select-none">
        <button
          onClick={() => navigate({ name: 'home' })}
          className={`flex flex-col items-center gap-1 min-w-[60px] ${
            route.name === 'home' ? 'text-white' : 'text-spotify-muted'
          }`}
        >
          {route.name === 'home' ? <HomeFilledIcon size={22} /> : <HomeOutlineIcon size={22} />}
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          onClick={() => navigate({ name: 'search' })}
          className={`flex flex-col items-center gap-1 min-w-[60px] ${
            route.name === 'search' || route.name === 'browse' ? 'text-white' : 'text-spotify-muted'
          }`}
        >
          <SearchIcon size={22} />
          <span className="text-[10px] font-semibold">Search</span>
        </button>

        <button
          onClick={() => navigate({ name: 'library' })}
          className={`flex flex-col items-center gap-1 min-w-[60px] ${
            route.name === 'library' ||
            route.name === 'playlist' ||
            route.name === 'liked' ||
            route.name === 'album' ||
            route.name === 'artist'
              ? 'text-white'
              : 'text-spotify-muted'
          }`}
        >
          {route.name === 'library' ? (
            <LibraryExpandedIcon size={22} />
          ) : (
            <LibraryCollapsedIcon size={22} />
          )}
          <span className="text-[10px] font-semibold">Your Library</span>
        </button>

        <button
          onClick={() => setMobileCreateOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[60px] text-spotify-muted active:text-white"
        >
          <Plus size={23} />
          <span className="text-[10px] font-semibold">Create</span>
        </button>
      </nav>

      {/* Spotify Mobile Create Bottom Sheet */}
      {mobileCreateOpen && (
        <div
          onClick={() => setMobileCreateOpen(false)}
          className="md:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full bg-[#181818] border-t border-white/10 rounded-t-2xl p-5 pb-8 space-y-2 animate-sheet-up"
          >
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2 px-1">Create or Add</h3>
            <button
              onClick={() => {
                setMobileCreateOpen(false);
                createPlaylist();
              }}
              className="w-full p-3 rounded-xl hover:bg-white/10 flex items-center gap-3.5 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Plus size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Playlist</p>
                <p className="text-xs text-spotify-muted">Build a custom offline playlist</p>
              </div>
            </button>
            <button
              onClick={() => {
                setMobileCreateOpen(false);
                void pickNativeAudioFiles();
              }}
              className="w-full p-3 rounded-xl hover:bg-white/10 flex items-center gap-3.5 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <FileAudio size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Add Audio Files</p>
                <p className="text-xs text-spotify-muted">MP3, FLAC, WAV, OPUS, M4A, OGG</p>
              </div>
            </button>
            <button
              onClick={() => {
                setMobileCreateOpen(false);
                void pickNativeAudioFolder();
              }}
              className="w-full p-3 rounded-xl hover:bg-white/10 flex items-center gap-3.5 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <FolderOpen size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Add Music Folder</p>
                <p className="text-xs text-spotify-muted">Scan folder into your library</p>
              </div>
            </button>
            <button
              onClick={() => {
                setMobileCreateOpen(false);
                navigate({ name: 'stats' });
              }}
              className="w-full p-3 rounded-xl hover:bg-white/10 flex items-center gap-3.5 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-spotify-green">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Listening Stats & Health</p>
                <p className="text-xs text-spotify-muted">Play time, top genres & duplicates</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Spotify Mobile Full-Screen Now Playing Sheet */}
      {isMobilePlayerOpen && currentTrack && (
        <div
          onTouchStart={e => {
            mobileSheetTouchStartY.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={e => {
            const startY = mobileSheetTouchStartY.current;
            mobileSheetTouchStartY.current = null;
            const endY = e.changedTouches[0]?.clientY;
            if (startY !== null && endY !== undefined && endY - startY > 90) {
              setIsMobilePlayerOpen(false);
            }
          }}
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-between px-6 py-4 pt-safe pb-safe select-none animate-sheet-up overflow-y-auto"
          style={{
            background: settings.amoledMode
              ? '#000000'
              : `linear-gradient(to bottom, ${currentTrack.accentColor || '#282828'}, #121212 52%, #000000)`,
          }}
        >
          <div className="space-y-1">
            <div className="w-10 h-1 rounded-full bg-white/30 mx-auto" />
            <div className="flex items-center justify-between">
              <button onClick={() => setIsMobilePlayerOpen(false)} className="p-2 text-white">
                <ChevronDown size={24} />
              </button>
              <button
                onClick={() => {
                  if (currentAlbumObj) {
                    setIsMobilePlayerOpen(false);
                    navigate({
                      name: 'album',
                      albumName: currentAlbumObj.name,
                      artistName: currentAlbumObj.artist,
                    });
                  }
                }}
                className="text-center max-w-[200px]"
              >
                <span className="block text-[9px] font-bold uppercase tracking-widest text-white/60">
                  Playing From Album
                </span>
                <span className="block text-xs font-bold text-white truncate">
                  {currentTrack.album}
                </span>
              </button>
              <button
                onClick={() => setMobileToolsOpen(true)}
                className={`p-2 ${
                  abLoop.a !== null || abLoop.b !== null || settings.eqPreset !== 'Flat'
                    ? 'text-spotify-green'
                    : 'text-white/85'
                }`}
                title="Audio & Playback Tools"
              >
                <Sliders size={20} />
              </button>
            </div>
          </div>

          <TiltedCard
            rotateAmplitude={8}
            scaleOnHover={1.02}
            className="aspect-square w-full max-w-[330px] mx-auto rounded-xl bg-[#282828] shadow-2xl overflow-hidden flex items-center justify-center my-3"
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

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white truncate">
                  <GradientText colors={['#ffffff', '#ffffff', activeAccentColor, '#ffffff']} animationSpeed={8}>
                    {currentTrack.title}
                  </GradientText>
                </h2>
                <button
                  onClick={() => {
                    if (currentArtistObj) {
                      setIsMobilePlayerOpen(false);
                      navigate({ name: 'artist', id: currentArtistObj.id });
                    }
                  }}
                  className="text-sm text-spotify-muted truncate block text-left"
                >
                  {currentTrack.artist}
                </button>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setMobileQueueOpen(true)}
                  className={`p-1 ${queue.length > 0 ? 'text-spotify-green' : 'text-white/80'}`}
                  title="Queue"
                >
                  <QueueIcon size={20} />
                </button>
                <button
                  onClick={() => {
                    setIsMobilePlayerOpen(false);
                    navigate({ name: 'lyrics' });
                  }}
                  className="text-white/80"
                  title="Lyrics"
                >
                  <LyricsIcon size={20} />
                </button>
                <button
                  onClick={() => toggleLikeTrack(currentTrack.id)}
                  className={isLiked ? 'text-spotify-green' : 'text-white'}
                >
                  {isLiked ? <CheckCircleIcon size={24} /> : <PlusCircleIcon size={24} />}
                </button>
              </div>
            </div>

            {/* Mobile Scrubber */}
            <div>
              <div className="relative h-4 flex items-center">
                <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.1}
                  value={Math.min(displayTime, duration > 0 ? duration : 100)}
                  onPointerDown={() => {
                    setMobileScrubbing(true);
                    setMobileScrubVal(currentTime);
                    beginScrub();
                  }}
                  onChange={e => setMobileScrubVal(Number(e.target.value))}
                  onPointerUp={e => {
                    const v = Number((e.target as HTMLInputElement).value);
                    setMobileScrubbing(false);
                    commitScrub(v);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0"
                />
              </div>
              <div className="flex justify-between text-xs text-spotify-muted tabular-nums mt-1">
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex items-center justify-between px-2">
              <button
                onClick={toggleShuffle}
                className={isShuffle ? 'text-spotify-green' : 'text-white/75'}
              >
                <ShuffleIcon size={22} />
              </button>
              <button onClick={prevTrack} className="text-white">
                <SkipBackIcon size={28} />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause16Icon size={26} /> : <Play16Icon size={26} className="ml-0.5" />}
              </button>
              <button onClick={() => nextTrack()} className="text-white">
                <SkipForwardIcon size={28} />
              </button>
              <button
                onClick={cycleRepeat}
                className={repeatMode !== 'off' ? 'text-spotify-green' : 'text-white/75'}
              >
                <RepeatIcon size={22} />
              </button>
            </div>

            {/* Spotify Mobile Lyrics Preview Card */}
            <button
              onClick={() => {
                setIsMobilePlayerOpen(false);
                navigate({ name: 'lyrics' });
              }}
              style={{
                backgroundColor:
                  currentTrack.accentColor && currentTrack.accentColor !== '#282828'
                    ? `${currentTrack.accentColor}cc`
                    : '#1f2937',
              }}
              className="w-full rounded-xl p-3.5 text-left border border-white/10 shadow-lg space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white">Lyrics</span>
                <span className="text-[10px] font-bold bg-black/30 text-white px-2 py-0.5 rounded-full">
                  Expand
                </span>
              </div>
              <p className="text-sm font-bold text-white/90 line-clamp-2">
                {currentTrack.lyrics?.length
                  ? currentTrack.lyrics.slice(0, 2).map(l => l.text).join(' • ')
                  : 'Tap to load .lrc/.txt or write lyrics for this track'}
              </p>
            </button>
          </div>

          {mobileToolsOpen && (
            <div
              onClick={() => setMobileToolsOpen(false)}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
            >
              <AudioToolsPopover variant="modal" onClose={() => setMobileToolsOpen(false)} />
            </div>
          )}

          {mobileQueueOpen && (
            <div
              onClick={() => setMobileQueueOpen(false)}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center"
            >
              <div
                onClick={e => e.stopPropagation()}
                className="w-full max-h-[80vh] bg-[#181818] border-t border-white/15 rounded-t-2xl p-5 flex flex-col gap-3 animate-sheet-up"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Playback Queue ({queue.length})</h3>
                    {queueRemainingSec > 0 && (
                      <p className="text-[11px] text-spotify-muted">
                        {Math.ceil(queueRemainingSec / 60)} min left
                        {queueEstimatedEndTime && ` • Ends at ${queueEstimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {queue.length > 0 && (
                      <button
                        onClick={clearQueue}
                        className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setMobileQueueOpen(false)}
                      className="p-1.5 rounded-full bg-white/10 text-white cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Mobile Queue Timer status / toggle */}
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Moon size={14} className="text-spotify-green" />
                    <span className="font-semibold text-white">
                      {sleepTimer?.kind === 'end-of-queue'
                        ? 'Stop on queue end: Active'
                        : sleepTimer?.kind === 'until'
                        ? `Timer: ${Math.ceil((sleepRemainingSec || 0) / 60)}m left`
                        : 'Queue Sleep Timer'}
                    </span>
                  </div>
                  {sleepTimer ? (
                    <button
                      onClick={() => startSleepTimer(null)}
                      className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[11px] font-bold"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => startSleepTimer('end-of-queue')}
                      className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                    >
                      Stop at queue end
                    </button>
                  )}
                </div>

                {/* Queue Adjust Actions */}
                {queue.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={shuffleQueue}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Shuffle size={13} />
                      <span>Shuffle</span>
                    </button>
                    <button
                      onClick={reverseQueue}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpDown size={13} />
                      <span>Reverse</span>
                    </button>
                    <button
                      onClick={() => saveQueueAsPlaylist()}
                      className="py-1.5 px-3 rounded-lg bg-white/10 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <BookmarkPlus size={13} />
                      <span>Save</span>
                    </button>
                  </div>
                )}

                <div className="overflow-y-auto space-y-2 pb-4">
                  {queue.length > 0 ? (
                    queue.map((qt, i) => (
                      <div
                        key={`${qt.id}-${i}`}
                        onClick={() => playTrack(qt)}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/5 active:bg-white/10"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{qt.title}</p>
                          <p className="text-xs text-spotify-muted truncate">{qt.artist}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={i === 0}
                            onClick={e => {
                              e.stopPropagation();
                              moveQueueItem(i, i - 1);
                            }}
                            className={`p-1.5 rounded ${i === 0 ? 'text-white/20' : 'text-spotify-muted active:text-white'}`}
                            title="Move Up"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            disabled={i === queue.length - 1}
                            onClick={e => {
                              e.stopPropagation();
                              moveQueueItem(i, i + 1);
                            }}
                            className={`p-1.5 rounded ${i === queue.length - 1 ? 'text-white/20' : 'text-spotify-muted active:text-white'}`}
                            title="Move Down"
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeFromQueue(i);
                            }}
                            className="p-1.5 text-spotify-muted hover:text-red-400"
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-spotify-muted text-center py-8">
                      Queue is empty. Swipe right on any song to queue it.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Miniplayer Overlay */}
      {isMiniplayer && currentTrack && (
        <div className="hidden md:block fixed right-6 bottom-24 w-72 bg-[#181818] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 select-none animate-pop-in">
          <div className="relative h-40 bg-[#282828] flex items-center justify-center">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music size={48} className="text-spotify-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
            <button
              onClick={() => setIsMiniplayer(false)}
              title="Close Miniplayer"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-white/75 truncate">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={prevTrack}
                  className="p-1.5 text-white/80 hover:text-white cursor-pointer"
                >
                  <SkipBackIcon size={14} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer"
                >
                  {isPlaying ? <Pause16Icon size={14} /> : <Play16Icon size={14} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => nextTrack()}
                  className="p-1.5 text-white/80 hover:text-white cursor-pointer"
                >
                  <SkipForwardIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Theater Mode Overlay */}
      {isTheaterMode && currentTrack && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between p-8 md:p-14 select-none overflow-hidden"
          style={{
            background: settings.amoledMode
              ? '#000000'
              : `radial-gradient(circle at 30% 30%, ${currentTrack.accentColor || '#2e2e2e'} 0%, #09090b 75%)`,
          }}
        >
          {!settings.amoledMode && settings.animationsEnabled !== false && (
            <Aurora
              colorStops={[
                currentTrack.accentColor && currentTrack.accentColor !== '#282828'
                  ? currentTrack.accentColor
                  : activeAccentColor,
                activeAccentColor,
                '#09090b',
              ]}
              className="opacity-45"
            />
          )}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-white/80">
              <SpotifyLogoIcon size={28} className="text-white" />
              <ShinyText text="Now Playing" className="font-bold text-sm tracking-wide uppercase" />
            </div>
            <button
              onClick={() => setIsTheaterMode(false)}
              title="Exit Full Screen"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10 max-w-5xl mx-auto w-full my-auto relative z-10">
            <TiltedCard
              rotateAmplitude={8}
              scaleOnHover={1.03}
              className="w-64 h-64 md:w-80 md:h-80 rounded-xl bg-[#282828] flex items-center justify-center overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
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
            <div className="text-center md:text-left min-w-0 flex-1">
              <h1 className="text-3xl md:text-6xl font-bold text-white tracking-tight mb-3">
                <BlurText text={currentTrack.title} />
              </h1>
              <p className="text-xl md:text-2xl text-white/75 font-medium mb-8">
                {currentTrack.artist} • {currentTrack.album}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-6">
                <button
                  onClick={prevTrack}
                  className="p-2 text-white/80 hover:text-white cursor-pointer"
                >
                  <SkipBackIcon size={24} />
                </button>
                <ClickSpark sparkColor={activeAccentColor}>
                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-white text-black hover:scale-105 transition-transform flex items-center justify-center shadow-2xl cursor-pointer"
                  >
                    {isPlaying ? <Pause16Icon size={24} /> : <Play16Icon size={24} className="ml-1" />}
                  </button>
                </ClickSpark>
                <button
                  onClick={() => nextTrack()}
                  className="p-2 text-white/80 hover:text-white cursor-pointer"
                >
                  <SkipForwardIcon size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            {settings.showVisualizer !== false && (
              <TheaterVisualizer accentColor={currentTrack.accentColor} />
            )}
          </div>
        </div>
      )}

      {/* Window-Wide Drag & Drop Music Import Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none">
          <div className="border-2 border-dashed border-spotify-green bg-[#181818]/95 rounded-2xl px-10 py-12 text-center max-w-md shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center mx-auto mb-4">
              <Upload size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Drop to import music</h2>
            <p className="text-sm text-spotify-muted">
              Supports MP3, FLAC, WAV, M4A, OGG, AAC, and folders with .lrc lyrics.
            </p>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div
          onClick={() => setIsShortcutsOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#242424] rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-pop-in"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white">
                <Keyboard size={18} className="text-spotify-green" />
                <span>Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1 rounded-full text-spotify-muted hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {SHORTCUTS_LIST.map(item => (
                <div
                  key={item.keys}
                  className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0"
                >
                  <span className="text-white/85">{item.desc}</span>
                  <kbd className="px-2.5 py-1 rounded bg-black/40 border border-white/15 font-mono text-xs text-spotify-green font-bold">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 bg-[#2e77d0] text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-2xl z-50 pointer-events-none animate-toast-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#181818] border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <Music size={40} className="mx-auto text-spotify-green" />
            <h1 className="text-xl font-bold">Playback view recovered from an error</h1>
            <p className="text-xs text-spotify-muted break-words">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-6 py-2.5 rounded-full bg-spotify-green text-black font-bold text-sm cursor-pointer"
            >
              Restore Player
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <PlayerProvider>
        <SpotifyShell />
      </PlayerProvider>
    </AppErrorBoundary>
  );
}

export default App;
