import React, { useState } from 'react';
import { Clock, Disc3, Heart, ListPlus, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types';
import { TrackRow } from './TrackRow';
import { BatchMetadataForm } from './BatchMetadataForm';
import { CoverArtModal } from './CoverArtModal';
import { PlayTriangleIcon, Pause16Icon, ShuffleIcon } from './SpotifyIcons';
import { TiltedCard, BlurText, ShinyText } from './reactbits';

interface AlbumViewProps {
  albumName: string;
  artistName?: string;
}

export const AlbumView: React.FC<AlbumViewProps> = ({ albumName, artistName }) => {
  const {
    albums,
    artists,
    tracks,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    isShuffle,
    toggleShuffle,
    savedAlbumIds,
    toggleSaveAlbum,
    addToQueue,
    showToast,
    navigate,
    settings,
  } = usePlayer();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

  const album =
    albums.find(
      a =>
        a.name.toLowerCase() === albumName.toLowerCase() &&
        (!artistName || a.artist.toLowerCase() === artistName.toLowerCase())
    ) || albums.find(a => a.name.toLowerCase() === albumName.toLowerCase());
  if (!album) {
    return (
      <div className="p-8 text-center">
        <p className="text-spotify-muted mb-4">Album not found in your local library.</p>
        <button
          onClick={() => navigate({ name: 'home' })}
          className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold cursor-pointer"
        >
          Back Home
        </button>
      </div>
    );
  }

  const albumTracks = album.trackIds
    .map(id => tracks.find(t => t.id === id))
    .filter((t): t is Track => Boolean(t))
    .sort((a, b) => {
      const numA = typeof a.trackNumber === 'number' && a.trackNumber > 0 ? a.trackNumber : 9999;
      const numB = typeof b.trackNumber === 'number' && b.trackNumber > 0 ? b.trackNumber : 9999;
      if (numA !== numB) return numA - numB;
      return a.title.localeCompare(b.title);
    });

  const matchedArtist = artists.find(
    a => a.name.toLowerCase() === album.artist.toLowerCase()
  );

  const isSavedAlbum = savedAlbumIds.includes(album.id);
  const albumGenre = albumTracks.find(t => t.genre)?.genre;
  const handleShuffleAlbum = () => {
    if (albumTracks.length === 0) return;
    if (!isShuffle) toggleShuffle();
    const rand = albumTracks[Math.floor(Math.random() * albumTracks.length)];
    playTrack(rand, albumTracks, null);
  };

  const totalMinutes = Math.round(albumTracks.reduce((acc, t) => acc + t.duration, 0) / 60);
  const isAlbumPlaying =
    isPlaying && currentTrack !== null && albumTracks.some(t => t.id === currentTrack.id);

  const handlePlayAlbum = () => {
    if (isAlbumPlaying) {
      togglePlay();
    } else if (albumTracks[0]) {
      playTrack(albumTracks[0], albumTracks, null);
    }
  };

  const baseBg = settings.amoledMode ? '#000000' : '#121212';

  return (
    <div className="min-h-full">
      {/* Header */}
      <div
        className="px-4 md:px-6 pt-8 md:pt-12 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-5 md:gap-6"
        style={{
          background: `linear-gradient(to bottom, ${album.accentColor || '#334155'}, ${baseBg}dd)`,
        }}
      >
        <div
          onClick={() => setIsCoverModalOpen(true)}
          className="cursor-pointer group relative"
          title="Click to search and update album artwork"
        >
          <TiltedCard
            rotateAmplitude={9}
            scaleOnHover={1.02}
            className="w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.6)] rounded-md overflow-hidden bg-[#282828] flex items-center justify-center relative"
          >
            {album.coverUrl ? (
              <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-spotify-muted group-hover:text-white transition-colors">
                <Disc3 size={54} />
                <span className="text-[11px] font-semibold text-center px-2">Find Artwork</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Sparkles size={24} className="text-white drop-shadow" />
            </div>
          </TiltedCard>
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <ShinyText text="Album" className="text-xs font-bold uppercase tracking-wider" />
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight my-2 truncate">
            <BlurText text={album.name} />
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-sm text-white">
            <button
              onClick={() => {
                if (matchedArtist) navigate({ name: 'artist', id: matchedArtist.id });
              }}
              className={`font-bold ${
                matchedArtist ? 'hover:underline cursor-pointer' : 'cursor-default'
              }`}
            >
              {album.artist}
            </button>
            {album.year ? (
              <>
                <span className="text-white/70">•</span>
                <span className="text-white/80">{album.year}</span>
              </>
            ) : null}
            <span className="text-white/70">•</span>
            <span className="text-white/80">
              {albumTracks.length} {albumTracks.length === 1 ? 'song' : 'songs'}
              {totalMinutes > 0 ? `, about ${totalMinutes} min` : ''}
              {albumGenre ? ` • ${albumGenre}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Controls & Tracklist */}
      <div
        className="px-4 md:px-6 py-5"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0.28), ${baseBg} 180px)`,
        }}
      >
        <div className="flex items-center gap-5 mb-6">
          <button
            onClick={handlePlayAlbum}
            disabled={albumTracks.length === 0}
            title={isAlbumPlaying ? 'Pause' : 'Play'}
            className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 disabled:opacity-40 text-black flex items-center justify-center shadow-xl transition-all cursor-pointer"
          >
            {isAlbumPlaying ? (
              <Pause16Icon size={22} className="text-black" />
            ) : (
              <PlayTriangleIcon size={24} className="text-black ml-0.5" />
            )}
          </button>

          <button
            onClick={handleShuffleAlbum}
            title="Shuffle album"
            className={`p-2 transition-transform hover:scale-105 cursor-pointer ${
              isShuffle ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <ShuffleIcon size={24} />
          </button>

          <button
            onClick={() => toggleSaveAlbum(album.id)}
            title={isSavedAlbum ? 'Remove from Favourite Albums' : 'Save to Favourite Albums'}
            className={`p-2 transition-transform hover:scale-105 cursor-pointer ${
              isSavedAlbum ? 'text-spotify-green' : 'text-spotify-muted hover:text-white'
            }`}
          >
            <Heart size={24} className={isSavedAlbum ? 'fill-spotify-green' : ''} />
          </button>

          <button
            onClick={() => setIsCoverModalOpen(true)}
            title="Search and apply album cover artwork online"
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sparkles size={14} className="text-spotify-green" />
            <span>Find Artwork</span>
          </button>

          {albumTracks.length > 0 && (
            <button
              onClick={() => {
                setSelectMode(p => !p);
                setSelectedIds([]);
              }}
              className={`ml-auto px-3 py-1.5 rounded-md text-xs font-bold border cursor-pointer shrink-0 ${
                selectMode
                  ? 'bg-spotify-green text-black border-spotify-green'
                  : 'bg-[#242424] text-white border-white/10 hover:bg-[#303030]'
              }`}
            >
              {selectMode ? 'Done' : 'Bulk Edit Tags'}
            </button>
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
                  onClick={() => setSelectedIds(albumTracks.map(t => t.id))}
                  className="text-spotify-green font-bold hover:underline cursor-pointer"
                >
                  Select all ({albumTracks.length})
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

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
              <button
                onClick={() => {
                  const selTracks = albumTracks.filter(t => selectedIds.includes(t.id));
                  selTracks.forEach(t => addToQueue(t));
                  showToast(`Added ${selTracks.length} tracks to queue`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                <ListPlus size={13} />
                <span>Add to Queue</span>
              </button>
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

        <div className="hidden md:grid grid-cols-[32px_4fr_2fr_1.2fr_100px] items-center gap-4 px-4 pb-2 mb-2 border-b border-white/10 text-xs font-medium text-spotify-muted uppercase tracking-wider">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Album</div>
          <div>Date added</div>
          <div className="flex justify-end pr-6">
            <Clock size={15} />
          </div>
        </div>

        <div className="space-y-0.5 pb-8">
          {albumTracks.map((t, idx) => (
            <TrackRow
              key={t.id}
              track={t}
              index={idx}
              contextList={albumTracks}
              selectable={selectMode}
              selected={selectedIds.includes(t.id)}
              onToggleSelect={tid =>
                setSelectedIds(prev =>
                  prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
                )
              }
            />
          ))}
        </div>

        <CoverArtModal
          isOpen={isCoverModalOpen}
          onClose={() => setIsCoverModalOpen(false)}
          tracks={albumTracks}
          initialArtist={album.artist}
          initialAlbum={album.name}
        />
      </div>
    </div>
  );
};
