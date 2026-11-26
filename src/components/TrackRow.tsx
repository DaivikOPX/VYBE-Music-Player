import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  ListPlus,
  ListStart,
  Plus,
  Trash2,
  Music,
  Disc3,
  User,
  FolderOpen,
  GripVertical,
  Copy,
  Pencil,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import { Track } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { TrackDetailsModal } from './TrackDetailsModal';
import {
  Play16Icon,
  Pause16Icon,
  PlusCircleIcon,
  CheckCircleIcon,
  EqualizerBars,
} from './SpotifyIcons';

interface TrackRowProps {
  track: Track;
  index: number;
  contextList: Track[];
  playlistId?: string | null;
  canRemoveFromPlaylist?: boolean;
  draggableReorder?: boolean;
  onReorderDrop?: (fromIndex: number, toIndex: number) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (trackId: string) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  contextList,
  playlistId = null,
  canRemoveFromPlaylist = false,
  draggableReorder = false,
  onReorderDrop,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLikeTrack,
    playNextInQueue,
    addToQueue,
    playlists,
    albums,
    artists,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    removeTrackFromLibrary,
    toggleTrackExplicit,
    missingTrackIds,
    disconnectedDriveTrackIds,
    showToast,
    navigate,
    settings,
  } = usePlayer();
  const [editingTags, setEditingTags] = useState(false);
  const isMissingFile = missingTrackIds.includes(track.id);
  const isDisconnectedDrive = disconnectedDriveTrackIds?.includes(track.id);

  const [menuState, setMenuState] = useState<{
    mode: 'button' | 'cursor';
    x: number;
    y: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState(null);
      }
    };
    const closeEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuState(null);
    };
    if (menuState) {
      window.addEventListener('mousedown', close);
      window.addEventListener('keydown', closeEsc);
    }
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', closeEsc);
    };
  }, [menuState]);

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;
  const isLiked = likedTrackIds.includes(track.id);
  const isCompact = settings.compactMode;

  const matchedAlbum = albums.find(
    a =>
      a.trackIds.includes(track.id) ||
      (a.name.toLowerCase() === track.album.toLowerCase() &&
        a.artist.toLowerCase() === track.artist.toLowerCase())
  );
  const matchedArtist = artists.find(
    a =>
      a.trackIds.includes(track.id) ||
      a.name.toLowerCase() === track.artist.toLowerCase()
  );

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return '-:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, contextList, playlistId);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectable || e.ctrlKey || e.metaKey || e.shiftKey) {
      if (onToggleSelect) {
        e.stopPropagation();
        onToggleSelect(track.id);
        return;
      }
    }
    handlePlay();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 245);
    const y = Math.min(e.clientY, window.innerHeight - 360);
    setMenuState({ mode: 'cursor', x: Math.max(8, x), y: Math.max(8, y) });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-spotify-track-id', track.id);
    if (draggableReorder) {
      e.dataTransfer.setData('application/x-spotify-reorder-index', String(index));
    }
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOverRow = (e: React.DragEvent) => {
    if (!draggableReorder || !onReorderDrop) return;
    if (e.dataTransfer.types.includes('application/x-spotify-reorder-index')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }
  };

  const handleDropRow = (e: React.DragEvent) => {
    setDragOver(false);
    if (!draggableReorder || !onReorderDrop) return;
    const raw = e.dataTransfer.getData('application/x-spotify-reorder-index');
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    const fromIdx = Number(raw);
    if (Number.isInteger(fromIdx) && fromIdx !== index) {
      onReorderDrop(fromIdx, index);
    }
  };

  const userCreatedPlaylists = playlists.filter(p => p.isUserCreated);

  const renderMenuContent = () => (
    <div
      onClick={e => e.stopPropagation()}
      className="w-56 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1.5 text-[13px] text-white z-50 max-h-[75vh] overflow-y-auto animate-pop-in"
    >
      <button
        onClick={() => {
          playNextInQueue(track);
          setMenuState(null);
        }}
        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
      >
        <ListStart size={15} className="text-spotify-muted" />
        <span>Play next</span>
      </button>

      <button
        onClick={() => {
          addToQueue(track);
          setMenuState(null);
        }}
        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
      >
        <ListPlus size={15} className="text-spotify-muted" />
        <span>Add to queue</span>
      </button>

      <button
        onClick={() => {
          toggleLikeTrack(track.id);
          setMenuState(null);
        }}
        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
      >
        <Plus size={15} className="text-spotify-muted" />
        <span>{isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</span>
      </button>

      {(matchedAlbum || matchedArtist) && (
        <>
          <div className="my-1 border-t border-white/10" />
          {matchedArtist && (
            <button
              onClick={() => {
                navigate({ name: 'artist', id: matchedArtist.id });
                setMenuState(null);
              }}
              className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
            >
              <User size={15} className="text-spotify-muted" />
              <span>Go to artist</span>
            </button>
          )}
          {matchedAlbum && (
            <button
              onClick={() => {
                navigate({
                  name: 'album',
                  albumName: matchedAlbum.name,
                  artistName: matchedAlbum.artist,
                });
                setMenuState(null);
              }}
              className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
            >
              <Disc3 size={15} className="text-spotify-muted" />
              <span>Go to album</span>
            </button>
          )}
        </>
      )}

      {userCreatedPlaylists.length > 0 && (
        <>
          <div className="my-1 border-t border-white/10" />
          <div className="px-3 py-1 text-[11px] font-bold text-spotify-muted">
            Add to playlist
          </div>
          {userCreatedPlaylists.map(pl => (
            <button
              key={pl.id}
              onClick={() => {
                addTrackToPlaylist(pl.id, track.id);
                setMenuState(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-white/10 truncate cursor-pointer"
            >
              + {pl.title}
            </button>
          ))}
        </>
      )}

      {window.electronAPI && track.sourceKey && !track.sourceKey.startsWith('idb:') && (
        <>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={() => {
              if (track.sourceKey && !track.sourceKey.startsWith('idb:')) {
                void window.electronAPI?.showInExplorer(track.sourceKey);
              }
              setMenuState(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
          >
            <FolderOpen size={15} className="text-spotify-muted" />
            <span>Show in Explorer</span>
          </button>
        </>
      )}

      {track.sourceKey && (
        <button
          onClick={() => {
            const pathLabel = track.sourceKey?.includes('::')
              ? track.sourceKey.split('::')[0]
              : track.sourceKey || track.title;
            const tryCopy = async () => {
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(pathLabel);
                  showToast('Copied file path');
                  return;
                }
              } catch {
                // fallback below
              }
              try {
                const ta = document.createElement('textarea');
                ta.value = pathLabel;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('Copied file path');
              } catch {
                showToast('Could not copy file path');
              }
            };
            void tryCopy();
            setMenuState(null);
          }}
          className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
        >
          <Copy size={15} className="text-spotify-muted" />
          <span>Copy file path</span>
        </button>
      )}

      <button
        onClick={() => {
          toggleTrackExplicit(track.id);
          setMenuState(null);
        }}
        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
      >
        <span className="bg-[#b3b3b3] text-black text-[9px] font-bold rounded-[2px] w-3.5 h-3.5 inline-flex items-center justify-center leading-none shrink-0">
          E
        </span>
        <span>{track.explicit ? 'Remove Explicit tag' : 'Mark as Explicit'}</span>
      </button>

      <button
        onClick={() => {
          setEditingTags(true);
          setMenuState(null);
        }}
        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer text-spotify-green font-medium"
      >
        <Pencil size={15} className="text-spotify-green" />
        <span>Edit song details & cover...</span>
      </button>

      {canRemoveFromPlaylist && playlistId && (
        <>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={() => {
              removeTrackFromPlaylist(playlistId, track.id);
              setMenuState(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-white/10 text-orange-300 flex items-center gap-2.5 cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Remove from playlist</span>
          </button>
        </>
      )}

      <div className="my-1 border-t border-white/10" />
      <button
        onClick={() => {
          removeTrackFromLibrary(track.id);
          setMenuState(null);
        }}
        className="w-full px-3 py-2 text-left hover:bg-white/10 text-red-400 flex items-center gap-2.5 cursor-pointer"
      >
        <Trash2 size={15} />
        <span>Remove from library</span>
      </button>
    </div>
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOverRow}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDropRow}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={e => {
        const t = e.touches[0];
        if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={e => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        const t = e.changedTouches[0];
        if (!start || !t) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (dx > 64 && Math.abs(dy) < 30) {
          addToQueue(track);
        }
      }}
      className={`grid grid-cols-[28px_1fr_auto] md:grid-cols-[32px_4fr_2fr_1.2fr_100px] items-center gap-3 md:gap-4 px-3 md:px-4 rounded-md transition-colors duration-150 group text-sm select-none cursor-pointer ${
        selected ? 'bg-spotify-green/20 hover:bg-spotify-green/25 border-l-2 border-spotify-green' : isCurrent ? 'bg-white/[0.06] hover:bg-white/12' : 'hover:bg-white/10'
      } ${isCompact ? 'py-1' : 'py-2'} ${
        dragOver ? 'border-t-2 border-spotify-green bg-white/10' : ''
      }`}
    >
      <div className="flex items-center justify-center w-8 shrink-0 relative">
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={e => {
              e.stopPropagation();
              onToggleSelect?.(track.id);
            }}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded accent-spotify-green cursor-pointer"
          />
        ) : (
          <>
            {draggableReorder && (
              <GripVertical
                size={12}
                className="hidden md:block absolute -left-3 text-spotify-muted opacity-0 group-hover:opacity-60 cursor-grab"
              />
            )}
            {isThisPlaying ? (
              <>
                <div className="group-hover:hidden">
                  <EqualizerBars />
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePlay();
                  }}
                  className="hidden group-hover:flex items-center justify-center text-white cursor-pointer"
                  title="Pause"
                >
                  <Pause16Icon size={14} />
                </button>
              </>
            ) : (
              <>
                <span
                  className={`group-hover:hidden tabular-nums text-sm ${
                    isCurrent ? 'text-spotify-green' : 'text-spotify-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePlay();
                  }}
                  className="hidden group-hover:flex items-center justify-center text-white cursor-pointer"
                  title={`Play ${track.title}`}
                >
                  <Play16Icon size={14} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0">
        {!isCompact && (
          <div className="w-10 h-10 rounded-[4px] bg-[#282828] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {track.coverUrl ? (
              <img src={track.coverUrl} alt={track.title} className="w-10 h-10 object-cover" />
            ) : (
              <Music size={16} className="text-spotify-muted" />
            )}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p
              className={`font-medium truncate ${isCompact ? 'text-[13px]' : ''} ${
                isCurrent ? 'text-spotify-green' : 'text-white'
              }`}
            >
              {track.title}
            </p>
            {settings.showFormatBadges && (track.codec || track.bitDepth || track.sampleRate) && (
              <span className="hidden sm:inline-block shrink-0 px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold uppercase tracking-wider text-white/75">
                {[
                  track.codec,
                  track.bitDepth ? `${track.bitDepth}b` : '',
                  track.sampleRate ? `${Math.round(track.sampleRate / 1000)}kHz` : '',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            )}
            {isDisconnectedDrive ? (
              <span
                title="External USB/drive is unplugged. Connect drive to play."
                className="text-cyan-400 shrink-0 inline-flex items-center gap-1 text-[10px] bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold"
              >
                <HardDrive size={11} /> USB Drive
              </span>
            ) : isMissingFile ? (
              <span
                title="File not found at original path"
                className="text-amber-400 shrink-0 inline-flex items-center"
              >
                <AlertTriangle size={13} />
              </span>
            ) : null}
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(track.id)}
                onClick={e => e.stopPropagation()}
                className="accent-spotify-green ml-1 cursor-pointer"
                title="Select track for bulk edit"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            {track.explicit && (
              <span
                title="Explicit"
                className="bg-[#b3b3b3] text-black text-[9px] font-bold rounded-[2px] w-3.5 h-3.5 inline-flex items-center justify-center leading-none mr-0.5 select-none shrink-0"
              >
                E
              </span>
            )}
            <button
              onClick={e => {
                if (!matchedArtist) return;
                e.stopPropagation();
                navigate({ name: 'artist', id: matchedArtist.id });
              }}
              className={`text-xs text-spotify-muted truncate block text-left max-w-full ${
                matchedArtist ? 'hover:underline hover:text-white cursor-pointer' : 'cursor-default'
              }`}
            >
              {track.artist}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block text-[13px] truncate">
        <button
          onClick={e => {
            if (!matchedAlbum) return;
            e.stopPropagation();
            navigate({
              name: 'album',
              albumName: matchedAlbum.name,
              artistName: matchedAlbum.artist,
            });
          }}
          className={`text-spotify-muted truncate max-w-full block text-left ${
            matchedAlbum ? 'hover:underline hover:text-white cursor-pointer' : 'cursor-default'
          }`}
        >
          {track.album}
        </button>
      </div>

      <div className="hidden md:block text-spotify-muted text-[13px] truncate">
        {track.dateAdded}
      </div>

      <div
        className="flex items-center justify-end gap-3 relative"
        ref={menuRef}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => toggleLikeTrack(track.id)}
          title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
          className={`transition-all cursor-pointer ${
            isLiked
              ? 'text-spotify-green opacity-100'
              : 'text-spotify-muted hover:text-white md:opacity-0 md:group-hover:opacity-100'
          }`}
        >
          {isLiked ? <CheckCircleIcon size={16} /> : <PlusCircleIcon size={16} />}
        </button>

        <span className="text-[13px] text-spotify-muted tabular-nums w-10 text-right">
          {formatTime(track.duration)}
        </span>

        <button
          onClick={e => {
            e.stopPropagation();
            setMenuState(prev =>
              prev?.mode === 'button' ? null : { mode: 'button', x: 0, y: 0 }
            );
          }}
          title="More options"
          className="text-spotify-muted hover:text-white md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 p-1 cursor-pointer"
        >
          <MoreHorizontal size={16} />
        </button>

        {menuState?.mode === 'button' && (
          <div className="absolute right-0 top-8 z-50">{renderMenuContent()}</div>
        )}

        {menuState?.mode === 'cursor' && (
          <div
            className="fixed z-50"
            style={{ left: `${menuState.x}px`, top: `${menuState.y}px` }}
          >
            {renderMenuContent()}
          </div>
        )}
      </div>

      {/* Song Details, Photo Upload & Rename Modal */}
      <TrackDetailsModal
        track={track}
        isOpen={editingTags}
        onClose={() => setEditingTags(false)}
      />
    </div>
  );
};
