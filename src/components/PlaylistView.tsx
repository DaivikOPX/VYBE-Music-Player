import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Heart,
  Music,
  Search,
  Pencil,
  Check,
  Plus,
  FolderOpen,
  FileAudio,
  Pin,
  Trash2,
  MoreHorizontal,
  Camera,
  RefreshCw,
  Download,
  ListPlus,
  Copy,
  Wand2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types';
import { VirtualizedTrackList } from './VirtualizedTrackList';
import { BatchMetadataForm } from './BatchMetadataForm';
import { PlaylistCoverModal } from './PlaylistCoverModal';
import { TiltedCard, BlurText, ShinyText, ClickSpark } from './reactbits';
import {
  PlayTriangleIcon,
  Pause16Icon,
  ShuffleIcon,
  PlusCircleIcon,
  CheckCircleIcon,
} from './SpotifyIcons';

interface PlaylistViewProps {
  playlistId: string;
}

const resizeCoverToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 400;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId }) => {
  const {
    playlists,
    tracks,
    watchedFolders,
    activePlaylistId,
    isPlaying,
    playPlaylist,
    isShuffle,
    toggleShuffle,
    savedPlaylistIds,
    toggleSavePlaylist,
    togglePinPlaylist,
    renamePlaylist,
    updatePlaylistCover,
    deletePlaylist,
    createPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    addToQueue,
    showToast,
    reorderPlaylistTracks,
    pickNativeAudioFiles,
    pickNativeAudioFolder,
    rescanWatchedFolders,
    settings,
    navigate,
  } = usePlayer();

  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<'custom' | 'title' | 'artist' | 'album' | 'duration' | 'dateAdded'>('custom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [addSearch, setAddSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [coverGeneratorOpen, setCoverGeneratorOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [moreMenuOpen]);

  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) {
    return (
      <div className="p-8 text-center">
        <p className="text-spotify-muted mb-4">Playlist not found.</p>
        <button
          onClick={() => navigate({ name: 'home' })}
          className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold cursor-pointer"
        >
          Back Home
        </button>
      </div>
    );
  }

  const playlistTracks = playlist.trackIds
    .map(id => tracks.find(t => t.id === id))
    .filter((t): t is Track => Boolean(t));

  const filteredTracks = filterQuery.trim()
    ? playlistTracks.filter(
        t =>
          t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.album.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : playlistTracks;

  const handleHeaderSort = (field: 'custom' | 'title' | 'album' | 'dateAdded' | 'duration') => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const visibleTracks =
    sortBy === 'custom'
      ? (sortDirection === 'asc' ? filteredTracks : [...filteredTracks].reverse())
      : [...filteredTracks].sort((a, b) => {
          let cmp = 0;
          if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
          else if (sortBy === 'artist') cmp = a.artist.localeCompare(b.artist);
          else if (sortBy === 'album') cmp = a.album.localeCompare(b.album);
          else if (sortBy === 'dateAdded') cmp = (a.addedAt || 0) - (b.addedAt || 0);
          else if (sortBy === 'duration') cmp = a.duration - b.duration;
          return sortDirection === 'asc' ? cmp : -cmp;
        });

  const totalMinutes = Math.round(
    playlistTracks.reduce((acc, t) => acc + t.duration, 0) / 60
  );

  const isThisPlaying = isPlaying && activePlaylistId === playlist.id;
  const isSaved = savedPlaylistIds.includes(playlist.id);

  // Use first track's cover for user playlist collage fallback if no custom coverUrl was chosen
  const fallbackCover = !playlist.coverUrl
    ? playlistTracks.find(t => t.coverUrl)?.coverUrl || ''
    : '';

  const availableToAdd = tracks
    .filter(t => !playlist.trackIds.includes(t.id))
    .filter(
      t =>
        !addSearch.trim() ||
        t.title.toLowerCase().includes(addSearch.toLowerCase()) ||
        t.artist.toLowerCase().includes(addSearch.toLowerCase())
    );

  const baseBg = settings.amoledMode ? '#000000' : '#121212';

  const startEdit = () => {
    if (!playlist.isUserCreated) return;
    setDraftTitle(playlist.title);
    setDraftDesc(playlist.description || '');
    setEditing(true);
  };

  const commitEdit = () => {
    renamePlaylist(playlist.id, draftTitle, draftDesc);
    setEditing(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeCoverToDataUrl(file);
      updatePlaylistCover(playlist.id, dataUrl);
    } catch {
      // Ignore unreadable image
    }
  };

  return (
    <div className="min-h-full">
      {/* Hidden Custom Cover Input */}
      {playlist.isUserCreated && (
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={e => void handleCoverUpload(e)}
          className="hidden"
        />
      )}

      {/* Header */}
      <div
        className="px-4 md:px-6 pt-8 md:pt-12 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-5 md:gap-6"
        style={{
          background: `linear-gradient(to bottom, ${playlist.accentColor}, ${baseBg}d9)`,
        }}
      >
        <TiltedCard
          rotateAmplitude={9}
          scaleOnHover={1.02}
          onClick={() => {
            if (playlist.isUserCreated) setCoverGeneratorOpen(true);
          }}
          className={`relative w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.6)] rounded-md overflow-hidden group ${
            playlist.isUserCreated ? 'cursor-pointer' : ''
          }`}
        >
          {playlist.isLikedSongs ? (
            <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#6033e3] to-[#c4efd9] flex items-center justify-center">
              <Heart size={72} className="text-white fill-white" />
            </div>
          ) : playlist.isLocalFiles ? (
            <div className="w-full h-full bg-[#006450] flex items-center justify-center">
              <FolderOpen size={72} className="text-spotify-green" />
            </div>
          ) : playlist.coverUrl || fallbackCover ? (
            <img
              src={playlist.coverUrl || fallbackCover}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#282828] flex items-center justify-center text-spotify-muted">
              <Music size={60} />
            </div>
          )}

          {playlist.isUserCreated && (
            <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-white">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setCoverGeneratorOpen(true);
                }}
                className="w-full max-w-[130px] py-1.5 px-3 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                <Wand2 size={13} />
                <span>Design Cover</span>
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  coverInputRef.current?.click();
                }}
                className="w-full max-w-[130px] py-1.5 px-3 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1.5 backdrop-blur-sm transition-colors cursor-pointer"
              >
                <Camera size={13} />
                <span>Upload Photo</span>
              </button>
            </div>
          )}
        </TiltedCard>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <ShinyText text="Playlist" className="text-xs font-bold uppercase tracking-wider" />

          {editing && playlist.isUserCreated ? (
            <div className="space-y-2 my-2 max-w-lg">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  autoFocus
                  className="bg-white/10 text-white font-black text-2xl md:text-4xl px-3 py-1 rounded outline-none ring-2 ring-white w-full"
                />
                <button
                  onClick={commitEdit}
                  className="p-2 bg-spotify-green text-black rounded-full cursor-pointer shrink-0"
                  title="Save"
                >
                  <Check size={20} />
                </button>
              </div>
              <input
                type="text"
                value={draftDesc}
                onChange={e => setDraftDesc(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                placeholder="Add an optional description"
                className="bg-white/10 text-white text-sm px-3 py-1.5 rounded outline-none focus:ring-1 focus:ring-white/60 w-full placeholder:text-white/40"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-3 group">
              <h1
                onClick={startEdit}
                className={`text-3xl md:text-5xl font-bold text-white tracking-tight my-2 truncate ${
                  playlist.isUserCreated ? 'cursor-pointer hover:underline' : ''
                }`}
              >
                <BlurText text={playlist.title} />
              </h1>
              {playlist.isUserCreated && (
                <button
                  onClick={startEdit}
                  title="Edit playlist details"
                  className="opacity-0 group-hover:opacity-100 text-spotify-muted hover:text-white cursor-pointer"
                >
                  <Pencil size={18} />
                </button>
              )}
            </div>
          )}

          {playlist.description && (
            <p className="text-sm text-white/75 line-clamp-2 mb-3">{playlist.description}</p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-sm text-white">
            <span className="font-bold">{playlist.owner}</span>
            <span className="text-white/70">•</span>
            <span className="text-white/80">
              {playlistTracks.length} {playlistTracks.length === 1 ? 'song' : 'songs'}
              {totalMinutes > 0 ? `, about ${totalMinutes} min` : ''}
              {playlistTracks.length > 0
                ? ` • ${new Set(playlistTracks.map(t => t.artist)).size} artists`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Controls & Tracklist */}
      <div
        className="px-4 md:px-6 py-5"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0.25), ${baseBg} 180px)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <ClickSpark>
              <button
                onClick={() => playPlaylist(playlist.id)}
                disabled={playlistTracks.length === 0}
                title={isThisPlaying ? 'Pause' : 'Play'}
                className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 text-black flex items-center justify-center shadow-xl transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isThisPlaying ? (
                  <Pause16Icon size={22} className="text-black" />
                ) : (
                  <PlayTriangleIcon size={24} className="text-black ml-0.5" />
                )}
              </button>
            </ClickSpark>

            <button
              onClick={toggleShuffle}
              title="Enable shuffle"
              className={`p-2 transition-transform hover:scale-105 cursor-pointer ${
                isShuffle ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
              }`}
            >
              <ShuffleIcon size={24} />
            </button>

            {!playlist.isLikedSongs && !playlist.isLocalFiles && (
              <button
                onClick={() => toggleSavePlaylist(playlist.id)}
                title={isSaved ? 'Remove from Your Library' : 'Save to Your Library'}
                className={`p-2 transition-transform hover:scale-105 cursor-pointer ${
                  isSaved ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
                }`}
              >
                {isSaved ? <CheckCircleIcon size={26} /> : <PlusCircleIcon size={26} />}
              </button>
            )}

            <button
              onClick={() => togglePinPlaylist(playlist.id)}
              title={playlist.pinned ? 'Unpin from Library' : 'Pin to top of Library'}
              className={`p-2 transition-transform hover:scale-105 cursor-pointer ${
                playlist.pinned ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
              }`}
            >
              <Pin size={20} className={playlist.pinned ? 'fill-spotify-green rotate-45' : ''} />
            </button>

            {playlist.isLocalFiles && watchedFolders.length > 0 && (
              <button
                onClick={() => void rescanWatchedFolders()}
                title={`Rescan ${watchedFolders.length} watched folder(s)`}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Rescan folders</span>
              </button>
            )}

            {playlist.isUserCreated && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen(prev => !prev)}
                  title="Playlist options"
                  className="p-2 text-spotify-muted hover:text-white cursor-pointer"
                >
                  <MoreHorizontal size={22} />
                </button>

                {moreMenuOpen && (
                  <div className="absolute left-0 top-10 w-52 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1.5 text-[13px] text-white z-40">
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        startEdit();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Pencil size={14} className="text-spotify-muted" />
                      <span>Edit details</span>
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setCoverGeneratorOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer text-spotify-green font-medium"
                    >
                      <Wand2 size={14} className="text-spotify-green" />
                      <span>Design Cover Art...</span>
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        coverInputRef.current?.click();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Camera size={14} className="text-spotify-muted" />
                      <span>Change cover image</span>
                    </button>
                    {playlist.coverUrl && (
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          updatePlaylistCover(playlist.id, '');
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trash2 size={14} className="text-spotify-muted" />
                        <span>Remove custom cover</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        const lines = ['#EXTM3U'];
                        for (const tr of playlistTracks) {
                          const sec = Math.round(tr.duration || 0);
                          lines.push(`#EXTINF:${sec},${tr.artist} - ${tr.title}`);
                          lines.push(tr.sourceKey && !tr.sourceKey.startsWith('idb:') ? tr.sourceKey : `${tr.artist} - ${tr.title}`);
                        }
                        const blob = new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${playlist.title.replace(/[^a-z0-9-_ ]/gi, '_')}.m3u8`;
                        a.click();
                        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                        showToast(`Exported "${playlist.title}.m3u8"`);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Download size={14} className="text-spotify-muted" />
                      <span>Export .m3u8</span>
                    </button>
                    {playlistTracks.length > 0 && (
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          playlistTracks.forEach(tr => addToQueue(tr));
                          showToast(`Added ${playlistTracks.length} tracks to queue`);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                      >
                        <ListPlus size={14} className="text-spotify-muted" />
                        <span>Add to queue</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        const copy = createPlaylist(`${playlist.title} (Copy)`);
                        if (copy) {
                          playlist.trackIds.forEach(tid => addTrackToPlaylist(copy.id, tid));
                          if (playlist.coverUrl) updatePlaylistCover(copy.id, playlist.coverUrl);
                          showToast(`Duplicated "${playlist.title}"`);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Copy size={14} className="text-spotify-muted" />
                      <span>Duplicate playlist</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        deletePlaylist(playlist.id);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/10 text-red-400 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Delete playlist</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {playlistTracks.length > 0 && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center bg-[#242424] rounded-md px-3 py-1.5 flex-1 sm:w-52">
                <Search size={15} className="text-spotify-muted mr-2 shrink-0" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                  placeholder="Search in playlist"
                  className="bg-transparent text-xs text-white placeholder:text-spotify-muted focus:outline-none w-full"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => {
                  setSortBy(e.target.value as typeof sortBy);
                  setSortDirection('asc');
                }}
                aria-label="Sort playlist"
                className="bg-[#242424] text-xs font-medium text-white px-2.5 py-1.5 rounded-md border border-white/10 focus:outline-none cursor-pointer"
              >
                <option value="custom"># Custom order</option>
                <option value="title">Title</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="dateAdded">Date added</option>
                <option value="duration">Duration</option>
              </select>
              <button
                onClick={() => {
                  setSelectMode(p => !p);
                  setSelectedIds([]);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border cursor-pointer shrink-0 ${
                  selectMode
                    ? 'bg-spotify-green text-black border-spotify-green'
                    : 'bg-[#242424] text-white border-white/10 hover:bg-[#303030]'
                }`}
              >
                {selectMode ? 'Done' : 'Bulk Edit'}
              </button>
            </div>
          )}
        </div>

        {selectMode && selectedIds.length > 0 && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#181818] border border-spotify-green/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white">
              <span className="font-bold text-spotify-green">
                {selectedIds.length} tracks selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds(visibleTracks.map(t => t.id))}
                  className="text-spotify-green font-bold hover:underline cursor-pointer"
                >
                  Select all ({visibleTracks.length})
                </button>
                <span className="text-white/20">•</span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-spotify-muted hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
              <button
                onClick={() => {
                  const selTracks = tracks.filter(t => selectedIds.includes(t.id));
                  selTracks.forEach(t => addToQueue(t));
                  showToast(`Added ${selTracks.length} tracks to queue`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                <ListPlus size={13} />
                <span>Add to Queue</span>
              </button>

              {playlist.isUserCreated && (
                <button
                  onClick={() => {
                    const toRemove = [...selectedIds];
                    toRemove.forEach(tid => removeTrackFromPlaylist(playlist.id, tid));
                    setSelectedIds([]);
                    showToast(`Removed ${toRemove.length} tracks from playlist`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Remove from Playlist</span>
                </button>
              )}
            </div>

            <BatchMetadataForm
              selectedIds={selectedIds}
              onComplete={() => {
                setSelectedIds([]);
                setSelectMode(false);
              }}
            />
          </div>
        )}

        {visibleTracks.length > 0 ? (
          <>
            <div className="hidden md:grid grid-cols-[32px_4fr_2fr_1.2fr_100px] items-center gap-4 px-4 pb-2 mb-2 border-b border-white/10 text-xs font-medium text-spotify-muted uppercase tracking-wider select-none">
              <button
                onClick={() => handleHeaderSort('custom')}
                className="text-center hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Sort by #"
              >
                <span>#</span>
                {sortBy === 'custom' && (
                  <span className="text-[10px] text-spotify-green">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              <button
                onClick={() => handleHeaderSort('title')}
                className="text-left hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Sort by Title"
              >
                <span>Title</span>
                {sortBy === 'title' && (
                  <span className="text-[10px] text-spotify-green">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              <button
                onClick={() => handleHeaderSort('album')}
                className="text-left hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Sort by Album"
              >
                <span>Album</span>
                {sortBy === 'album' && (
                  <span className="text-[10px] text-spotify-green">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              <button
                onClick={() => handleHeaderSort('dateAdded')}
                className="text-left hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Sort by Date added"
              >
                <span>Date added</span>
                {sortBy === 'dateAdded' && (
                  <span className="text-[10px] text-spotify-green">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              <button
                onClick={() => handleHeaderSort('duration')}
                className="flex justify-end pr-6 hover:text-white items-center gap-1 cursor-pointer ml-auto transition-colors"
                title="Sort by Duration"
              >
                <Clock size={15} />
                {sortBy === 'duration' && (
                  <span className="text-[10px] text-spotify-green">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
            </div>

            <VirtualizedTrackList
              tracks={visibleTracks}
              contextList={playlistTracks}
              playlistId={playlist.id}
              canRemoveFromPlaylist={Boolean(playlist.isUserCreated || playlist.isLikedSongs)}
              draggableReorder={Boolean(playlist.isUserCreated && sortBy === 'custom' && !filterQuery.trim())}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={tid =>
                setSelectedIds(prev =>
                  prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
                )
              }
              onReorderDrop={(fromIdx, toIdx) =>
                reorderPlaylistTracks(playlist.id, fromIdx, toIdx)
              }
            />
          </>
        ) : (
          <div className="py-12 text-center border border-white/10 rounded-lg bg-white/[0.02]">
            <Music size={40} className="mx-auto text-spotify-muted mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">
              {playlist.isLikedSongs
                ? 'Songs you like will appear here'
                : 'This playlist is currently empty'}
            </h3>
            <p className="text-sm text-spotify-muted mb-5">
              Import local audio files from your device or drag & drop songs here.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => void pickNativeAudioFiles()}
                className="bg-white hover:scale-104 text-black font-bold text-sm px-5 py-2.5 rounded-full inline-flex items-center gap-2 cursor-pointer"
              >
                <FileAudio size={16} />
                <span>Select Audio Files</span>
              </button>
              <button
                onClick={() => void pickNativeAudioFolder()}
                className="bg-[#242424] hover:bg-[#2a2a2a] text-white font-bold text-sm px-5 py-2.5 rounded-full inline-flex items-center gap-2 cursor-pointer"
              >
                <FolderOpen size={16} />
                <span>Select Folder</span>
              </button>
            </div>
          </div>
        )}

        {/* Song Adder for user playlists when local tracks exist */}
        {playlist.isUserCreated && tracks.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <h3 className="text-lg font-bold text-white mb-2">
              Add from your imported audio files
            </h3>
            <div className="flex items-center bg-[#242424] rounded-md px-3 py-2 max-w-md mb-4">
              <Search size={16} className="text-spotify-muted mr-2" />
              <input
                type="text"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Filter local tracks"
                className="bg-transparent text-sm text-white placeholder:text-spotify-muted focus:outline-none w-full"
              />
            </div>

            <div className="space-y-1 max-w-2xl pb-8">
              {availableToAdd.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                      {t.coverUrl ? (
                        <img src={t.coverUrl} alt={t.title} className="w-10 h-10 object-cover" />
                      ) : (
                        <Music size={16} className="text-spotify-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.title}</p>
                      <p className="text-xs text-spotify-muted truncate">{t.artist}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addTrackToPlaylist(playlist.id, t.id)}
                    className="px-4 py-1.5 rounded-full border border-[#7c7c7c] hover:border-white text-xs font-bold text-white flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Playlist Cover Art Designer Modal */}
        <PlaylistCoverModal
          isOpen={coverGeneratorOpen}
          onClose={() => setCoverGeneratorOpen(false)}
          playlistTitle={playlist.title}
          onApplyCover={dataUrl => {
            updatePlaylistCover(playlist.id, dataUrl);
            showToast('Custom cover art generated and applied!');
          }}
        />
      </div>
    </div>
  );
};
