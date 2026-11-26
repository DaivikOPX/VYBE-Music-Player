import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, Check, Laptop, Music, Sliders, Timer } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { CONNECT_DEVICES } from '../data/mockData';
import { AudioToolsPopover } from './AudioToolsPopover';
import { ClickSpark } from './reactbits';
import {
  ShuffleIcon,
  SkipBackIcon,
  Play16Icon,
  Pause16Icon,
  SkipForwardIcon,
  RepeatIcon,
  VolumeIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  NowPlayingViewIcon,
  LyricsIcon,
  QueueIcon,
  ConnectDeviceIcon,
  MiniplayerIcon,
  FullscreenIcon,
} from './SpotifyIcons';

export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    activePlaylistId,
    albums,
    artists,
    likedTrackIds,
    toggleLikeTrack,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    beginScrub,
    commitScrub,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    nextTrack,
    prevTrack,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    route,
    navigate,
    goBack,
    isRightDrawerOpen,
    rightDrawerMode,
    toggleRightDrawer,
    activeDeviceId,
    audioOutputDevices,
    selectAudioOutputDevice,
    isMiniplayer,
    setIsMiniplayer,
    isTheaterMode,
    setIsTheaterMode,
    setIsMobilePlayerOpen,
    tracks,
    playTrack,
    settings,
    abLoop,
    sleepRemainingSec,
  } = usePlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const rightControlsRef = useRef<HTMLDivElement>(null);
  const miniTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (rightControlsRef.current && !rightControlsRef.current.contains(e.target as Node)) {
        setConnectOpen(false);
        setToolsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOut);
    return () => window.removeEventListener('mousedown', handleOut);
  }, []);

  const formatTime = (sec: number) => {
    if (!currentTrack || !Number.isFinite(sec) || sec < 0) return '-:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatShortSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const progressPct =
    currentTrack && duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const volumePct = isMuted ? 0 : Math.min(100, volume * 100);
  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;
  const hasTrack = Boolean(currentTrack);

  const isLyricsOpen = route.name === 'lyrics';
  const isNowPlayingOpen = isRightDrawerOpen && rightDrawerMode === 'nowPlaying';
  const isQueueOpen = isRightDrawerOpen && rightDrawerMode === 'queue';

  const matchedAlbum = currentTrack
    ? albums.find(
        a =>
          a.trackIds.includes(currentTrack.id) ||
          a.name.toLowerCase() === currentTrack.album.toLowerCase()
      )
    : undefined;

  const matchedArtist = currentTrack
    ? artists.find(
        a =>
          a.trackIds.includes(currentTrack.id) ||
          a.name.toLowerCase() === currentTrack.artist.toLowerCase()
      )
    : undefined;

  const hasActiveTools =
    abLoop.a !== null ||
    abLoop.b !== null ||
    settings.eqPreset !== 'Flat' ||
    settings.eqGains.some(g => g !== 0) ||
    Math.abs(settings.playbackRate - 1) > 0.01 ||
    settings.crossfadeSec > 0 ||
    sleepRemainingSec !== null;

  const loopAPct =
    hasTrack && duration > 0 && abLoop.a !== null
      ? Math.max(0, Math.min(100, (abLoop.a / duration) * 100))
      : null;
  const loopBPct =
    hasTrack && duration > 0 && abLoop.b !== null
      ? Math.max(0, Math.min(100, (abLoop.b / duration) * 100))
      : null;

  return (
    <>
      {/* MOBILE MINI PLAYER BAR (for Android APK / narrow screen < 768px) */}
      <div className="md:hidden px-2 pb-1.5 shrink-0">
        {currentTrack && (
          <div
            onClick={() => setIsMobilePlayerOpen(true)}
            onTouchStart={e => {
              const t = e.touches[0];
              if (t) miniTouchStartRef.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={e => {
              const start = miniTouchStartRef.current;
              miniTouchStartRef.current = null;
              const t = e.changedTouches[0];
              if (!start || !t) return;
              const dx = t.clientX - start.x;
              const dy = t.clientY - start.y;
              if (Math.abs(dx) > 48 && Math.abs(dy) < 35) {
                if (dx < 0) nextTrack();
                else prevTrack();
              }
            }}
            style={{
              background: settings.hazyMode
                ? 'var(--hazy-panel-bg, rgba(18, 18, 24, 0.65))'
                : currentTrack.accentColor && currentTrack.accentColor !== '#282828'
                ? `linear-gradient(90deg, ${currentTrack.accentColor}cc 0%, rgba(26, 26, 30, 0.95) 100%)`
                : 'rgba(28, 28, 32, 0.92)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            }}
            className="rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3 relative overflow-hidden shadow-2xl border border-white/12 active:scale-[0.985] transition-transform duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-lg bg-[#181818] flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music size={18} className="text-spotify-muted" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white truncate leading-tight">{currentTrack.title}</p>
                <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                  {currentTrack.explicit && (
                    <span
                      title="Explicit"
                      className="bg-[#b3b3b3] text-black text-[8px] font-bold rounded-[2px] w-3 h-3 inline-flex items-center justify-center leading-none select-none shrink-0"
                    >
                      E
                    </span>
                  )}
                  <p className="text-xs text-white/70 truncate">{currentTrack.artist}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => toggleLikeTrack(currentTrack.id)}
                className={`p-1.5 ${isLiked ? 'text-spotify-green' : 'text-white/60 active:text-white'}`}
              >
                {isLiked ? <CheckCircleIcon size={22} /> : <PlusCircleIcon size={22} />}
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                {isPlaying ? <Pause16Icon size={18} /> : <Play16Icon size={18} className="ml-0.5" />}
              </button>
            </div>

            {/* Glowing smooth progress bar at bottom of mobile mini bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/15">
              <div
                className="h-full bg-spotify-green transition-all duration-150 shadow-[0_0_8px_rgba(30,215,96,0.8)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP NOW PLAYING BAR (>= 768px) */}
      <footer
        data-testid="now-playing-bar"
        className={`hidden md:flex h-[80px] ${
          settings.hazyMode
            ? 'border-t border-white/10 shadow-2xl'
            : settings.amoledMode
            ? 'bg-black border-t border-white/10'
            : 'bg-black/95 backdrop-blur-md'
        } px-4 items-center justify-between select-none z-40 shrink-0 text-spotify-muted`}
        style={
          settings.hazyMode
            ? {
                backgroundColor: 'var(--hazy-panel-bg, rgba(14, 14, 20, 0.40))',
                backdropFilter: 'blur(var(--hazy-panel-blur, 20px)) saturate(175%)',
                WebkitBackdropFilter: 'blur(var(--hazy-panel-blur, 20px)) saturate(175%)',
              }
            : undefined
        }
      >
        {/* LEFT: Track Art, Title, Artist, Like */}
        <div className="flex items-center gap-3.5 w-[30%] min-w-[180px]">
          {currentTrack ? (
            <>
              <div className="relative w-14 h-14 shrink-0 group rounded overflow-hidden bg-[#282828] flex items-center justify-center">
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-14 h-14 object-cover"
                  />
                ) : (
                  <Music size={22} className="text-spotify-muted" />
                )}
                <button
                  onClick={() => toggleRightDrawer('nowPlaying')}
                  title={isNowPlayingOpen ? 'Collapse Now Playing view' : 'Expand Now Playing view'}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 transition-all cursor-pointer"
                >
                  <ChevronUp size={15} className={isNowPlayingOpen ? 'rotate-180' : ''} />
                </button>
              </div>

              <div className="min-w-0 pr-1">
                <button
                  onClick={() => {
                    if (matchedAlbum) {
                      navigate({
                        name: 'album',
                        albumName: matchedAlbum.name,
                        artistName: matchedAlbum.artist,
                      });
                    } else if (activePlaylistId) {
                      navigate({ name: 'playlist', id: activePlaylistId });
                    }
                  }}
                  className={`block text-[14px] font-medium text-white truncate max-w-full text-left ${
                    matchedAlbum || activePlaylistId ? 'hover:underline cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {currentTrack.title}
                </button>
                <div className="flex items-center gap-1.5 truncate">
                  {currentTrack.explicit && (
                    <span
                      title="Explicit"
                      className="bg-[#b3b3b3] text-black text-[9px] font-bold rounded-[2px] w-3.5 h-3.5 inline-flex items-center justify-center leading-none mr-0.5 select-none shrink-0"
                    >
                      E
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (matchedArtist) navigate({ name: 'artist', id: matchedArtist.id });
                    }}
                    className={`block text-[12px] text-spotify-muted truncate max-w-full text-left ${
                      matchedArtist ? 'hover:underline hover:text-white cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {currentTrack.artist}
                  </button>
                </div>
              </div>

              <ClickSpark>
                <button
                  onClick={() => toggleLikeTrack(currentTrack.id)}
                  title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                  className={`p-1.5 transition-transform hover:scale-105 shrink-0 cursor-pointer ${
                    isLiked ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
                  }`}
                >
                  {isLiked ? <CheckCircleIcon size={16} /> : <PlusCircleIcon size={16} />}
                </button>
              </ClickSpark>
            </>
          ) : (
            <div className="w-14" />
          )}
        </div>

        {/* CENTER: Playback Controls & Glitch-Free Scrubber */}
        <div data-testid="player-controls" className="flex flex-col items-center max-w-[722px] w-[40%]">
          <div className="flex items-center gap-5 mb-1.5">
            <button
              onClick={toggleShuffle}
              disabled={!hasTrack}
              title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
              className={`relative p-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isShuffle ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
              }`}
            >
              <ShuffleIcon size={16} />
              {isShuffle && (
                <span className="w-1 h-1 rounded-full bg-spotify-green absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
              )}
            </button>

            <button
              data-testid="control-button-skip-back"
              onClick={prevTrack}
              disabled={!hasTrack}
              title="Previous"
              className="p-1 text-spotify-muted hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipBackIcon size={16} />
            </button>

            <ClickSpark>
              <button
                data-testid="control-button-playpause"
                onClick={togglePlay}
                disabled={!hasTrack}
                title={isPlaying ? 'Pause' : 'Play'}
                className="w-8 h-8 rounded-full bg-white hover:scale-106 active:scale-96 disabled:opacity-40 disabled:hover:scale-100 text-black flex items-center justify-center transition-transform cursor-pointer disabled:cursor-not-allowed shadow"
              >
                {isPlaying ? <Pause16Icon size={16} /> : <Play16Icon size={16} className="ml-0.5" />}
              </button>
            </ClickSpark>

            <button
              data-testid="control-button-skip-forward"
              onClick={() => nextTrack()}
              disabled={!hasTrack}
              title="Next"
              className="p-1 text-spotify-muted hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipForwardIcon size={16} />
            </button>

            <button
              data-testid="control-button-repeat"
              onClick={cycleRepeat}
              disabled={!hasTrack}
              title={
                repeatMode === 'off'
                  ? 'Enable repeat'
                  : repeatMode === 'all'
                  ? 'Enable repeat one'
                  : 'Disable repeat'
              }
              className={`relative p-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
              }`}
            >
              <RepeatIcon size={16} />
              {repeatMode !== 'off' && (
                <span className="w-1 h-1 rounded-full bg-spotify-green absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
              )}
              {repeatMode === 'one' && (
                <span className="text-[9px] font-bold absolute -top-1 -right-1 text-spotify-green">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Scrubber + Optional A-B Loop Range */}
          <div className="w-full flex items-center gap-2 text-[11px] text-spotify-muted">
            <span data-testid="playback-position" className="w-9 text-right tabular-nums">
              {formatTime(displayTime)}
            </span>

            <div
              data-testid="playback-progressbar"
              className={`relative flex-1 h-3 flex items-center group ${
                hasTrack ? 'cursor-pointer' : 'opacity-40'
              }`}
            >
              <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden relative">
                {loopAPct !== null && loopBPct !== null && loopBPct > loopAPct && (
                  <div
                    className="absolute top-0 bottom-0 bg-spotify-green/45 pointer-events-none"
                    style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
                  />
                )}
                <div
                  className="h-full bg-white group-hover:bg-spotify-green rounded-full relative z-10"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {loopAPct !== null && (
                <div
                  title={`Loop A: ${formatTime(abLoop.a!)}`}
                  className="w-1.5 h-2.5 bg-spotify-green rounded-xs absolute -translate-x-1/2 pointer-events-none z-20"
                  style={{ left: `${loopAPct}%` }}
                />
              )}
              {loopBPct !== null && (
                <div
                  title={`Loop B: ${formatTime(abLoop.b!)}`}
                  className="w-1.5 h-2.5 bg-spotify-green rounded-xs absolute -translate-x-1/2 pointer-events-none z-20"
                  style={{ left: `${loopBPct}%` }}
                />
              )}

              {hasTrack && (
                <>
                  <div
                    className="w-3 h-3 rounded-full bg-white shadow absolute -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none z-20"
                    style={{ left: `${progressPct}%` }}
                  />
                  <input
                    type="range"
                    aria-label="Change progress"
                    min={0}
                    max={duration > 0 ? duration : 100}
                    step={0.1}
                    value={Math.min(displayTime, duration > 0 ? duration : 100)}
                    onPointerDown={() => {
                      setIsScrubbing(true);
                      setScrubValue(currentTime);
                      beginScrub();
                    }}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setScrubValue(v);
                    }}
                    onPointerUp={e => {
                      const v = Number((e.target as HTMLInputElement).value);
                      setIsScrubbing(false);
                      commitScrub(v);
                    }}
                    onPointerCancel={() => {
                      setIsScrubbing(false);
                      commitScrub(scrubValue);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                  />
                </>
              )}
            </div>

            <span data-testid="playback-duration" className="w-9 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* RIGHT: Side Views, Compact Audio Tools, Connect, Volume, Miniplayer, Fullscreen */}
        <div
          className="flex items-center justify-end gap-2 w-[30%] min-w-[230px]"
          ref={rightControlsRef}
        >
          {sleepRemainingSec !== null && (
            <button
              onClick={() => setToolsOpen(prev => !prev)}
              title="Sleep timer active"
              className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-spotify-green/15 text-spotify-green text-[11px] font-bold cursor-pointer"
            >
              <Timer size={11} />
              <span className="tabular-nums">{formatShortSec(sleepRemainingSec)}</span>
            </button>
          )}

          <button
            onClick={() => toggleRightDrawer('nowPlaying')}
            disabled={!hasTrack}
            title="Now playing view"
            className={`relative p-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
              isNowPlayingOpen ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <NowPlayingViewIcon size={16} />
            {isNowPlayingOpen && (
              <span className="w-1 h-1 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2" />
            )}
          </button>

          <button
            onClick={() => (isLyricsOpen ? goBack() : navigate({ name: 'lyrics' }))}
            disabled={!hasTrack}
            title="Lyrics"
            className={`relative p-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
              isLyricsOpen ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <LyricsIcon size={16} />
            {isLyricsOpen && (
              <span className="w-1 h-1 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2" />
            )}
          </button>

          <button
            onClick={() => toggleRightDrawer('queue')}
            title="Queue"
            className={`relative p-1.5 transition-colors cursor-pointer ${
              isQueueOpen ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <QueueIcon size={16} />
            {isQueueOpen && (
              <span className="w-1 h-1 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2" />
            )}
          </button>

          {/* Compact Playback & Audio Tools Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setConnectOpen(false);
                setToolsOpen(prev => !prev);
              }}
              title="Playback & Audio Tools (A–B Loop, EQ, Speed, Sleep)"
              className={`relative p-1.5 transition-colors cursor-pointer ${
                toolsOpen || hasActiveTools
                  ? 'text-spotify-green'
                  : 'text-spotify-muted hover:text-white'
              }`}
            >
              <Sliders size={15} />
              {settings.playbackRate !== 1 && (
                <span className="ml-1 text-[10px] font-bold bg-spotify-green/20 text-spotify-green px-1.5 py-0.5 rounded-full">
                  {settings.playbackRate}x
                </span>
              )}
              {hasActiveTools && (
                <span className="w-1 h-1 rounded-full bg-spotify-green absolute bottom-0 left-1/2 -translate-x-1/2" />
              )}
            </button>

            {toolsOpen && (
              <div className="absolute right-0 bottom-11 z-50">
                <AudioToolsPopover onClose={() => setToolsOpen(false)} />
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setToolsOpen(false);
                setConnectOpen(prev => !prev);
              }}
              title="Connect to a device"
              className={`p-1.5 transition-colors cursor-pointer ${
                connectOpen ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
              }`}
            >
              <ConnectDeviceIcon size={16} />
            </button>

            {connectOpen && (
              <div className="absolute right-0 bottom-11 w-72 bg-[#282828] rounded-lg shadow-2xl border border-white/10 p-3 text-white z-50">
                <div className="text-sm font-bold mb-2">Audio Output</div>
                {(audioOutputDevices.length > 0
                  ? audioOutputDevices.map(d => ({
                      id: d.deviceId,
                      name: d.label,
                      type: d.deviceId === 'default' ? 'System Default' : 'Audio Device'
                    }))
                  : CONNECT_DEVICES
                ).map(dev => {
                  const active =
                    dev.id === activeDeviceId ||
                    (activeDeviceId === 'dev-local' && dev.id === 'default');
                  return (
                    <button
                      key={dev.id}
                      onClick={() => {
                        void selectAudioOutputDevice(dev.id, dev.name);
                        setConnectOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 text-left cursor-pointer ${
                        active ? 'text-spotify-green' : 'text-white'
                      }`}
                    >
                      <Laptop size={18} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{dev.name}</p>
                        <p className="text-xs text-spotify-muted">{dev.type}</p>
                      </div>
                      {active && <Check size={16} className="text-spotify-green shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div data-testid="volume-bar" className="flex items-center gap-1.5 group w-[104px]">
            <button
              data-testid="volume-bar-toggle-mute-button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-1 text-spotify-muted hover:text-white transition-colors cursor-pointer"
            >
              <VolumeIcon level={volume} muted={isMuted} size={16} />
            </button>

            <div className="relative flex-1 h-3 flex items-center cursor-pointer">
              <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white group-hover:bg-spotify-green rounded-full"
                  style={{ width: `${volumePct}%` }}
                />
              </div>
              <div
                className="w-3 h-3 rounded-full bg-white shadow absolute -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none"
                style={{ left: `${volumePct}%` }}
              />
              <input
                type="range"
                aria-label="Change volume"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={() => setIsMiniplayer(!isMiniplayer)}
            disabled={!hasTrack}
            title="Open Miniplayer"
            className={`p-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
              isMiniplayer ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <MiniplayerIcon size={16} />
          </button>

          <button
            onClick={() => {
              if (!hasTrack && tracks.length > 0) {
                playTrack(tracks[0], tracks, null);
              }
              setIsTheaterMode(true);
            }}
            title="Theater Mode / Full screen (F)"
            className={`p-1.5 transition-colors cursor-pointer ${
              isTheaterMode ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <FullscreenIcon size={16} />
          </button>
        </div>
      </footer>
    </>
  );
};
