import React, { useState, useMemo } from 'react';
import {
  Music,
  FolderOpen,
  FileAudio,
  Search,
  Disc3,
  User,
  Clock,
  BarChart3,
  X,
  MessageSquareQuote,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { TrackRow } from './TrackRow';
import { PlayTriangleIcon } from './SpotifyIcons';
import { Track } from '../types';
import { SpotlightCard } from './reactbits';
import { searchLibrary } from '../utils/searchUtils';

type SearchTab = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'lyrics' | 'genres';

export const SearchBrowseView: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    searchInputRef,
    tracks,
    playlists,
    albums,
    artists,
    navigate,
    playPlaylist,
    playTrack,
    pickNativeAudioFiles,
    pickNativeAudioFolder,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  const q = searchQuery.trim();
  const results = useMemo(
    () => searchLibrary(q, tracks, artists, albums, playlists),
    [q, tracks, artists, albums, playlists]
  );

  // Mobile search input inside Search view (desktop TopNav hides on <768px)
  const mobileSearchInput = (
    <div className="md:hidden mb-5">
      <h1 className="text-2xl font-bold text-white mb-3">Search</h1>
      <div className="bg-white rounded-md flex items-center px-3 py-2.5 text-black">
        <Search size={18} className="text-black/70 mr-2.5 shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchQuery.trim()) addSearchHistory(searchQuery);
          }}
          placeholder="Songs, artists, lyrics, filename, folder..."
          className="bg-transparent text-black placeholder:text-black/60 text-sm font-medium w-full focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-black/60">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  if (!q) {
    return (
      <div className="px-4 md:px-6 py-5 pb-12 space-y-8">
        {mobileSearchInput}
        {tracks.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <Music size={44} className="mx-auto text-spotify-muted mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Nothing in your library yet</h2>
            <p className="text-sm text-spotify-muted mb-6">
              Add audio files from your device to search and play them cleanly without recommendations.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
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
        ) : (
          <>
            {/* Search History */}
            {searchHistory.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Clock size={14} className="text-spotify-muted" /> Recent searches
                  </h3>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map(term => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="px-3.5 py-1.5 rounded-full bg-[#242424] hover:bg-[#323232] text-xs font-medium text-white cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Library Hubs */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate({ name: 'stats' })}
                className="px-4 py-2 rounded-full bg-[#242424] hover:bg-[#2f2f2f] text-sm font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart3 size={15} className="text-spotify-green" /> Listening Stats
              </button>
            </div>

            {albums.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {albums.map(alb => {
                    const albTracks = alb.trackIds
                      .map(id => tracks.find(t => t.id === id))
                      .filter((t): t is Track => Boolean(t));
                    return (
                      <SpotlightCard
                        key={alb.id}
                        onClick={() =>
                          navigate({ name: 'album', albumName: alb.name, artistName: alb.artist })
                        }
                        className="bg-spotify-card hover:bg-spotify-card-hover p-3.5 rounded-lg cursor-pointer group transition-colors"
                      >
                        <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] flex items-center justify-center">
                          {alb.coverUrl ? (
                            <img src={alb.coverUrl} alt={alb.name} className="w-full h-full object-cover" />
                          ) : (
                            <Disc3 size={36} className="text-spotify-muted" />
                          )}
                          {albTracks[0] && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                playTrack(albTracks[0], albTracks, null);
                              }}
                              className="w-11 h-11 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <PlayTriangleIcon size={20} className="ml-0.5" />
                            </button>
                          )}
                        </div>
                        <p className="font-bold text-white text-sm truncate">{alb.name}</p>
                        <p className="text-xs text-spotify-muted mt-0.5 truncate">{alb.artist}</p>
                      </SpotlightCard>
                    );
                  })}
                </div>
              </section>
            )}

            {artists.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Artists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {artists.map(art => {
                    const artTracks = art.trackIds
                      .map(id => tracks.find(t => t.id === id))
                      .filter((t): t is Track => Boolean(t));
                    return (
                      <div
                        key={art.id}
                        onClick={() => navigate({ name: 'artist', id: art.id })}
                        className="bg-spotify-card hover:bg-spotify-card-hover p-3.5 rounded-lg cursor-pointer group transition-colors"
                      >
                        <div className="relative aspect-square mb-3">
                          <div className="w-full h-full rounded-full overflow-hidden bg-[#282828] flex items-center justify-center shadow-lg">
                            {art.coverUrl ? (
                              <img src={art.coverUrl} alt={art.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={36} className="text-spotify-muted" />
                            )}
                          </div>
                          {artTracks[0] && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                playTrack(artTracks[0], artTracks, null);
                              }}
                              className="w-11 h-11 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 text-black flex items-center justify-center shadow-2xl absolute right-2 bottom-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all cursor-pointer z-10"
                            >
                              <PlayTriangleIcon size={20} className="ml-0.5" />
                            </button>
                          )}
                        </div>
                        <p className="font-bold text-white text-sm truncate">{art.name}</p>
                        <p className="text-xs text-spotify-muted mt-0.5">Artist</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-white mb-4">Your Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {playlists.map(pl => (
                  <div
                    key={pl.id}
                    onClick={() =>
                      navigate(pl.isLikedSongs ? { name: 'liked' } : { name: 'playlist', id: pl.id })
                    }
                    className="bg-spotify-card hover:bg-spotify-card-hover p-4 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] flex items-center justify-center">
                      {pl.coverUrl ? (
                        <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music size={36} className="text-spotify-muted" />
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          playPlaylist(pl.id);
                        }}
                        className="w-11 h-11 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <PlayTriangleIcon size={20} className="ml-0.5" />
                      </button>
                    </div>
                    <p className="font-bold text-white text-sm truncate">{pl.title}</p>
                    <p className="text-xs text-spotify-muted mt-0.5">{pl.trackIds.length} songs</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  const nothingFound =
    results.tracks.length === 0 &&
    results.artists.length === 0 &&
    results.albums.length === 0 &&
    results.playlists.length === 0 &&
    results.genres.length === 0 &&
    results.lyricMatches.length === 0;

  return (
    <div className="px-4 md:px-6 py-4 pb-12 space-y-5">
      {mobileSearchInput}

      {/* Search Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'songs', label: `Songs (${results.tracks.length})` },
            { id: 'artists', label: `Artists (${results.artists.length})` },
            { id: 'albums', label: `Albums (${results.albums.length})` },
            { id: 'playlists', label: `Playlists (${results.playlists.length})` },
            { id: 'lyrics', label: `Lyrics (${results.lyricMatches.length})` },
            { id: 'genres', label: `Genres (${results.genres.length})` },
          ] as { id: SearchTab; label: string }[]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-black'
                : 'bg-[#242424] hover:bg-[#323232] text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {nothingFound ? (
        <div className="py-16 text-center">
          <h3 className="text-lg font-bold text-white mb-1">
            No results found for "{searchQuery}"
          </h3>
          <p className="text-sm text-spotify-muted">
            Fuzzy search matches titles, artists, albums, genres, filenames, folders, and local lyrics.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(activeTab === 'all' || activeTab === 'songs') && results.tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Songs</h2>
              <div className="space-y-0.5">
                {results.tracks.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => addSearchHistory(q)}
                  >
                    <TrackRow track={t} index={i} contextList={results.tracks} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'lyrics') && results.lyricMatches.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <MessageSquareQuote size={18} className="text-spotify-green" /> Lyric Matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {results.lyricMatches.map(m => (
                  <button
                    key={m.track.id}
                    onClick={() => {
                      addSearchHistory(q);
                      playTrack(m.track, results.lyricMatches.map(x => x.track), null);
                    }}
                    className="p-3 rounded-lg bg-[#181818] hover:bg-[#242424] border border-white/10 text-left cursor-pointer"
                  >
                    <p className="text-xs font-bold text-white truncate">
                      {m.track.title} — {m.track.artist}
                    </p>
                    <p className="text-xs text-spotify-green mt-1 line-clamp-2">"{m.line}"</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'genres') && results.genres.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Genres</h2>
              <div className="flex flex-wrap gap-2.5">
                {results.genres.map(g => (
                  <button
                    key={g}
                    onClick={() => setSearchQuery(g)}
                    className="px-4 py-2 rounded-full bg-spotify-green/15 border border-spotify-green/35 text-xs font-bold text-spotify-green cursor-pointer"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.artists.map(art => (
                  <div
                    key={art.id}
                    onClick={() => {
                      addSearchHistory(q);
                      navigate({ name: 'artist', id: art.id });
                    }}
                    className="bg-spotify-card hover:bg-spotify-card-hover p-4 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="aspect-square rounded-full overflow-hidden mb-3 bg-[#282828] flex items-center justify-center">
                      {art.coverUrl ? (
                        <img src={art.coverUrl} alt={art.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-spotify-muted" />
                      )}
                    </div>
                    <p className="font-bold text-white text-sm truncate">{art.name}</p>
                    <p className="text-xs text-spotify-muted mt-1">{art.trackIds.length} songs</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.albums.map(alb => (
                  <div
                    key={alb.id}
                    onClick={() => {
                      addSearchHistory(q);
                      navigate({ name: 'album', albumName: alb.name, artistName: alb.artist });
                    }}
                    className="bg-spotify-card hover:bg-spotify-card-hover p-4 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] flex items-center justify-center">
                      {alb.coverUrl ? (
                        <img src={alb.coverUrl} alt={alb.name} className="w-full h-full object-cover" />
                      ) : (
                        <Disc3 size={32} className="text-spotify-muted" />
                      )}
                    </div>
                    <p className="font-bold text-white text-sm truncate">{alb.name}</p>
                    <p className="text-xs text-spotify-muted mt-1 truncate">{alb.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'playlists') && results.playlists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.playlists.map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => {
                      addSearchHistory(q);
                      navigate(pl.isLikedSongs ? { name: 'liked' } : { name: 'playlist', id: pl.id });
                    }}
                    className="bg-spotify-card hover:bg-spotify-card-hover p-4 rounded-lg cursor-pointer transition-colors"
                  >
                    <p className="font-bold text-white text-sm truncate">{pl.title}</p>
                    <p className="text-xs text-spotify-muted mt-1">{pl.trackIds.length} songs</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
