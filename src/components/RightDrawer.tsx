import React, { useState } from 'react';
import {
  X,
  Trash2,
  Music,
  GripVertical,
  FolderOpen,
  FileAudio,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ArrowUpDown,
  Clock,
  BookmarkPlus,
  Moon,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { CheckCircleIcon, PlusCircleIcon, Play16Icon } from './SpotifyIcons';
import { TiltedCard, SpotlightCard } from './reactbits';

const formatBitrate = (bps?: number) => {
  if (!bps || bps <= 0) return null;
  const kbps = bps > 2000 ? Math.round(bps / 1000) : Math.round(bps);
  return `${kbps} kbps`;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatQueueTime = (seconds: number) => {
  if (seconds <= 0) return '0 min';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  return `${mins} min`;
};

const formatEndTime = (date: Date | null) => {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatSecondsToMs = (sec?: number) => {
  if (!sec || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const RightDrawer: React.FC = () => {
  const {
    isRightDrawerOpen,
    rightDrawerMode,
    closeRightDrawer,
    currentTrack,
    activePlaylistId,
    playlists,
    albums,
    artists,
    playCounts,
    tracks,
    recentlyPlayedIds,
    followedArtistIds,
    toggleFollowArtist,
    queue,
    contextTracks,
    likedTrackIds,
    toggleLikeTrack,
    playTrack,
    removeFromQueue,
    reorderQueue,
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
    navigate,
    settings,
  } = usePlayer();

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [queueTab, setQueueTab] = useState<'queue' | 'recent'>('queue');
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  if (!isRightDrawerOpen) return null;

  const currentPlaylist = playlists.find(p => p.id === activePlaylistId);
  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

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

  const nextUpTrack =
    queue[0] ||
    (() => {
      if (!currentTrack || contextTracks.length === 0) return null;
      const idx = contextTracks.findIndex(t => t.id === currentTrack.id);
      return idx >= 0 && idx + 1 < contextTracks.length ? contextTracks[idx + 1] : null;
    })();

  const nextFromContext = (() => {
    if (!currentTrack || contextTracks.length === 0) return contextTracks;
    const idx = contextTracks.findIndex(t => t.id === currentTrack.id);
    if (idx === -1) return contextTracks;
    return contextTracks.slice(idx + 1);
  })();

  const handleQueueDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('application/x-spotify-queue-index', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQueueDrop = (e: React.DragEvent, toIdx: number) => {
    setDragOverIdx(null);
    const raw = e.dataTransfer.getData('application/x-spotify-queue-index');
    if (!raw) return;
    e.preventDefault();
    const fromIdx = Number(raw);
    if (Number.isInteger(fromIdx) && fromIdx !== toIdx) {
      reorderQueue(fromIdx, toIdx);
    }
  };

  const bitrateLabel = currentTrack ? formatBitrate(currentTrack.bitrate) : null;
  const sizeLabel = currentTrack ? formatFileSize(currentTrack.fileSize) : null;
  const playCount = currentTrack ? playCounts[currentTrack.id] || 0 : 0;

  return (
    <aside
      className={`hidden md:flex w-[280px] xl:w-[320px] ${
        settings.hazyMode
          ? 'border border-white/10 shadow-2xl'
          : settings.amoledMode
          ? 'bg-black border border-white/10'
          : 'bg-spotify-surface/90 backdrop-blur-2xl border border-white/[0.08]'
      } rounded-lg flex-col h-full overflow-hidden select-none shrink-0 ml-2 shadow-xl`}
      style={
        settings.hazyMode
          ? {
              backgroundColor: 'var(--hazy-panel-bg, rgba(14, 14, 20, 0.35))',
              backdropFilter: 'blur(var(--hazy-panel-blur, 20px)) saturate(175%)',
              WebkitBackdropFilter: 'blur(var(--hazy-panel-blur, 20px)) saturate(175%)',
            }
          : undefined
      }
    >
      <div className="px-4 py-3.5 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            if (rightDrawerMode === 'nowPlaying' && currentPlaylist) {
              navigate({ name: 'playlist', id: currentPlaylist.id });
            } else if (rightDrawerMode === 'nowPlaying' && currentAlbumObj) {
              navigate({
                name: 'album',
                albumName: currentAlbumObj.name,
                artistName: currentAlbumObj.artist,
              });
            }
          }}
          className="font-bold text-white text-[15px] hover:underline truncate cursor-pointer text-left"
        >
          {rightDrawerMode === 'nowPlaying' &&
            (currentPlaylist?.title || currentTrack?.album || 'Now Playing')}
          {rightDrawerMode === 'queue' && 'Queue'}
          {rightDrawerMode === 'friends' && 'Activity'}
        </button>
        <button
          onClick={closeRightDrawer}
          title="Close"
          className="w-8 h-8 rounded-full text-spotify-muted hover:text-white hover:bg-[#1f1f1f] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {rightDrawerMode === 'nowPlaying' &&
          (currentTrack ? (
            <>
              <TiltedCard
                rotateAmplitude={7}
                scaleOnHover={1.02}
                onClick={() => {
                  if (currentAlbumObj) {
                    navigate({
                      name: 'album',
                      albumName: currentAlbumObj.name,
                      artistName: currentAlbumObj.artist,
                    });
                  }
                }}
                className={`aspect-square w-full rounded-lg overflow-hidden shadow-xl bg-[#282828] flex items-center justify-center ${
                  currentAlbumObj ? 'cursor-pointer' : ''
                }`}
              >
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music size={64} className="text-spotify-muted" />
                )}
              </TiltedCard>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => {
                      if (currentAlbumObj) {
                        navigate({
                          name: 'album',
                          albumName: currentAlbumObj.name,
                          artistName: currentAlbumObj.artist,
                        });
                      }
                    }}
                    className={`text-xl font-bold text-white truncate block text-left max-w-full ${
                      currentAlbumObj ? 'hover:underline cursor-pointer' : ''
                    }`}
                  >
                    {currentTrack.title}
                  </button>
                  <div className="flex items-center gap-1.5 min-w-0">
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
                        if (currentArtistObj) navigate({ name: 'artist', id: currentArtistObj.id });
                      }}
                      className={`text-sm text-spotify-muted truncate block text-left max-w-full ${
                        currentArtistObj ? 'hover:underline hover:text-white cursor-pointer' : ''
                      }`}
                    >
                      {currentTrack.artist}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => toggleLikeTrack(currentTrack.id)}
                  className={`p-1 transition-transform hover:scale-105 cursor-pointer ${
                    isLiked ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
                  }`}
                >
                  {isLiked ? <CheckCircleIcon size={20} /> : <PlusCircleIcon size={20} />}
                </button>
              </div>

              {nextUpTrack && (
                <SpotlightCard className="bg-[#1f1f1f] rounded-lg p-4">
                  <h5 className="font-bold text-white text-sm mb-3">Next in queue</h5>
                  <div
                    onClick={() => playTrack(nextUpTrack)}
                    className="flex items-center gap-3 p-1.5 -mx-1.5 rounded hover:bg-white/10 cursor-pointer group"
                  >
                    <div className="relative w-11 h-11 shrink-0 rounded overflow-hidden bg-[#282828] flex items-center justify-center">
                      {nextUpTrack.coverUrl ? (
                        <img
                          src={nextUpTrack.coverUrl}
                          alt={nextUpTrack.title}
                          className="w-11 h-11 object-cover"
                        />
                      ) : (
                        <Music size={16} className="text-spotify-muted" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play16Icon size={14} className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{nextUpTrack.title}</p>
                      <p className="text-xs text-spotify-muted truncate">{nextUpTrack.artist}</p>
                    </div>
                  </div>
                </SpotlightCard>
              )}

              {/* About the Artist Card (Spotify Now Playing style) */}
              {currentArtistObj && (
                <SpotlightCard className="bg-[#1f1f1f] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-sm">About the artist</h5>
                    <button
                      onClick={() => navigate({ name: 'artist', id: currentArtistObj.id })}
                      className="text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                  <div
                    onClick={() => navigate({ name: 'artist', id: currentArtistObj.id })}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#282828] flex items-center justify-center shrink-0">
                      {currentArtistObj.coverUrl ? (
                        <img
                          src={currentArtistObj.coverUrl}
                          alt={currentArtistObj.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music size={18} className="text-spotify-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white group-hover:underline truncate">
                        {currentArtistObj.name}
                      </p>
                      <p className="text-xs text-spotify-muted">
                        {currentArtistObj.trackIds.length} songs in library
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollowArtist(currentArtistObj.id)}
                    className={`px-4 py-1 rounded-full border text-xs font-bold cursor-pointer transition-colors ${
                      followedArtistIds.includes(currentArtistObj.id)
                        ? 'border-spotify-green text-spotify-green'
                        : 'border-white/30 text-white hover:border-white'
                    }`}
                  >
                    {followedArtistIds.includes(currentArtistObj.id) ? 'Following' : 'Follow'}
                  </button>
                </SpotlightCard>
              )}

              {/* Credits Card */}
              <SpotlightCard className="bg-[#1f1f1f] rounded-lg p-4 space-y-2 text-xs">
                <h5 className="font-bold text-white text-sm mb-1">Credits</h5>
                <div className="flex justify-between gap-2">
                  <span className="text-spotify-muted">Performed by</span>
                  <span className="text-white font-medium text-right truncate">
                    {currentTrack.artist}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-spotify-muted">Album</span>
                  <span className="text-white font-medium text-right truncate">
                    {currentTrack.album}
                  </span>
                </div>
                {currentTrack.genre && (
                  <div className="flex justify-between gap-2">
                    <span className="text-spotify-muted">Genre</span>
                    <span className="text-white font-medium text-right truncate">
                      {currentTrack.genre}
                    </span>
                  </div>
                )}
              </SpotlightCard>

              {/* Local Audio File Info Card */}
              <SpotlightCard className="bg-[#1f1f1f] rounded-lg p-4">
                <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-white font-bold">
                  <span className="flex items-center gap-1.5">
                    <FileAudio size={14} className="text-spotify-green" />
                    <span>File Details</span>
                  </span>
                  {currentTrack.codec && (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] uppercase tracking-wider">
                      {currentTrack.codec}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-y-1.5 text-spotify-muted">
                  <span>Album</span>
                  <span className="text-white text-right truncate">{currentTrack.album}</span>

                  {bitrateLabel && (
                    <>
                      <span>Bitrate</span>
                      <span className="text-white text-right">{bitrateLabel}</span>
                    </>
                  )}
                  {currentTrack.sampleRate && (
                    <>
                      <span>Sample rate</span>
                      <span className="text-white text-right">
                        {(currentTrack.sampleRate / 1000).toFixed(1)} kHz
                      </span>
                    </>
                  )}
                  {sizeLabel && (
                    <>
                      <span>Size</span>
                      <span className="text-white text-right">{sizeLabel}</span>
                    </>
                  )}
                  {currentTrack.year && (
                    <>
                      <span>Year</span>
                      <span className="text-white text-right">{currentTrack.year}</span>
                    </>
                  )}
                  <span>Local plays</span>
                  <span className="text-white text-right">{playCount}</span>
                </div>

                {window.electronAPI &&
                  currentTrack.sourceKey &&
                  !currentTrack.sourceKey.startsWith('idb:') && (
                    <button
                      onClick={() => {
                        if (currentTrack.sourceKey && !currentTrack.sourceKey.startsWith('idb:')) {
                          void window.electronAPI?.showInExplorer(currentTrack.sourceKey);
                        }
                      }}
                      className="mt-1 w-full py-1.5 rounded-full border border-white/15 hover:border-white text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FolderOpen size={13} />
                      <span>Show in Explorer</span>
                    </button>
                  )}
                </div>
              </SpotlightCard>
            </>
          ) : (
            <div className="text-sm text-spotify-muted py-12 text-center">
              Nothing playing right now.
            </div>
          ))}

        {rightDrawerMode === 'queue' && (
          <div className="space-y-5">
            {/* Spotify Queue / Recently Played Tabs */}
            <div className="flex items-center gap-4 border-b border-white/10 pb-2 text-xs font-bold">
              <button
                onClick={() => setQueueTab('queue')}
                className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                  queueTab === 'queue'
                    ? 'text-white border-spotify-green'
                    : 'text-spotify-muted border-transparent hover:text-white'
                }`}
              >
                Queue
              </button>
              <button
                onClick={() => setQueueTab('recent')}
                className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                  queueTab === 'recent'
                    ? 'text-white border-spotify-green'
                    : 'text-spotify-muted border-transparent hover:text-white'
                }`}
              >
                Recently played
              </button>
            </div>

            {queueTab === 'recent' ? (
              <div className="space-y-1">
                {recentlyPlayedIds.length > 0 ? (
                  recentlyPlayedIds
                    .map(id => tracks.find(t => t.id === id))
                    .filter((t): t is NonNullable<typeof t> => Boolean(t))
                    .map(t => (
                      <div
                        key={t.id}
                        onClick={() => playTrack(t)}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                          {t.coverUrl ? (
                            <img src={t.coverUrl} alt={t.title} className="w-10 h-10 object-cover" />
                          ) : (
                            <Music size={16} className="text-spotify-muted" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{t.title}</p>
                          <div className="flex items-center gap-1 min-w-0">
                            {t.explicit && (
                              <span
                                title="Explicit"
                                className="bg-[#b3b3b3] text-black text-[8px] font-bold rounded-[2px] w-3 h-3 inline-flex items-center justify-center leading-none mr-0.5 select-none shrink-0"
                              >
                                E
                              </span>
                            )}
                            <p className="text-xs text-spotify-muted truncate">{t.artist}</p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-spotify-muted py-10 text-center">
                    No recently played tracks yet.
                  </p>
                )}
              </div>
            ) : (
              <>
            {/* Queue Duration & Timer Summary */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <Clock size={13} className="text-spotify-green" />
                  <span>Queue Timer</span>
                </div>
                <span className="text-spotify-muted font-medium">
                  {(currentTrack ? 1 : 0) + queue.length} track{(currentTrack ? 1 : 0) + queue.length === 1 ? '' : 's'} • {formatQueueTime(queueRemainingSec)}
                </span>
              </div>

              {queueEstimatedEndTime && (
                <div className="text-[11px] text-spotify-muted flex items-center justify-between">
                  <span>Estimated finish:</span>
                  <span className="text-white font-semibold">Ends at {formatEndTime(queueEstimatedEndTime)}</span>
                </div>
              )}

              {/* Active Timer Status / Actions */}
              <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                {sleepTimer?.kind === 'end-of-queue' ? (
                  <div className="w-full flex items-center justify-between bg-spotify-green/15 text-spotify-green px-2.5 py-1.5 rounded-md text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Moon size={13} />
                      <span>Stops when queue finishes</span>
                    </span>
                    <button
                      onClick={() => startSleepTimer(null)}
                      className="text-[11px] font-bold underline cursor-pointer hover:opacity-80"
                    >
                      Turn off
                    </button>
                  </div>
                ) : sleepTimer?.kind === 'until' ? (
                  <div className="w-full flex items-center justify-between bg-blue-500/15 text-blue-400 px-2.5 py-1.5 rounded-md text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Moon size={13} />
                      <span>Timer: {formatSecondsToMs(sleepRemainingSec || 0)} remaining</span>
                    </span>
                    <button
                      onClick={() => startSleepTimer(null)}
                      className="text-[11px] font-bold underline cursor-pointer hover:opacity-80"
                    >
                      Cancel
                    </button>
                  </div>
                ) : sleepTimer?.kind === 'end-of-track' ? (
                  <div className="w-full flex items-center justify-between bg-purple-500/15 text-purple-300 px-2.5 py-1.5 rounded-md text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Moon size={13} />
                      <span>Pauses after this song</span>
                    </span>
                    <button
                      onClick={() => startSleepTimer(null)}
                      className="text-[11px] font-bold underline cursor-pointer hover:opacity-80"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => startSleepTimer('end-of-queue')}
                      title="Stop playback after current track + queue finish"
                      className="flex-1 py-1 px-2 rounded-md bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Moon size={12} className="text-spotify-green" />
                      <span>Stop on queue end</span>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowTimerMenu(prev => !prev)}
                        className="py-1 px-2.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Clock size={12} />
                        <span>Timer ▾</span>
                      </button>
                      {showTimerMenu && (
                        <div className="absolute right-0 bottom-full mb-1 w-36 bg-[#282828] border border-white/15 rounded-lg shadow-xl p-1 z-30 space-y-0.5 text-xs">
                          {[15, 30, 45, 60].map(m => (
                            <button
                              key={m}
                              onClick={() => {
                                startSleepTimer(m);
                                setShowTimerMenu(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-white cursor-pointer"
                            >
                              {m} minutes
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              startSleepTimer('end-of-track');
                              setShowTimerMenu(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-white cursor-pointer border-t border-white/10"
                          >
                            End of track
                          </button>
                          <button
                            onClick={() => {
                              startSleepTimer('end-of-queue');
                              setShowTimerMenu(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-white cursor-pointer"
                          >
                            End of queue
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Queue Adjust Actions: Shuffle, Reverse, Save, Clear */}
            {queue.length > 0 && (
              <div className="flex items-center gap-1.5 py-0.5">
                <button
                  onClick={shuffleQueue}
                  title="Shuffle upcoming queue"
                  className="flex-1 py-1.5 px-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Shuffle size={12} />
                  <span>Shuffle</span>
                </button>
                <button
                  onClick={reverseQueue}
                  title="Reverse upcoming queue"
                  className="flex-1 py-1.5 px-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowUpDown size={12} />
                  <span>Reverse</span>
                </button>
                <button
                  onClick={() => saveQueueAsPlaylist()}
                  title="Save queue as playlist"
                  className="py-1.5 px-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <BookmarkPlus size={12} />
                  <span className="hidden xl:inline">Save</span>
                </button>
                <button
                  onClick={clearQueue}
                  title="Clear entire queue"
                  className="py-1.5 px-2.5 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-spotify-muted text-[11px] font-bold flex items-center transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}

            {currentTrack ? (
              <div>
                <h4 className="text-xs font-bold text-spotify-muted mb-2">Now playing</h4>
                <div className="flex items-center gap-3 p-2 rounded-md bg-white/5">
                  <div className="w-11 h-11 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                    {currentTrack.coverUrl ? (
                      <img
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="w-11 h-11 object-cover"
                      />
                    ) : (
                      <Music size={16} className="text-spotify-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-spotify-green truncate">
                      {currentTrack.title}
                    </p>
                    <div className="flex items-center gap-1 min-w-0">
                      {currentTrack.explicit && (
                        <span
                          title="Explicit"
                          className="bg-[#b3b3b3] text-black text-[8px] font-bold rounded-[2px] w-3 h-3 inline-flex items-center justify-center leading-none mr-0.5 select-none shrink-0"
                        >
                          E
                        </span>
                      )}
                      <p className="text-xs text-spotify-muted truncate">{currentTrack.artist}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-spotify-muted py-10 text-center">
                Your queue is empty.
              </div>
            )}

            {queue.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-spotify-muted">
                    Next in queue ({queue.length})
                  </h4>
                  <span className="text-[10px] text-spotify-muted">Drag or use arrows to adjust</span>
                </div>
                <div className="space-y-1">
                  {queue.map((t, i) => (
                    <div
                      key={`${t.id}-${i}`}
                      draggable
                      onDragStart={e => handleQueueDragStart(e, i)}
                      onDragOver={e => {
                        if (e.dataTransfer.types.includes('application/x-spotify-queue-index')) {
                          e.preventDefault();
                          setDragOverIdx(i);
                        }
                      }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={e => handleQueueDrop(e, i)}
                      onClick={() => playTrack(t)}
                      className={`flex items-center gap-2 p-1.5 rounded-md hover:bg-white/10 cursor-pointer group ${
                        dragOverIdx === i ? 'border-t-2 border-spotify-green bg-white/10' : ''
                      }`}
                    >
                      <GripVertical
                        size={14}
                        className="text-spotify-muted opacity-40 group-hover:opacity-100 cursor-grab shrink-0"
                      />
                      <div className="w-9 h-9 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                        {t.coverUrl ? (
                          <img src={t.coverUrl} alt={t.title} className="w-9 h-9 object-cover" />
                        ) : (
                          <Music size={15} className="text-spotify-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <div className="flex items-center gap-1 min-w-0">
                          {t.explicit && (
                            <span
                              title="Explicit"
                              className="bg-[#b3b3b3] text-black text-[8px] font-bold rounded-[2px] w-3 h-3 inline-flex items-center justify-center leading-none mr-0.5 select-none shrink-0"
                            >
                              E
                            </span>
                          )}
                          <p className="text-xs text-spotify-muted truncate">{t.artist}</p>
                        </div>
                      </div>

                      {/* Track Duration badge */}
                      {t.duration > 0 && (
                        <span className="text-[11px] text-spotify-muted group-hover:hidden shrink-0">
                          {formatSecondsToMs(t.duration)}
                        </span>
                      )}

                      {/* Per-item Move Up, Move Down, Delete buttons on hover */}
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          disabled={i === 0}
                          onClick={e => {
                            e.stopPropagation();
                            moveQueueItem(i, i - 1);
                          }}
                          title="Move Up"
                          className={`p-1 rounded hover:bg-white/15 ${
                            i === 0 ? 'text-white/20 cursor-not-allowed' : 'text-spotify-muted hover:text-white cursor-pointer'
                          }`}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          disabled={i === queue.length - 1}
                          onClick={e => {
                            e.stopPropagation();
                            moveQueueItem(i, i + 1);
                          }}
                          title="Move Down"
                          className={`p-1 rounded hover:bg-white/15 ${
                            i === queue.length - 1 ? 'text-white/20 cursor-not-allowed' : 'text-spotify-muted hover:text-white cursor-pointer'
                          }`}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeFromQueue(i);
                          }}
                          title="Remove from queue"
                          className="p-1 rounded hover:bg-white/15 text-spotify-muted hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nextFromContext.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-spotify-muted mb-2">
                  Next from: {currentPlaylist?.title || 'Local Files'}
                </h4>
                <div className="space-y-1">
                  {nextFromContext.map(t => (
                    <div
                      key={t.id}
                      onClick={() => playTrack(t)}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                        {t.coverUrl ? (
                          <img src={t.coverUrl} alt={t.title} className="w-10 h-10 object-cover" />
                        ) : (
                          <Music size={16} className="text-spotify-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <div className="flex items-center gap-1 min-w-0">
                          {t.explicit && (
                            <span
                              title="Explicit"
                              className="bg-[#b3b3b3] text-black text-[8px] font-bold rounded-[2px] w-3 h-3 inline-flex items-center justify-center leading-none mr-0.5 select-none shrink-0"
                            >
                              E
                            </span>
                          )}
                          <p className="text-xs text-spotify-muted truncate">{t.artist}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {rightDrawerMode === 'friends' && (
          <div className="text-sm text-spotify-muted py-12 text-center">
            Offline private listening mode is active. All stats stay locally on your device.
          </div>
        )}
      </div>
    </aside>
  );
};
