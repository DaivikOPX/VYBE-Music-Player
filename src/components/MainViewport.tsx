import React, { useState, useRef } from 'react';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Music,
  FolderOpen,
  FileAudio,
  Plus,
  Disc3,
  User,
  Clock,
  TrendingUp,
  Settings,
  BarChart3,
  LayoutGrid,
  List,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { PlaylistView } from './PlaylistView';
import { ArtistView } from './ArtistView';
import { AlbumView } from './AlbumView';
import { ProfileView } from './ProfileView';
import { SettingsView } from './SettingsView';
import { SearchBrowseView } from './SearchBrowseView';
import { StatsView } from './StatsView';
import { FolderTreeView } from './FolderTreeView';
import { TrackRow } from './TrackRow';
import { LyricsView } from './LyricsView';
import { PlayTriangleIcon, Pause16Icon, EqualizerBars } from './SpotifyIcons';
import { Track } from '../types';
import {
  SpotlightCard,
  GlareHover,
  GradientText,
  StarBorder,
} from './reactbits';

type HomeFilter = 'all' | 'playlists' | 'albums' | 'artists';

export const MainViewport: React.FC = () => {
  const {
    route,
    navigate,
    goBack,
    canGoBack,
    playlists,
    tracks,
    albums,
    artists,
    likedTrackIds,
    playCounts,
    recentlyPlayedIds,
    currentTrack,
    activePlaylistId,
    isPlaying,
    playPlaylist,
    playTrack,
    createPlaylist,
    pickNativeAudioFiles,
    pickNativeAudioFolder,
    isRightDrawerOpen,
    toggleRightDrawer,
    updateAudioSettings,
    settings,
    profile,
  } = usePlayer();

  const [homeFilter, setHomeFilter] = useState<HomeFilter>('all');
  const [mobileLibTab, setMobileLibTab] = useState<'playlists' | 'albums' | 'artists'>('playlists');
  const [hoverAccent, setHoverAccent] = useState<string | null>(null);
  const artistsScrollRef = useRef<HTMLDivElement>(null);

  const scrollArtists = (dir: 'left' | 'right') => {
    if (artistsScrollRef.current) {
      const amount = dir === 'left' ? -380 : 380;
      artistsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const routeKey =
    route.name === 'playlist' || route.name === 'artist'
      ? `${route.name}:${route.id}`
      : route.name === 'album'
      ? `album:${route.albumName}`
      : route.name;

  const userPlaylists = [
    ...playlists.filter(p => p.isLikedSongs),
    ...playlists.filter(p => p.isLocalFiles),
    ...playlists.filter(p => !p.isLikedSongs && !p.isLocalFiles && p.isUserCreated),
  ];

  const recentlyPlayedTracks = recentlyPlayedIds
    .map(id => tracks.find(t => t.id === id))
    .filter((t): t is Track => Boolean(t));

  const mostPlayedTracks = tracks
    .filter(t => (playCounts[t.id] || 0) > 0)
    .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));

  const baseBg = settings.hazyMode
    ? 'rgba(15, 15, 22, 0.40)'
    : settings.amoledMode
    ? '#000000'
    : '#121212';

  return (
    <main
      id="main-view"
      className={`flex-1 ${
        settings.hazyMode
          ? 'md:border md:border-white/10 md:shadow-2xl'
          : settings.amoledMode
          ? 'bg-black md:border md:border-white/10'
          : 'bg-spotify-surface md:bg-spotify-surface/90 md:backdrop-blur-2xl md:border md:border-white/[0.08]'
      } md:rounded-lg flex flex-col h-full overflow-hidden select-none relative min-w-0 md:shadow-xl`}
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
      <div className="flex-1 overflow-y-auto">
        {!['home', 'search', 'browse', 'library'].includes(route.name) && (
          <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-black/75 backdrop-blur-xl border-b border-white/10">
            <button
              onClick={() => (canGoBack ? goBack() : navigate({ name: 'home' }))}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-2.5 py-1 rounded-full bg-white/10 active:bg-white/20"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <button
              onClick={() => navigate({ name: 'stats' })}
              className="inline-flex items-center gap-1 text-xs font-bold text-spotify-green px-2.5 py-1 rounded-full bg-white/10"
            >
              <BarChart3 size={14} />
              <span>Stats</span>
            </button>
          </div>
        )}
        <div key={routeKey} className="min-h-full animate-view-enter">
        {route.name === 'playlist' && <PlaylistView playlistId={route.id} />}
        {route.name === 'liked' && <PlaylistView playlistId="liked-songs" />}
        {route.name === 'artist' && <ArtistView artistId={route.id} />}
        {route.name === 'album' && (
          <AlbumView albumName={route.albumName} artistName={route.artistName} />
        )}
        {route.name === 'profile' && <ProfileView />}
        {route.name === 'folder-tree' && <FolderTreeView />}
        {route.name === 'settings' && <SettingsView />}
        {route.name === 'stats' && <StatsView />}
        {(route.name === 'search' || route.name === 'browse') && <SearchBrowseView />}

        {/* RECENTLY PLAYED FULL ROUTE */}
        {route.name === 'recently-played' && (
          <div className="min-h-full">
            <div
              className="px-4 md:px-6 pt-8 pb-6 flex items-end gap-5"
              style={{ background: `linear-gradient(to bottom, #1e3a5f, ${baseBg})` }}
            >
              <div className="w-32 h-32 md:w-44 md:h-44 rounded-md bg-gradient-to-br from-[#0f766e] to-[#1e3a8a] flex items-center justify-center shadow-2xl shrink-0">
                <Clock size={56} className="text-white" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Local History
                </span>
                <h1 className="text-3xl md:text-5xl font-bold text-white my-2">
                  Recently Played
                </h1>
                <p className="text-sm text-white/75">{recentlyPlayedTracks.length} tracks</p>
              </div>
            </div>
            <div className="px-4 md:px-6 pb-12">
              {recentlyPlayedTracks.length > 0 ? (
                <>
                  <button
                    onClick={() => playTrack(recentlyPlayedTracks[0], recentlyPlayedTracks, null)}
                    className="mb-5 w-14 h-14 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shadow-xl cursor-pointer"
                  >
                    <PlayTriangleIcon size={24} className="ml-0.5" />
                  </button>
                  <div className="space-y-0.5">
                    {recentlyPlayedTracks.map((t, i) => (
                      <TrackRow key={t.id} track={t} index={i} contextList={recentlyPlayedTracks} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-spotify-muted py-12">No tracks played yet on this device.</p>
              )}
            </div>
          </div>
        )}

        {/* MOST PLAYED FULL ROUTE */}
        {route.name === 'most-played' && (
          <div className="min-h-full">
            <div
              className="px-4 md:px-6 pt-8 pb-6 flex items-end gap-5"
              style={{ background: `linear-gradient(to bottom, #4c1d95, ${baseBg})` }}
            >
              <div className="w-32 h-32 md:w-44 md:h-44 rounded-md bg-gradient-to-br from-[#6d28d9] to-[#db2777] flex items-center justify-center shadow-2xl shrink-0">
                <TrendingUp size={56} className="text-white" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Local Listening Stats
                </span>
                <h1 className="text-3xl md:text-5xl font-bold text-white my-2">
                  Most Played
                </h1>
                <p className="text-sm text-white/75">{mostPlayedTracks.length} tracks played</p>
              </div>
            </div>
            <div className="px-4 md:px-6 pb-12">
              {mostPlayedTracks.length > 0 ? (
                <>
                  <button
                    onClick={() => playTrack(mostPlayedTracks[0], mostPlayedTracks, null)}
                    className="mb-5 w-14 h-14 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shadow-xl cursor-pointer"
                  >
                    <PlayTriangleIcon size={24} className="ml-0.5" />
                  </button>
                  <div className="space-y-0.5">
                    {mostPlayedTracks.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <TrackRow track={t} index={i} contextList={mostPlayedTracks} />
                        </div>
                        <span className="hidden sm:inline-block text-xs font-bold text-spotify-green bg-spotify-green/10 px-2.5 py-0.5 rounded-full shrink-0 tabular-nums">
                          {playCounts[t.id]} plays
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-spotify-muted py-12">
                  Play some imported songs and your top local tracks will appear here.
                </p>
              )}
            </div>
          </div>
        )}

        {/* MOBILE LIBRARY VIEW (< 768px) */}
        {route.name === 'library' && (
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Your Library</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void pickNativeAudioFiles()}
                  className="p-2 rounded-full bg-[#242424] text-white"
                  title="Import Audio Files"
                >
                  <FileAudio size={18} />
                </button>
                <button
                  onClick={() => void pickNativeAudioFolder()}
                  className="p-2 rounded-full bg-[#242424] text-white"
                  title="Import Folder"
                >
                  <FolderOpen size={18} />
                </button>
                <button
                  onClick={() => navigate({ name: 'stats' })}
                  className="p-2 rounded-full bg-[#242424] text-spotify-green"
                  title="Listening Stats"
                >
                  <BarChart3 size={18} />
                </button>
                <button
                  onClick={() => navigate({ name: 'settings' })}
                  className="p-2 rounded-full bg-[#242424] text-white"
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => createPlaylist()}
                  className="p-2 rounded-full bg-[#242424] text-white"
                  title="Create Playlist"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {(['playlists', 'albums', 'artists'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMobileLibTab(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize ${
                    mobileLibTab === t ? 'bg-white text-black' : 'bg-[#242424] text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {mobileLibTab === 'playlists' && (
              <div className="space-y-2">
                {userPlaylists.map(pl => (
                  <div
                    key={pl.id}
                    onClick={() =>
                      navigate(pl.isLikedSongs ? { name: 'liked' } : { name: 'playlist', id: pl.id })
                    }
                    className="flex items-center gap-3 p-2 rounded-md active:bg-white/10"
                  >
                    {pl.isLikedSongs ? (
                      <div className="w-14 h-14 rounded bg-gradient-to-br from-[#450af5] via-[#6033e3] to-[#c4efd9] flex items-center justify-center shrink-0">
                        <Heart size={22} className="text-white fill-white" />
                      </div>
                    ) : pl.isLocalFiles ? (
                      <div className="w-14 h-14 rounded bg-[#006450] flex items-center justify-center shrink-0">
                        <FolderOpen size={22} className="text-spotify-green" />
                      </div>
                    ) : pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.title} className="w-14 h-14 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-[#282828] flex items-center justify-center shrink-0">
                        <Music size={22} className="text-spotify-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-white truncate">{pl.title}</p>
                      <p className="text-xs text-spotify-muted truncate">
                        {pl.isLikedSongs
                          ? `Playlist • ${likedTrackIds.length} songs`
                          : `Playlist • ${pl.trackIds.length} songs`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mobileLibTab === 'albums' && (
              <div className="space-y-2">
                {albums.map(alb => (
                  <div
                    key={alb.id}
                    onClick={() =>
                      navigate({ name: 'album', albumName: alb.name, artistName: alb.artist })
                    }
                    className="flex items-center gap-3 p-2 rounded-md active:bg-white/10"
                  >
                    <div className="w-14 h-14 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                      {alb.coverUrl ? (
                        <img src={alb.coverUrl} alt={alb.name} className="w-14 h-14 object-cover" />
                      ) : (
                        <Disc3 size={22} className="text-spotify-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-white truncate">{alb.name}</p>
                      <p className="text-xs text-spotify-muted truncate">
                        {alb.artist} • {alb.trackIds.length} songs
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mobileLibTab === 'artists' && (
              <div className="space-y-2">
                {artists.map(art => (
                  <div
                    key={art.id}
                    onClick={() => navigate({ name: 'artist', id: art.id })}
                    className="flex items-center gap-3 p-2 rounded-md active:bg-white/10"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                      {art.coverUrl ? (
                        <img src={art.coverUrl} alt={art.name} className="w-14 h-14 object-cover" />
                      ) : (
                        <User size={22} className="text-spotify-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-white truncate">{art.name}</p>
                      <p className="text-xs text-spotify-muted truncate">
                        {art.trackIds.length} songs
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LYRICS VIEW */}
        {route.name === 'lyrics' && <LyricsView />}

        {/* HOME VIEW — CLEAN ZERO-RECOMMENDATIONS OFFLINE PLAYER */}
        {route.name === 'home' && (
          <div
            className="min-h-full px-4 md:px-6 pt-4 pb-12 space-y-8 transition-[background] duration-500"
            style={{
              background: `linear-gradient(to bottom, ${
                hoverAccent
                  ? `${hoverAccent}55`
                  : currentTrack?.accentColor && currentTrack.accentColor !== '#282828'
                  ? `${currentTrack.accentColor}44`
                  : 'rgba(31,31,31,0.65)'
              }, ${baseBg} 280px)`,
            }}
          >
            {/* Mobile Spotify-style Top Header */}
            <div className="flex md:hidden items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate({ name: 'profile' })}
                  className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-white/15 shrink-0"
                  title="Profile"
                >
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      style={{ backgroundColor: profile.accentColor || '#2e77d0' }}
                      className="w-full h-full flex items-center justify-center text-xs font-black text-white"
                    >
                      {(profile.displayName || 'M').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                <GradientText className="font-black text-lg tracking-tight">
                  {new Date().getHours() < 12
                    ? 'Good morning'
                    : new Date().getHours() < 18
                    ? 'Good afternoon'
                    : 'Good evening'}
                </GradientText>
              </div>
              <div className="flex items-center gap-2">
                <StarBorder>
                  <button
                    type="button"
                    onClick={() => void pickNativeAudioFiles()}
                    className="bg-[#121212] text-spotify-green text-xs font-bold px-3 py-1 rounded-full cursor-pointer"
                  >
                    + Add
                  </button>
                </StarBorder>
                <button
                  onClick={() => navigate({ name: 'settings' })}
                  className="p-2 rounded-full bg-[#242424]/80 backdrop-blur-md border border-white/10 text-white"
                  title="Settings"
                >
                  <Settings size={17} />
                </button>
              </div>
            </div>

            {/* Home Filter Pills + Stats, Quick Actions, and Grid/List Toggle */}
            {tracks.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'playlists', label: 'Playlists' },
                      { id: 'albums', label: 'Albums' },
                      { id: 'artists', label: 'Artists' },
                    ] as const
                  ).map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => setHomeFilter(chip.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        homeFilter === chip.id
                          ? 'bg-white text-black'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Quick Action Pill Buttons */}
                  <button
                    onClick={() => void pickNativeAudioFiles()}
                    className="bg-white hover:bg-white/90 text-black font-semibold text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-sm shrink-0"
                    title="Import audio files"
                  >
                    <FileAudio size={14} />
                    <span>Open Files</span>
                  </button>
                  <button
                    onClick={() => void pickNativeAudioFolder()}
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Import music folder"
                  >
                    <FolderOpen size={14} />
                    <span>Open Folder</span>
                  </button>
                  <button
                    onClick={() => createPlaylist()}
                    className="border border-white/25 hover:border-white text-white font-semibold text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Create new playlist"
                  >
                    <Plus size={14} />
                    <span>Create Playlist</span>
                  </button>

                  <button
                    onClick={() =>
                      updateAudioSettings({
                        viewMode: (settings.viewMode || 'grid') === 'grid' ? 'list' : 'grid',
                      })
                    }
                    title={`Switch to ${(settings.viewMode || 'grid') === 'grid' ? 'List' : 'Grid'} view`}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0 cursor-pointer ml-1"
                  >
                    {(settings.viewMode || 'grid') === 'grid' ? (
                      <>
                        <List size={14} /> <span>List</span>
                      </>
                    ) : (
                      <>
                        <LayoutGrid size={14} /> <span>Grid</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Quick-Access Grid for Playlists */}
            {userPlaylists.length > 0 && (homeFilter === 'all' || homeFilter === 'playlists') && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {userPlaylists.slice(0, 8).map(pl => {
                  const isThisPlaying = isPlaying && activePlaylistId === pl.id;
                  return (
                    <GlareHover
                      key={pl.id}
                      onMouseEnter={() =>
                        setHoverAccent(
                          pl.isLikedSongs
                            ? '#5038a0'
                            : pl.isLocalFiles
                            ? '#006450'
                            : pl.accentColor !== '#282828'
                            ? pl.accentColor
                            : null
                        )
                      }
                      onMouseLeave={() => setHoverAccent(null)}
                      onClick={() =>
                        navigate(pl.isLikedSongs ? { name: 'liked' } : { name: 'playlist', id: pl.id })
                      }
                      className="h-14 md:h-16 bg-white/10 hover:bg-white/20 transition-all duration-200 rounded-md flex items-center overflow-hidden cursor-pointer group relative shadow-sm"
                    >
                      <div className="w-14 md:w-16 h-full shrink-0 shadow-md">
                        {pl.isLikedSongs ? (
                          <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#6033e3] to-[#c4efd9] flex items-center justify-center">
                            <Heart size={24} className="text-white fill-white" />
                          </div>
                        ) : pl.isLocalFiles ? (
                          <div className="w-full h-full bg-[#006450] flex items-center justify-center">
                            <FolderOpen size={24} className="text-spotify-green" />
                          </div>
                        ) : pl.coverUrl ? (
                          <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                            <Music size={24} className="text-spotify-muted" />
                          </div>
                        )}
                      </div>

                      <div className="px-3.5 flex-1 min-w-0 pr-10 flex items-center justify-between gap-2">
                        <p className="text-sm md:text-base font-bold text-white truncate">
                          {pl.title}
                        </p>
                        {isThisPlaying && (
                          <div className="group-hover:opacity-0 transition-opacity shrink-0">
                            <EqualizerBars />
                          </div>
                        )}
                      </div>

                      {pl.trackIds.length > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            playPlaylist(pl.id);
                          }}
                          className="w-10 h-10 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 text-black flex items-center justify-center shadow-xl absolute right-2.5 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all cursor-pointer z-30"
                        >
                          {isThisPlaying ? (
                            <Pause16Icon size={16} className="text-black" />
                          ) : (
                            <PlayTriangleIcon size={18} className="text-black ml-0.5" />
                          )}
                        </button>
                      )}
                    </GlareHover>
                  );
                })}
              </div>
            )}

            {/* Empty Library State Card */}
            {tracks.length === 0 && (
              <div className="my-8 max-w-xl mx-auto">
                <SpotlightCard className="bg-[#181818]/90 border border-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-md">
                  <div className="w-14 h-14 rounded-full bg-spotify-green/15 text-spotify-green flex items-center justify-center mx-auto mb-3">
                    <Music size={28} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Build Your Music Library</h3>
                  <p className="text-xs sm:text-sm text-spotify-muted mb-6 max-w-md mx-auto leading-relaxed">
                    Import audio files or music folders from your computer to enjoy seamless offline listening, lyrics, and live audio visualizers.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full max-w-lg mx-auto">
                    <button
                      onClick={() => void pickNativeAudioFiles()}
                      className="bg-white hover:bg-white/90 text-black font-bold text-sm px-5 py-2.5 rounded-full inline-flex items-center justify-center gap-2 transition-transform hover:scale-105 cursor-pointer shadow-md shrink-0"
                    >
                      <FileAudio size={16} />
                      <span>Open Files</span>
                    </button>
                    <button
                      onClick={() => void pickNativeAudioFolder()}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-full inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                    >
                      <FolderOpen size={16} />
                      <span>Open Folder</span>
                    </button>
                    <button
                      onClick={() => createPlaylist()}
                      className="border border-white/20 hover:border-white text-white font-bold text-sm px-5 py-2.5 rounded-full inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus size={16} />
                      <span>Create Playlist</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-white/40 mt-4">
                    Or drag & drop audio files (.mp3, .flac, .wav, .m4a) anywhere into the window
                  </p>
                </SpotlightCard>
              </div>
            )}

            {/* Your Custom Playlists Shelf */}
                {(() => {
                  const shelfPlaylists =
                    homeFilter === 'playlists'
                      ? userPlaylists
                      : playlists.filter(p => !p.isLikedSongs && !p.isLocalFiles);

                  if (homeFilter !== 'all' && homeFilter !== 'playlists') return null;

                  return (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                            Your playlists
                          </h2>
                          <span className="text-xs font-semibold text-spotify-muted bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                            {shelfPlaylists.length}
                          </span>
                        </div>
                        {homeFilter === 'playlists' && (
                          <button
                            onClick={() => createPlaylist()}
                            className="text-xs font-bold text-spotify-green hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={14} /> <span>Create playlist</span>
                          </button>
                        )}
                      </div>

                      <div
                        className={
                          settings.viewMode === 'list'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-2'
                            : 'flex gap-3 overflow-x-auto snap-x no-scrollbar pb-2 md:pb-0 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-3.5 [&>*]:w-36 [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto'
                        }
                      >
                        {shelfPlaylists.map(pl => (
                          <SpotlightCard
                            key={pl.id}
                            onClick={() =>
                              navigate(pl.isLikedSongs ? { name: 'liked' } : { name: 'playlist', id: pl.id })
                            }
                            className="bg-spotify-card hover:bg-spotify-card-hover p-3 rounded-lg cursor-pointer group transition-colors"
                          >
                            <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] flex items-center justify-center shadow-lg">
                              {pl.isLikedSongs ? (
                                <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#6033e3] to-[#c4efd9] flex items-center justify-center">
                                  <Heart size={36} className="text-white fill-white" />
                                </div>
                              ) : pl.isLocalFiles ? (
                                <div className="w-full h-full bg-[#006450] flex items-center justify-center">
                                  <FolderOpen size={36} className="text-spotify-green" />
                                </div>
                              ) : pl.coverUrl ? (
                                <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                              ) : (
                                <Music size={32} className="text-spotify-muted" />
                              )}
                              {pl.trackIds.length > 0 && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    playPlaylist(pl.id);
                                  }}
                                  className="w-11 h-11 rounded-full bg-spotify-green hover:bg-spotify-green-hover hover:scale-105 text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all cursor-pointer z-10"
                                >
                                  <PlayTriangleIcon size={20} className="ml-0.5" />
                                </button>
                              )}
                            </div>
                            <p className="font-bold text-white text-sm truncate">{pl.title}</p>
                            <p className="text-xs text-spotify-muted truncate mt-0.5">
                              Playlist • {pl.trackIds.length} {pl.trackIds.length === 1 ? 'song' : 'songs'}
                            </p>
                          </SpotlightCard>
                        ))}

                        {/* Quick Add Playlist Card */}
                        <SpotlightCard
                          onClick={() => createPlaylist()}
                          className="bg-spotify-card/50 hover:bg-spotify-card-hover p-3 rounded-lg cursor-pointer group transition-colors border border-dashed border-white/10 hover:border-spotify-green/40 flex flex-col justify-between"
                        >
                          <div className="aspect-square rounded-md bg-[#222222] group-hover:bg-[#282828] flex flex-col items-center justify-center gap-2 text-spotify-muted group-hover:text-white transition-all shadow-inner mb-3">
                            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-spotify-green group-hover:text-black flex items-center justify-center transition-all group-hover:scale-110">
                              <Plus size={24} />
                            </div>
                            <span className="text-xs font-bold">New Playlist</span>
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm truncate">Create playlist</p>
                            <p className="text-xs text-spotify-muted truncate mt-0.5">Build your custom mix</p>
                          </div>
                        </SpotlightCard>
                      </div>
                    </section>
                  );
                })()}

                {/* Your Albums Shelf */}
                {albums.length > 0 && (homeFilter === 'all' || homeFilter === 'albums') && (
                  <section>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-4">
                      Your albums
                    </h2>
                    <div
                      className={
                        settings.viewMode === 'list'
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-2'
                          : 'flex gap-3 overflow-x-auto snap-x no-scrollbar pb-2 md:pb-0 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-3.5 [&>*]:w-36 [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto'
                      }
                    >
                      {(homeFilter === 'albums' ? albums : albums.slice(0, 12)).map(alb => {
                        const albTracks = alb.trackIds
                          .map(id => tracks.find(t => t.id === id))
                          .filter((t): t is Track => Boolean(t));
                        return (
                          <SpotlightCard
                            key={alb.id}
                            onClick={() =>
                              navigate({ name: 'album', albumName: alb.name, artistName: alb.artist })
                            }
                            className="bg-spotify-card hover:bg-spotify-card-hover p-3 rounded-lg cursor-pointer group transition-colors"
                          >
                            <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] flex items-center justify-center shadow-lg">
                              {alb.coverUrl ? (
                                <img src={alb.coverUrl} alt={alb.name} className="w-full h-full object-cover" />
                              ) : (
                                <Disc3 size={34} className="text-spotify-muted" />
                              )}
                              {albTracks[0] && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    playTrack(albTracks[0], albTracks, null);
                                  }}
                                  className="w-11 h-11 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all cursor-pointer"
                                >
                                  <PlayTriangleIcon size={20} className="ml-0.5" />
                                </button>
                              )}
                            </div>
                            <p className="font-bold text-white text-sm truncate">{alb.name}</p>
                            <p className="text-xs text-spotify-muted truncate mt-0.5">{alb.artist}</p>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Your Artists Shelf */}
                {artists.length > 0 && (homeFilter === 'all' || homeFilter === 'artists') && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                          Your artists
                        </h2>
                        <span className="text-xs font-semibold text-spotify-muted bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          {artists.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => scrollArtists('left')}
                          title="Previous artists"
                          className="w-8 h-8 rounded-full bg-[#181818] hover:bg-[#282828] text-white flex items-center justify-center border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => scrollArtists('right')}
                          title="Next artists"
                          className="w-8 h-8 rounded-full bg-[#181818] hover:bg-[#282828] text-white flex items-center justify-center border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                    <div
                      ref={artistsScrollRef}
                      className={
                        settings.viewMode === 'list'
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-2'
                          : 'flex gap-3.5 overflow-x-auto scroll-smooth snap-x no-scrollbar pb-2 [&>*]:w-36 sm:[&>*]:w-44 [&>*]:shrink-0 [&>*]:snap-start'
                      }
                    >
                      {artists.map(art => {
                        const artTracks = art.trackIds
                          .map(id => tracks.find(t => t.id === id))
                          .filter((t): t is Track => Boolean(t));
                        return (
                          <SpotlightCard
                            key={art.id}
                            onClick={() => navigate({ name: 'artist', id: art.id })}
                            className="bg-spotify-card hover:bg-spotify-card-hover p-3.5 rounded-lg cursor-pointer group transition-colors"
                          >
                            <div className="relative aspect-square mb-3">
                              <div className="w-full h-full rounded-full overflow-hidden bg-[#282828] flex items-center justify-center shadow-lg">
                                {art.coverUrl ? (
                                  <img src={art.coverUrl} alt={art.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={34} className="text-spotify-muted" />
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
                            <p className="text-xs text-spotify-muted truncate mt-0.5">
                              Artist • {art.trackIds.length} songs
                            </p>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Mobile Spotify-style Local Library Shortcut Card */}
                {homeFilter === 'all' && (
                  <div className="md:hidden">
                    <SpotlightCard
                      onClick={() => navigate({ name: 'playlist', id: 'local-files' })}
                      className="bg-gradient-to-r from-[#064e3b] to-[#181818] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-spotify-green text-black flex items-center justify-center shrink-0 shadow-lg">
                          <Music size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">All Local Songs</p>
                          <p className="text-xs text-white/75">
                            {tracks.length} tracks • Tap to browse & shuffle
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold shrink-0">
                        Open
                      </span>
                    </SpotlightCard>
                  </div>
                )}

                {/* Imported Tracks Table (Desktop full view — Mobile uses All Local Songs card + Library) */}
                {homeFilter === 'all' && (
                  <section className="hidden md:block">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                        Imported Tracks ({tracks.length})
                      </h2>
                      <button
                        onClick={() => void pickNativeAudioFiles()}
                        className="text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
                      >
                        + Add more
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {tracks.map((t, i) => (
                        <TrackRow
                          key={t.id}
                          track={t}
                          index={i}
                          contextList={tracks}
                          playlistId="local-files"
                        />
                      ))}
                    </div>
                  </section>
                )}
          </div>
        )}
        </div>
      </div>

      {/* Desktop Right Drawer Edge Handle */}
      {!isRightDrawerOpen && (
        <button
          onClick={() => toggleRightDrawer('nowPlaying')}
          title="Show Now Playing view"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-5 h-12 bg-[#1f1f1f]/90 hover:bg-[#2a2a2a] text-spotify-muted hover:text-white rounded-l-md items-center justify-center transition-colors z-30 cursor-pointer shadow"
        >
          <ChevronLeft size={14} />
        </button>
      )}
    </main>
  );
};
