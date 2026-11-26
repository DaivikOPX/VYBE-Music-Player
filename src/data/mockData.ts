import { Track, Playlist, Artist } from '../types';

export const INITIAL_TRACKS: Track[] = [];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'liked-songs',
    title: 'Liked Songs',
    description: 'Songs you save will appear here.',
    owner: 'You',
    type: 'playlist',
    category: 'Music',
    coverUrl: '',
    accentColor: '#5038a0',
    pinned: true,
    isLikedSongs: true,
    trackIds: []
  }
];

export const INITIAL_ARTISTS: Artist[] = [];

export const CONNECT_DEVICES = [
  { id: 'dev-local', name: 'This Device', type: 'Active playback device' }
];
