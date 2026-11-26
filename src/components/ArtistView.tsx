import React, { useState } from 'react';
import { Disc3, User, Clock } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types';
import { TrackRow } from './TrackRow';
import { PlayTriangleIcon, Pause16Icon, VerifiedBadgeIcon } from './SpotifyIcons';
import { TiltedCard, SpotlightCard, BlurText, ShinyText, ClickSpark } from './reactbits';

interface ArtistViewProps {
  artistId: string;
}

export const ArtistView: React.FC<ArtistViewProps> = ({ artistId }) => {
  const {
    artists,
    albums,
    tracks,
    playCounts,
    followedArtistIds,
    toggleFollowArtist,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    navigate,
    settings,
  } = usePlayer();

  const [showAllTracks, setShowAllTracks] = useState(false);
  const [releaseFilter, setReleaseFilter] = useState<'all' | 'albums' | 'singles'>('all');
  const [yearOrder, setYearOrder] = useState<'desc' | 'asc'>('desc');

  const artist = artists.find(a => a.id === artistId);
  if (!artist) {
    return (
      <div className="p-8 text-center">
        <p className="text-spotify-muted mb-4">Artist not found in your local library.</p>
        <button
          onClick={() => navigate({ name: 'home' })}
          className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold cursor-pointer"
        >
          Back Home
        </button>
      </div>
    );
  }

  const artistTracks = artist.trackIds
    .map(id => tracks.find(t => t.id === id))
    .filter((t): t is Track => Boolean(t))
    .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));

  const visibleTracks = showAllTracks ? artistTracks : artistTracks.slice(0, 5);

  const artistAlbums = albums
    .filter(
      alb =>
        artist.albums.includes(alb.id) ||
        alb.artist.toLowerCase() === artist.name.toLowerCase()
    )
    .sort((a, b) => {
      const ya = a.year || 0;
      const yb = b.year || 0;
      return yearOrder === 'desc' ? yb - ya : ya - yb;
    });

  const filteredReleases = artistAlbums.filter(alb => {
    if (releaseFilter === 'albums') return alb.trackIds.length >= 7;
    if (releaseFilter === 'singles') return alb.trackIds.length < 7;
    return true;
  });

  const getReleaseTypeLabel = (count: number) =>
    count >= 7 ? 'Album' : count >= 4 ? 'EP' : 'Single';

  const totalArtistPlays = artistTracks.reduce((sum, t) => sum + (playCounts[t.id] || 0), 0);
  const totalArtistMin = Math.round(artistTracks.reduce((sum, t) => sum + (t.duration || 0), 0) / 60);
  const isFollowing = followedArtistIds.includes(artist.id);
  const isPlayingArtist =
    isPlaying && currentTrack !== null && artistTracks.some(t => t.id === currentTrack.id);

  const handlePlayTop = () => {
    if (isPlayingArtist) {
      togglePlay();
    } else if (artistTracks[0]) {
      playTrack(artistTracks[0], artistTracks, null);
    }
  };

  const baseBg = settings.amoledMode ? '#000000' : '#121212';

  return (
    <div className="min-h-full">
      {/* Artist Banner Header */}
      <div className="relative h-60 md:h-76 flex items-end p-6 overflow-hidden">
        {artist.coverUrl ? (
          <img
            src={artist.coverUrl}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px] opacity-60"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: artist.accentColor || '#282828' }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0.25), ${baseBg}e6)`,
          }}
        />
        <div className="relative z-10 flex items-end gap-5">
          <TiltedCard
            rotateAmplitude={8}
            scaleOnHover={1.03}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shadow-2xl bg-[#282828] flex items-center justify-center shrink-0 border border-white/10"
          >
            {artist.coverUrl ? (
              <img src={artist.coverUrl} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <User size={44} className="text-spotify-muted" />
            )}
          </TiltedCard>
          <div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-white font-medium mb-1.5">
              <VerifiedBadgeIcon size={20} />
              <ShinyText text="Local Library Artist" />
            </div>
            <h1 className="text-3xl md:text-6xl font-bold text-white tracking-tight mb-2 drop-shadow">
              <BlurText text={artist.name} />
            </h1>
            <p className="text-xs md:text-sm text-white/80 font-medium">
              {artistTracks.length} {artistTracks.length === 1 ? 'song' : 'songs'}
              {totalArtistMin > 0 ? ` • ${totalArtistMin} min` : ''}
              {artistAlbums.length > 0 ? ` • ${artistAlbums.length} ${artistAlbums.length === 1 ? 'release' : 'releases'}` : ''}
              {totalArtistPlays > 0 ? ` • ${totalArtistPlays} ${totalArtistPlays === 1 ? 'play' : 'plays'}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Controls & Tracks */}
      <div
        className="px-4 md:px-6 py-6"
        style={{
          background: `linear-gradient(to bottom, ${artist.accentColor || '#334155'}44 0%, ${baseBg} 180px)`,
        }}
      >
        <div className="flex items-center gap-6 mb-8">
          <ClickSpark>
            <button
              onClick={handlePlayTop}
              disabled={artistTracks.length === 0}
              className="w-14 h-14 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 disabled:opacity-40 text-black flex items-center justify-center shadow-xl transition-all cursor-pointer"
              title={isPlayingArtist ? 'Pause' : 'Play'}
            >
              {isPlayingArtist ? (
                <Pause16Icon size={24} className="text-black" />
              ) : (
                <PlayTriangleIcon size={26} className="text-black ml-0.5" />
              )}
            </button>
          </ClickSpark>

          <button
            onClick={() => toggleFollowArtist(artist.id)}
            className={`px-5 py-1.5 rounded-full border text-sm font-bold transition-all cursor-pointer ${
              isFollowing
                ? 'border-spotify-green text-spotify-green hover:scale-104'
                : 'border-[#7c7c7c] hover:border-white hover:scale-104 text-white'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Songs */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Popular Songs</h2>
          <div className="hidden md:grid grid-cols-[32px_4fr_2fr_1.2fr_100px] items-center gap-4 px-4 pb-2 mb-2 border-b border-white/10 text-xs font-medium text-spotify-muted uppercase tracking-wider">
            <div className="text-center">#</div>
            <div>Title</div>
            <div>Album</div>
            <div>Date added</div>
            <div className="flex justify-end pr-6">
              <Clock size={15} />
            </div>
          </div>
          <div className="space-y-0.5">
            {visibleTracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                contextList={artistTracks}
              />
            ))}
          </div>
          {artistTracks.length > 5 && (
            <button
              onClick={() => setShowAllTracks(prev => !prev)}
              className="mt-3 px-3 py-1 text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
            >
              {showAllTracks ? 'Show less' : `See all ${artistTracks.length} songs`}
            </button>
          )}
        </section>

        {/* Discography: Albums, EPs & Singles */}
        {artistAlbums.length > 0 && (
          <section className="mb-8 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white mr-2">Discography</h2>
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'albums', label: 'Albums' },
                    { id: 'singles', label: 'Singles & EPs' },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setReleaseFilter(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      releaseFilter === tab.id
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setYearOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
              >
                Year: {yearOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredReleases.map(alb => {
                const albTracks = alb.trackIds
                  .map(id => tracks.find(t => t.id === id))
                  .filter((t): t is Track => Boolean(t));
                return (
                  <SpotlightCard
                    key={alb.id}
                    onClick={() =>
                      navigate({ name: 'album', albumName: alb.name, artistName: alb.artist })
                    }
                    className="bg-spotify-card hover:bg-spotify-card-hover p-3.5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="relative aspect-square mb-3 rounded-md overflow-hidden shadow-lg bg-[#282828] flex items-center justify-center">
                      {alb.coverUrl ? (
                        <img src={alb.coverUrl} alt={alb.name} className="w-full h-full object-cover" />
                      ) : (
                        <Disc3 size={40} className="text-spotify-muted" />
                      )}
                      {albTracks[0] && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            playTrack(albTracks[0], albTracks, null);
                          }}
                          className="w-12 h-12 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all cursor-pointer"
                        >
                          <PlayTriangleIcon size={22} className="ml-0.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm truncate mb-1">{alb.name}</h3>
                    <p className="text-xs text-spotify-muted truncate">
                      {alb.year ? `${alb.year} • ` : ''}
                      {getReleaseTypeLabel(alb.trackIds.length)} • {alb.trackIds.length}{' '}
                      {alb.trackIds.length === 1 ? 'song' : 'songs'}
                    </p>
                  </SpotlightCard>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
