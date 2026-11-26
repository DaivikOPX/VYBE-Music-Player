import React, { useRef, useState } from 'react';
import { Camera, Check, Music, Pencil, Settings, User, BarChart3 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { TrackRow } from './TrackRow';
import { PlayTriangleIcon } from './SpotifyIcons';
import { Track } from '../types';
import { TiltedCard, SpotlightCard, BlurText, ShinyText, CountUp } from './reactbits';

const resizeAvatarToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 320;
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

export const ProfileView: React.FC = () => {
  const {
    profile,
    updateProfile,
    playlists,
    tracks,
    artists,
    likedTrackIds,
    playCounts,
    playPlaylist,
    playTrack,
    navigate,
    settings,
  } = usePlayer();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const userPlaylists = playlists.filter(p => p.isUserCreated || p.isLikedSongs);
  const totalPlays = Object.values(playCounts).reduce((sum, n) => sum + n, 0);

  const topTracks = tracks
    .filter(t => (playCounts[t.id] || 0) > 0)
    .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
    .slice(0, 5);

  const topArtists = [...artists]
    .map(art => ({
      artist: art,
      plays: art.trackIds.reduce((sum, id) => sum + (playCounts[id] || 0), 0),
    }))
    .filter(x => x.plays > 0)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeAvatarToDataUrl(file);
      updateProfile({ avatarUrl: dataUrl });
    } catch {
      // ignore invalid image
    }
  };

  const commitEdit = () => {
    updateProfile({
      displayName: draftName.trim() || 'Music Lover',
      bio: draftBio.trim(),
    });
    setEditing(false);
  };

  const baseBg = settings.amoledMode ? '#000000' : '#121212';
  const initial = (profile.displayName || 'M').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-full">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={e => void handleAvatarChange(e)}
        className="hidden"
      />

      {/* Profile Header */}
      <div
        className="px-4 md:px-6 pt-8 md:pt-12 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-6"
        style={{
          background: `linear-gradient(to bottom, ${profile.accentColor || '#2e77d0'}, ${baseBg}e0)`,
        }}
      >
        <TiltedCard
          rotateAmplitude={10}
          scaleOnHover={1.03}
          onClick={() => avatarInputRef.current?.click()}
          className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-[#282828] flex items-center justify-center shrink-0 cursor-pointer group border border-white/10"
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl md:text-6xl font-black text-white/90">{initial}</span>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
            <Camera size={26} />
            <span className="text-xs font-bold">Choose photo</span>
          </div>
        </TiltedCard>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <ShinyText text="Profile" className="text-xs font-bold uppercase tracking-wider" />

          {editing ? (
            <div className="space-y-2 my-2 max-w-md mx-auto sm:mx-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
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
                  <Check size={18} />
                </button>
              </div>
              <input
                type="text"
                value={draftBio}
                onChange={e => setDraftBio(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                placeholder="Add a short bio or listening motto"
                className="bg-white/10 text-white text-sm px-3 py-1.5 rounded outline-none focus:ring-1 focus:ring-white/60 w-full placeholder:text-white/40"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-3 group">
              <h1
                onClick={() => {
                  setDraftName(profile.displayName);
                  setDraftBio(profile.bio);
                  setEditing(true);
                }}
                className="text-3xl md:text-6xl font-black text-white tracking-tight my-2 truncate cursor-pointer hover:underline"
              >
                <BlurText text={profile.displayName} />
              </h1>
              <button
                onClick={() => {
                  setDraftName(profile.displayName);
                  setDraftBio(profile.bio);
                  setEditing(true);
                }}
                title="Edit profile"
                className="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white cursor-pointer"
              >
                <Pencil size={18} />
              </button>
            </div>
          )}

          {profile.bio && (
            <p className="text-sm text-white/75 mb-2 line-clamp-2">{profile.bio}</p>
          )}

          <p className="text-xs md:text-sm text-white/85 font-medium">
            <CountUp to={userPlaylists.length} /> Playlists •{' '}
            <CountUp to={likedTrackIds.length} /> Liked Songs •{' '}
            <CountUp to={artists.length} /> Artists •{' '}
            <CountUp to={totalPlays} /> Local Plays
          </p>
        </div>
      </div>

      {/* Body */}
      <div
        className="px-4 md:px-6 py-6 space-y-10 pb-14"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0.25), ${baseBg} 180px)`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDraftName(profile.displayName);
              setDraftBio(profile.bio);
              setEditing(true);
            }}
            className="px-4 py-1.5 rounded-full border border-white/25 hover:border-white text-xs font-bold text-white cursor-pointer"
          >
            Edit profile
          </button>
          <button
            onClick={() => navigate({ name: 'settings' })}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => navigate({ name: 'stats' })}
            className="px-4 py-1.5 rounded-full bg-spotify-green text-black hover:bg-spotify-green-hover text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 size={14} />
            <span>Listening Stats</span>
          </button>
        </div>

        {/* Top Artists */}
        {topArtists.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Top artists in your library</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {topArtists.map(({ artist, plays }) => {
                const artTracks = artist.trackIds
                  .map(id => tracks.find(t => t.id === id))
                  .filter((t): t is Track => Boolean(t));
                return (
                  <SpotlightCard
                    key={artist.id}
                    onClick={() => navigate({ name: 'artist', id: artist.id })}
                    className="bg-spotify-card hover:bg-spotify-card-hover p-3 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className="relative aspect-square rounded-full overflow-hidden mb-3 bg-[#282828] flex items-center justify-center shadow-lg">
                      {artist.coverUrl ? (
                        <img
                          src={artist.coverUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={32} className="text-spotify-muted" />
                      )}
                      {artTracks[0] && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            playTrack(artTracks[0], artTracks, null);
                          }}
                          className="w-10 h-10 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <PlayTriangleIcon size={18} className="ml-0.5" />
                        </button>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm truncate">{artist.name}</p>
                    <p className="text-xs text-spotify-muted mt-0.5">{plays} plays</p>
                  </SpotlightCard>
                );
              })}
            </div>
          </section>
        )}

        {/* Top Tracks */}
        {topTracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">Top tracks</h2>
              <button
                onClick={() => navigate({ name: 'most-played' })}
                className="text-xs font-bold text-spotify-muted hover:underline cursor-pointer"
              >
                Show all
              </button>
            </div>
            <div className="space-y-0.5">
              {topTracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} contextList={topTracks} />
              ))}
            </div>
          </section>
        )}

        {/* Playlists */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Your playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {userPlaylists.map(pl => (
              <SpotlightCard
                key={pl.id}
                onClick={() =>
                  navigate(pl.isLikedSongs ? { name: 'liked' } : { name: 'playlist', id: pl.id })
                }
                className="bg-spotify-card hover:bg-spotify-card-hover p-3.5 rounded-lg cursor-pointer group transition-colors"
              >
                <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] flex items-center justify-center shadow-lg">
                  {pl.coverUrl ? (
                    <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music size={34} className="text-spotify-muted" />
                  )}
                  {pl.trackIds.length > 0 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        playPlaylist(pl.id);
                      }}
                      className="w-11 h-11 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-xl absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <PlayTriangleIcon size={20} className="ml-0.5" />
                    </button>
                  )}
                </div>
                <p className="font-bold text-white text-sm truncate">{pl.title}</p>
                <p className="text-xs text-spotify-muted mt-0.5">{pl.trackIds.length} songs</p>
              </SpotlightCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
