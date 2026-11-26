import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  Track,
  Playlist,
  Artist,
  AlbumSummary,
  ViewRoute,
  RightDrawerMode,
  NativeAudioItem,
  AudioSettings,
  UserProfile,
  PersistedAppState,
  PlaylistFolder,
  ListeningStats,
  LyricLine,
  SmartRuleConfig
} from '../types';
import { INITIAL_PLAYLISTS } from '../data/mockData';
import { parseBrowserAudioFile } from '../utils/audioMetadata';
import { extractDominantColor } from '../utils/colorExtract';
import { matchM3uTracks } from '../utils/playlistUtils';
import {
  loadPersistedState,
  savePersistedState,
  loadBrowserAudioTracks,
  saveBrowserAudioTrack,
  deleteBrowserAudioTrack,
  saveWebDirectoryHandle,
  loadWebDirectoryHandles,
  deleteWebDirectoryHandle,
  collectFilesFromWebDirectoryHandle
} from '../utils/storage';

interface LocalMediaPluginAPI {
  updateState(opts: {
    title: string;
    artist: string;
    album: string;
    isPlaying: boolean;
    durationMs: number;
    positionMs: number;
    coverDataUrl: string;
  }): Promise<void>;
  stopService(): Promise<void>;
  addListener(
    eventName: 'mediaControl',
    cb: (data: { action: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const LocalMedia = Capacitor.isNativePlatform()
  ? registerPlugin<LocalMediaPluginAPI>('LocalMedia')
  : null;

export const EQ_BANDS = [60, 170, 400, 1000, 3000, 10000] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 4.5, 1.5, 0, 0, 0],
  Pop: [-1.5, 2, 4.5, 4, 1.5, -1],
  Rock: [4.5, 3, -1.5, -1, 2.5, 4.5],
  Electronic: [5, 3.5, 0.5, -1.5, 3, 5],
  Vocal: [-2, -1, 2.5, 5, 3.5, 0.5]
};

const DEFAULT_SETTINGS: AudioSettings = {
  eqPreset: 'Flat',
  eqGains: [0, 0, 0, 0, 0, 0],
  crossfadeSec: 0,
  playbackRate: 1,
  compactMode: false,
  amoledMode: false,
  hazyMode: false,
  hazyBlur: 45,
  sidebarMode: 'pinned',
  preampDb: 0,
  showVisualizer: true,
  animationsEnabled: true,
  resumeOnStartup: true,
  closeToTray: false,
  showFormatBadges: false,
  gaplessPlayback: true,
  normalizeVolume: 'off',
  monoAudio: false,
  audioBalance: 0,
  privateSession: false,
  customEqPresets: {},
  viewMode: 'grid',
  desktopNotifications: false,
  startOnBoot: false,
  globalShortcuts: true,
  visualizerStyle: 'bars',
  zoomLevel: 100
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Music Lover',
  avatarUrl: '',
  accentColor: '#2e77d0',
  bio: ''
};

export interface AbLoopState {
  a: number | null;
  b: number | null;
}

export type SleepTimerMode = null | { kind: 'until'; endAt: number } | { kind: 'end-of-track' } | { kind: 'end-of-queue' };

interface PlayerContextType {
  // Catalog & Derived Collections
  tracks: Track[];
  playlists: Playlist[];
  folders: PlaylistFolder[];
  artists: Artist[];
  albums: AlbumSummary[];
  watchedFolders: string[];
  likedTrackIds: string[];
  followedArtistIds: string[];
  savedPlaylistIds: string[];
  savedAlbumIds: string[];
  playCounts: Record<string, number>;
  lastPlayedMap: Record<string, number>;
  recentlyPlayedIds: string[];
  searchHistory: string[];
  listeningStats: ListeningStats;
  smartRules: SmartRuleConfig[];
  missingTrackIds: string[];
  disconnectedDriveTrackIds: string[];
  isImporting: boolean;

  // Playback State
  currentTrack: Track | null;
  activePlaylistId: string | null;
  contextTracks: Track[];
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';

  // Audio Tools State (A-B Loop, EQ, Speed, Crossfade, Sleep Timer)
  settings: AudioSettings;
  updateAudioSettings: (patch: Partial<AudioSettings>) => void;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  removeWatchedFolder: (folder: string) => void;
  clearListeningHistory: () => void;
  exportLibraryBackup: () => void;
  importLibraryBackup: (jsonText: string) => void;
  abLoop: AbLoopState;
  sleepTimer: SleepTimerMode;
  sleepRemainingSec: number | null;
  setEqPreset: (preset: string) => void;
  setEqBandGain: (index: number, db: number) => void;
  saveCustomEqPreset: (name: string) => void;
  deleteCustomEqPreset: (name: string) => void;
  setCrossfadeSec: (sec: number) => void;
  setPlaybackRate: (rate: number) => void;
  setCompactMode: (v: boolean) => void;
  setAmoledMode: (v: boolean) => void;
  setHazyMode: (v: boolean) => void;
  setHazyBlur: (val: number) => void;
  setLoopA: () => void;
  setLoopB: () => void;
  clearAbLoop: () => void;
  startSleepTimer: (minutes: number | 'end-of-track' | 'end-of-queue' | null) => void;
  moveQueueItem: (fromIdx: number, toIdx: number) => void;
  shuffleQueue: () => void;
  reverseQueue: () => void;
  saveQueueAsPlaylist: (titleName?: string) => Playlist;
  queueRemainingSec: number;
  queueEstimatedEndTime: Date | null;

  // Navigation History
  route: ViewRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  navigate: (nextRoute: ViewRoute) => void;
  goBack: () => void;
  goForward: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addSearchHistory: (q: string) => void;
  clearSearchHistory: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  // Drawers & Overlays
  isRightDrawerOpen: boolean;
  rightDrawerMode: RightDrawerMode;
  openRightDrawer: (mode: RightDrawerMode) => void;
  toggleRightDrawer: (mode: RightDrawerMode) => void;
  closeRightDrawer: () => void;
  activeDeviceId: string;
  setActiveDeviceId: (id: string) => void;
  audioOutputDevices: { deviceId: string; label: string }[];
  selectAudioOutputDevice: (deviceId: string, label?: string) => Promise<void>;
  isMiniplayer: boolean;
  setIsMiniplayer: (v: boolean) => void;
  isTheaterMode: boolean;
  setIsTheaterMode: (v: boolean) => void;
  isMobilePlayerOpen: boolean;
  setIsMobilePlayerOpen: (v: boolean) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (v: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  getFrequencyData: (target: Uint8Array<ArrayBuffer>) => boolean;
  getWaveformData: (target: Uint8Array<ArrayBuffer>) => boolean;

  // Scrubbing Lock
  beginScrub: () => void;
  commitScrub: (seconds: number) => void;

  // Actions
  playTrack: (track: Track, list?: Track[], playlistId?: string | null) => void;
  playPlaylist: (playlistId: string, startIndex?: number) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNextInQueue: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIdx: number, toIdx: number) => void;
  clearQueue: () => void;
  toggleLikeTrack: (trackId: string) => void;
  toggleFollowArtist: (artistId: string) => void;
  toggleSavePlaylist: (playlistId: string) => void;
  toggleSaveAlbum: (albumId: string) => void;
  togglePinPlaylist: (playlistId: string) => void;
  createPlaylist: (title?: string, folderId?: string) => Playlist;
  importM3uPlaylist: (name: string, content: string) => number;
  deletePlaylist: (playlistId: string) => void;
  createFolder: (name?: string) => PlaylistFolder;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  movePlaylistToFolder: (playlistId: string, folderId: string | undefined) => void;
  renamePlaylist: (playlistId: string, title: string, description?: string) => void;
  updatePlaylistCover: (playlistId: string, coverUrl: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylistTracks: (playlistId: string, fromIdx: number, toIdx: number) => void;
  removeTrackFromLibrary: (trackId: string) => void;
  updateTrackMetadata: (
    trackIds: string[],
    patch: Partial<Pick<Track, 'title' | 'artist' | 'album' | 'genre' | 'year' | 'trackNumber' | 'coverUrl' | 'explicit'>>
  ) => void;
  toggleTrackExplicit: (trackId: string) => void;
  renameTrackFile: (trackId: string, newTitle: string) => Promise<boolean>;
  updateTrackLyrics: (trackId: string, lyrics: LyricLine[], offsetSec?: number) => void;
  checkMissingFiles: () => Promise<number>;
  removeMissingTracks: () => void;
  addCustomSmartRule: (rule: Omit<SmartRuleConfig, 'id'>) => SmartRuleConfig;
  deleteCustomSmartRule: (id: string) => void;
  importBrowserAudioFiles: (files: FileList | File[]) => void;
  handleDroppedFiles: (dataTransfer: DataTransfer) => Promise<void>;
  pickNativeAudioFiles: () => Promise<void>;
  pickNativeAudioFolder: () => Promise<void>;
  rescanWatchedFolders: () => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
const AUDIO_EXT_RE = /\.(mp3|wav|ogg|flac|m4a|aac|opus|webm|aiff|aif)$/i;

const hashString = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

const makeArtistId = (name: string) => `art-${hashString(name.trim().toLowerCase())}`;

const getLocalDayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [folders, setFolders] = useState<PlaylistFolder[]>([]);
  const [watchedFolders, setWatchedFolders] = useState<string[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([]);
  const [savedPlaylistIds, setSavedPlaylistIds] = useState<string[]>(['liked-songs']);
  const [savedAlbumIds, setSavedAlbumIds] = useState<string[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [lastPlayedMap, setLastPlayedMap] = useState<Record<string, number>>({});
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [listeningStats, setListeningStats] = useState<ListeningStats>({
    totalListeningSec: 0,
    dailyListening: {},
    hourlyListening: {},
    skipCounts: {},
    totalSkips: 0,
    sessionCount: 0,
    totalSessionSec: 0,
    lastSessionAt: 0
  });
  const [smartRules, setSmartRules] = useState<SmartRuleConfig[]>([]);
  const [customTracksMeta, setCustomTracksMeta] = useState<PersistedAppState['customTracksMeta']>({});
  const [missingTrackIds, setMissingTrackIds] = useState<string[]>([]);
  const [disconnectedDriveTrackIds, setDisconnectedDriveTrackIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [contextTracks, setContextTracks] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [abLoop, setAbLoop] = useState<AbLoopState>({ a: null, b: null });
  const [sleepTimer, setSleepTimer] = useState<SleepTimerMode>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);

  // Dual audio decks for seamless crossfading + Web Audio EQ
  const decksRef = useRef<[HTMLAudioElement, HTMLAudioElement] | null>(null);
  const activeDeckIdxRef = useRef<0 | 1>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const preampGainRef = useRef<GainNode | null>(null);
  const monoMixRef = useRef<GainNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const deckGainNodesRef = useRef<[GainNode, GainNode] | null>(null);
  const crossfadeActiveRef = useRef(false);

  const tracksRef = useRef<Track[]>([]);
  const playlistsRef = useRef<Playlist[]>(INITIAL_PLAYLISTS);
  const currentTrackRef = useRef<Track | null>(null);
  const contextTracksRef = useRef<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const repeatModeRef = useRef<'off' | 'all' | 'one'>('off');
  const isShuffleRef = useRef(false);
  const volumeRef = useRef(0.8);
  const isMutedRef = useRef(false);
  const settingsRef = useRef<AudioSettings>(DEFAULT_SETTINGS);
  const abLoopRef = useRef<AbLoopState>({ a: null, b: null });
  const sleepTimerRef = useRef<SleepTimerMode>(null);
  const isScrubbingRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const playSessionRef = useRef(0);
  const hydratedRef = useRef(false);

  tracksRef.current = tracks;
  playlistsRef.current = playlists;
  currentTrackRef.current = currentTrack;
  contextTracksRef.current = contextTracks;
  queueRef.current = queue;
  repeatModeRef.current = repeatMode;
  isShuffleRef.current = isShuffle;
  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  settingsRef.current = settings;
  abLoopRef.current = abLoop;
  sleepTimerRef.current = sleepTimer;

  // Navigation history (atomic state)
  const [navState, setNavState] = useState<{ history: ViewRoute[]; index: number }>({
    history: [{ name: 'home' }],
    index: 0
  });
  const route = navState.history[navState.index];

  const [searchQuery, setSearchQueryState] = useState('');
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [rightDrawerMode, setRightDrawerMode] = useState<RightDrawerMode>('nowPlaying');
  const [activeDeviceId, setActiveDeviceId] = useState('default');
  const [audioOutputDevices, setAudioOutputDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [isMiniplayer, setIsMiniplayer] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  // Derived Artists & Albums from parsed track tags
  const artists = useMemo<Artist[]>(() => {
    const map = new Map<string, Artist>();
    for (const t of tracks) {
      const name = t.artist || 'Unknown Artist';
      const id = makeArtistId(name);
      const existing = map.get(id);
      if (existing) {
        existing.trackIds.push(t.id);
        if (t.album && !existing.albums.includes(t.album)) existing.albums.push(t.album);
        if (!existing.coverUrl && t.coverUrl) {
          existing.coverUrl = t.coverUrl;
          existing.accentColor = t.accentColor;
        }
      } else {
        map.set(id, {
          id,
          name,
          coverUrl: t.coverUrl,
          accentColor: t.accentColor || '#282828',
          trackIds: [t.id],
          albums: t.album ? [t.album] : []
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const albums = useMemo<AlbumSummary[]>(() => {
    const map = new Map<string, AlbumSummary>();
    for (const t of tracks) {
      const rawAlbum = t.album?.trim();
      // Skip missing albums, generic 'Local Files', or tracks without an album
      if (!rawAlbum || rawAlbum.toLowerCase() === 'local files' || rawAlbum.toLowerCase() === 'unknown') {
        continue;
      }
      const albumName = rawAlbum;
      const key = `${albumName.toLowerCase()}::${(t.artist || '').toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.trackIds.push(t.id);
        if (!existing.coverUrl && t.coverUrl) {
          existing.coverUrl = t.coverUrl;
          existing.accentColor = t.accentColor;
        }
      } else {
        map.set(key, {
          id: `alb-${hashString(key)}`,
          name: albumName,
          artist: t.artist || 'Unknown Artist',
          artistId: makeArtistId(t.artist || 'Unknown Artist'),
          year: t.year,
          coverUrl: t.coverUrl,
          accentColor: t.accentColor || '#282828',
          trackIds: [t.id]
        });
      }
    }
    // Only treat as an independent album if it has multiple tracks (>= 2 tracks)
    // OR if the user explicitly saved/favorited it as an album.
    // Standalone individual single songs will NOT be treated as independent albums.
    const allAlbums = Array.from(map.values());
    const realAlbums = allAlbums.filter(alb => {
      if (savedAlbumIds.includes(alb.id)) return true;
      return alb.trackIds.length > 1;
    });

    return realAlbums.sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks, savedAlbumIds]);

  const getActiveAudio = useCallback(() => {
    return decksRef.current ? decksRef.current[activeDeckIdxRef.current] : null;
  }, []);

  // Lazily wire Web Audio API 6-band EQ + Dual-Deck Gain Nodes on first playback
  const ensureAudioGraph = useCallback(() => {
    if (!decksRef.current) return;
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const [d0, d1] = decksRef.current;
      const s0 = ctx.createMediaElementSource(d0);
      const s1 = ctx.createMediaElementSource(d1);
      const g0 = ctx.createGain();
      const g1 = ctx.createGain();
      g0.gain.value = 1;
      g1.gain.value = 1;

      const filters = EQ_BANDS.map((freq, idx) => {
        const f = ctx.createBiquadFilter();
        f.type = idx === 0 ? 'lowshelf' : idx === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        f.Q.value = 1.0;
        f.gain.value = settingsRef.current.eqGains[idx] ?? 0;
        return f;
      });

      s0.connect(g0);
      s1.connect(g1);
      g0.connect(filters[0]);
      g1.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      const preamp = ctx.createGain();
      const normDb =
        settingsRef.current.normalizeVolume === 'quiet'
          ? -4
          : settingsRef.current.normalizeVolume === 'loud'
          ? 3.5
          : 0;
      preamp.gain.value = Math.pow(10, ((settingsRef.current.preampDb ?? 0) + normDb) / 20);
      const monoMix = ctx.createGain();
      monoMix.channelInterpretation = 'speakers';
      if (settingsRef.current.monoAudio) {
        monoMix.channelCount = 1;
        monoMix.channelCountMode = 'explicit';
      } else {
        monoMix.channelCount = 2;
        monoMix.channelCountMode = 'max';
      }
      const panner = ctx.createStereoPanner();
      panner.pan.value = settingsRef.current.audioBalance ?? 0;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;
      filters[filters.length - 1].connect(preamp);
      preamp.connect(monoMix);
      monoMix.connect(panner);
      panner.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      eqFiltersRef.current = filters;
      preampGainRef.current = preamp;
      monoMixRef.current = monoMix;
      pannerRef.current = panner;
      analyserRef.current = analyser;
      deckGainNodesRef.current = [g0, g1];
    } catch {
      // Safe fallback: direct HTMLAudioElement playback without EQ
    }
  }, []);

  const getFrequencyData = useCallback((target: Uint8Array<ArrayBuffer>) => {
    const node = analyserRef.current;
    if (!node) return false;
    try {
      node.getByteFrequencyData(target);
      return true;
    } catch {
      return false;
    }
  }, []);

  const getWaveformData = useCallback((target: Uint8Array<ArrayBuffer>) => {
    const node = analyserRef.current;
    if (!node) return false;
    try {
      node.getByteTimeDomainData(target);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Sync EQ gains, Preamp, and Desktop Tray setting dynamically
  useEffect(() => {
    eqFiltersRef.current.forEach((node, idx) => {
      node.gain.value = settings.eqGains[idx] ?? 0;
    });
  }, [settings.eqGains]);

  useEffect(() => {
    if (preampGainRef.current && audioCtxRef.current) {
      const normDb =
        settings.normalizeVolume === 'quiet'
          ? -4
          : settings.normalizeVolume === 'loud'
          ? 3.5
          : 0;
      const db = (settings.preampDb ?? 0) + normDb;
      preampGainRef.current.gain.setValueAtTime(
        Math.pow(10, db / 20),
        audioCtxRef.current.currentTime
      );
    }
  }, [settings.preampDb, settings.normalizeVolume]);

  useEffect(() => {
    if (pannerRef.current && audioCtxRef.current) {
      pannerRef.current.pan.setValueAtTime(
        settings.audioBalance ?? 0,
        audioCtxRef.current.currentTime
      );
    }
  }, [settings.audioBalance]);

  useEffect(() => {
    if (monoMixRef.current) {
      if (settings.monoAudio) {
        monoMixRef.current.channelCount = 1;
        monoMixRef.current.channelCountMode = 'explicit';
      } else {
        monoMixRef.current.channelCount = 2;
        monoMixRef.current.channelCountMode = 'max';
      }
    }
  }, [settings.monoAudio]);

  useEffect(() => {
    window.electronAPI?.setCloseToTray?.(Boolean(settings.closeToTray));
  }, [settings.closeToTray]);

  useEffect(() => {
    window.electronAPI?.setStartOnBoot?.(Boolean(settings.startOnBoot));
  }, [settings.startOnBoot]);

  useEffect(() => {
    window.electronAPI?.setGlobalShortcuts?.(settings.globalShortcuts !== false);
  }, [settings.globalShortcuts]);

  useEffect(() => {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.toggle('hazy-theme', Boolean(settings.hazyMode));

    const zoom = settings.zoomLevel || 100;
    (document.documentElement.style as any).zoom = `${zoom / 100}`;

    if (settings.hazyMode) {
      const blurVal = typeof settings.hazyBlur === 'number' ? settings.hazyBlur : 45;
      const bgBlur = Math.round((blurVal / 100) * 80);
      const panelBlur = Math.round((blurVal / 100) * 44);
      const panelAlpha = (0.07 + (blurVal / 100) * 0.36).toFixed(3);
      const cardAlpha = (0.04 + (blurVal / 100) * 0.26).toFixed(3);

      document.documentElement.style.setProperty('--hazy-bg-blur', `${bgBlur}px`);
      document.documentElement.style.setProperty('--hazy-panel-blur', `${panelBlur}px`);
      document.documentElement.style.setProperty('--hazy-panel-bg', `rgba(12, 12, 18, ${panelAlpha})`);
      document.documentElement.style.setProperty('--hazy-card-bg', `rgba(255, 255, 255, ${cardAlpha})`);
    } else {
      document.documentElement.style.removeProperty('--hazy-bg-blur');
      document.documentElement.style.removeProperty('--hazy-panel-blur');
      document.documentElement.style.removeProperty('--hazy-panel-bg');
      document.documentElement.style.removeProperty('--hazy-card-bg');
    }
  }, [settings.hazyMode, settings.hazyBlur, settings.zoomLevel]);

  // Listening time, hourly & session accumulator (every 1s while playing, unless privateSession)
  useEffect(() => {
    if (!isPlaying || settings.privateSession) return;
    const id = window.setInterval(() => {
      const now = new Date();
      const nowMs = now.getTime();
      const dayKey = getLocalDayKey(now);
      const hour = now.getHours();
      setListeningStats(prev => {
        const curDay = prev.dailyListening[dayKey] || { sec: 0, plays: 0 };
        const hourlyMap = prev.hourlyListening || {};
        const curHour = hourlyMap[hour] || { sec: 0, plays: 0 };
        const isNewSession =
          !prev.lastSessionAt ||
          nowMs - prev.lastSessionAt > 20 * 60 * 1000 ||
          !prev.sessionCount;
        return {
          ...prev,
          totalListeningSec: prev.totalListeningSec + 1,
          dailyListening: {
            ...prev.dailyListening,
            [dayKey]: { ...curDay, sec: curDay.sec + 1 }
          },
          hourlyListening: {
            ...hourlyMap,
            [hour]: { ...curHour, sec: curHour.sec + 1 }
          },
          sessionCount: (prev.sessionCount || 0) + (isNewSession ? 1 : 0),
          totalSessionSec: (prev.totalSessionSec || 0) + 1,
          lastSessionAt: nowMs
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, settings.privateSession]);

  // Sync playbackRate dynamically
  useEffect(() => {
    if (!decksRef.current) return;
    for (const deck of decksRef.current) {
      deck.playbackRate = settings.playbackRate;
      deck.preservesPitch = true;
    }
  }, [settings.playbackRate]);

  // Sync Liked Songs playlist
  useEffect(() => {
    setPlaylists(prev =>
      prev.map(p => (p.isLikedSongs ? { ...p, trackIds: Array.from(new Set(likedTrackIds)) } : p))
    );
  }, [likedTrackIds]);

  // Update Electron window title
  useEffect(() => {
    window.electronAPI?.updatePlayState(isPlaying, currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : undefined);
  }, [isPlaying, currentTrack]);

  // Helper: map native Electron items into Tracks + extract colors if missing
  const mapNativeItemsToTracks = useCallback(async (items: NativeAudioItem[]): Promise<Track[]> => {
    const out: Track[] = [];
    for (const item of items) {
      let accentColor = item.accentColor || '#282828';
      if (item.coverUrl && (!item.accentColor || item.accentColor === '#282828')) {
        accentColor = await extractDominantColor(item.coverUrl);
      }
      out.push({
        id: item.id,
        sourceKey: item.sourceKey || item.id,
        title: item.title,
        artist: item.artist || 'Unknown Artist',
        artistId: makeArtistId(item.artist || 'Unknown Artist'),
        album: item.album || 'Local Files',
        trackNumber: item.trackNumber,
        year: item.year,
        genre: item.genre,
        bitrate: item.bitrate,
        sampleRate: item.sampleRate,
        bitDepth: item.bitDepth,
        codec: item.codec,
        fileSize: item.fileSize,
        duration: item.duration || 0,
        plays: 'Local',
        dateAdded: 'Just now',
        addedAt: Date.now(),
        coverUrl: item.coverUrl || '',
        audioUrl: item.audioUrl,
        accentColor,
        category: 'Music',
        lyrics: item.lyrics
      });
    }
    return out;
  }, []);

  const addLocalTracksToLibrary = useCallback(async (newTracks: Track[], silent = false) => {
    if (newTracks.length === 0) {
      if (!silent) showToast('No supported audio files found');
      return;
    }

    const existingIds = new Set(tracksRef.current.map(t => t.id));
    const existingKeys = new Set(
      tracksRef.current.map(t => t.sourceKey).filter((k): k is string => Boolean(k))
    );
    const batchSeen = new Set<string>();
    const uniqueTracks: Track[] = [];
    let skipped = 0;

    for (const t of newTracks) {
      const key = t.sourceKey || t.id;
      if (existingIds.has(t.id) || existingKeys.has(key) || batchSeen.has(t.id) || batchSeen.has(key)) {
        skipped++;
        if (t.audioUrl.startsWith('blob:')) URL.revokeObjectURL(t.audioUrl);
        continue;
      }
      batchSeen.add(t.id);
      batchSeen.add(key);
      uniqueTracks.push(t);
    }

    if (uniqueTracks.length === 0) {
      if (!silent) {
        showToast(`All ${skipped} selected ${skipped === 1 ? 'track is' : 'tracks are'} already in your library`);
      }
      return;
    }

    setTracks(prev => {
      const seen = new Set(prev.map(t => t.id));
      const toAdd = uniqueTracks.filter(t => !seen.has(t.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });

    setPlaylists(prev => {
      const localIdx = prev.findIndex(p => p.isLocalFiles);
      const ids = uniqueTracks.map(t => t.id);
      if (localIdx !== -1) {
        const updated = [...prev];
        updated[localIdx] = {
          ...updated[localIdx],
          trackIds: Array.from(new Set([...updated[localIdx].trackIds, ...ids]))
        };
        return updated;
      }
      const localPl: Playlist = {
        id: 'local-files',
        title: 'Local Files',
        description: 'Audio files loaded from your device.',
        owner: 'This Device',
        type: 'playlist',
        category: 'Music',
        coverUrl: uniqueTracks.find(t => t.coverUrl)?.coverUrl || '',
        accentColor: uniqueTracks.find(t => t.accentColor !== '#282828')?.accentColor || '#065f46',
        isLocalFiles: true,
        trackIds: Array.from(new Set(ids))
      };
      return [prev[0], localPl, ...prev.slice(1)];
    });

    setSavedPlaylistIds(prev => (prev.includes('local-files') ? prev : [...prev, 'local-files']));

    if (!silent) {
      showToast(
        skipped > 0
          ? `Added ${uniqueTracks.length} ${uniqueTracks.length === 1 ? 'track' : 'tracks'} (${skipped} duplicate skipped)`
          : `Imported ${uniqueTracks.length} ${uniqueTracks.length === 1 ? 'track' : 'tracks'}`
      );
    }
  }, [showToast]);

  // Hydrate persisted state + watched folders / IndexedDB audio files on startup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadPersistedState();
      if (cancelled) return;

      let restoredTracks: Track[] = [];
      if (window.electronAPI && saved?.watchedFolders?.length) {
        setWatchedFolders(saved.watchedFolders);
        const items = await window.electronAPI.scanWatchedFolders(saved.watchedFolders);
        if (!cancelled && items.length > 0) {
          restoredTracks = await mapNativeItemsToTracks(items);
        }
      } else if (!window.electronAPI) {
        restoredTracks = await loadBrowserAudioTracks();
        const handles = await loadWebDirectoryHandles();
        if (handles.length > 0 && !cancelled) {
          setWatchedFolders(handles.map(h => h.key));
          for (const entry of handles) {
            try {
              const perm = await (
                entry.handle as unknown as {
                  queryPermission?: (opts: { mode: string }) => Promise<string>;
                }
              ).queryPermission?.({ mode: 'read' });
              if (perm === 'granted') {
                const dirFiles = await collectFilesFromWebDirectoryHandle(entry.handle);
                if (dirFiles.length > 0 && !cancelled) {
                  // Hydrate via importBrowserAudioFiles after state settles
                  window.setTimeout(() => importBrowserAudioFiles(dirFiles), 150);
                }
              }
            } catch {
              // ignore handle permission errors
            }
          }
        }
      }

      if (cancelled) return;

      if (restoredTracks.length > 0) {
        const metaMap = saved?.customTracksMeta || {};
        restoredTracks = restoredTracks.map(t => (metaMap[t.id] ? { ...t, ...metaMap[t.id] } : t));
        await addLocalTracksToLibrary(restoredTracks, true);
      }

      if (saved) {
        if (saved.playlists?.length) {
          setPlaylists(prev => {
            const localPl = prev.find(p => p.isLocalFiles);
            const merged = [...saved.playlists];
            if (localPl && !merged.some(p => p.isLocalFiles)) {
              merged.splice(1, 0, localPl);
            } else if (localPl) {
              const idx = merged.findIndex(p => p.isLocalFiles);
              merged[idx] = {
                ...merged[idx],
                trackIds: Array.from(new Set([...merged[idx].trackIds, ...localPl.trackIds]))
              };
            }
            return merged;
          });
        }
        if (saved.folders?.length) setFolders(saved.folders);
        setLikedTrackIds(saved.likedTrackIds || []);
        setFollowedArtistIds(saved.followedArtistIds || []);
        if (saved.savedAlbumIds) setSavedAlbumIds(saved.savedAlbumIds);
        setPlayCounts(saved.playCounts || {});
        if (saved.lastPlayedMap) setLastPlayedMap(saved.lastPlayedMap);
        setRecentlyPlayedIds(saved.recentlyPlayedIds || []);
        if (saved.searchHistory) setSearchHistory(saved.searchHistory);
        if (saved.listeningStats) setListeningStats(saved.listeningStats);
        if (saved.smartRules) setSmartRules(saved.smartRules);
        if (saved.customTracksMeta) setCustomTracksMeta(saved.customTracksMeta);
        if (saved.queueTrackIds?.length && restoredTracks.length > 0) {
          const restoredQueue = saved.queueTrackIds
            .map(id => restoredTracks.find(t => t.id === id))
            .filter((t): t is Track => Boolean(t));
          if (restoredQueue.length > 0) setQueue(restoredQueue);
        }
        setVolumeState(saved.volume ?? 0.8);
        setIsMuted(Boolean(saved.isMuted));
        setIsShuffle(Boolean(saved.isShuffle));
        setRepeatMode(saved.repeatMode || 'off');
        const mergedSettings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
        setSettings(mergedSettings);
        if (saved.profile) setProfile({ ...DEFAULT_PROFILE, ...saved.profile });

        if (saved.lastTrackId && mergedSettings.resumeOnStartup !== false) {
          const found = restoredTracks.find(t => t.id === saved.lastTrackId);
          if (found) {
            setCurrentTrack(found);
            setContextTracks(restoredTracks);
            setDuration(found.duration || 0);
            setCurrentTime(saved.lastPositionSec || 0);
            const audio = getActiveAudio();
            if (audio) {
              if (
                found.audioUrl.startsWith('http://') ||
                found.audioUrl.startsWith('https://') ||
                found.audioUrl.startsWith('local-audio://')
              ) {
                audio.crossOrigin = 'anonymous';
              } else {
                audio.removeAttribute('crossorigin');
              }
              audio.src = found.audioUrl;
              audio.volume = saved.isMuted ? 0 : saved.volume ?? 0.8;
              pendingSeekRef.current = saved.lastPositionSec || 0;
            }
          }
        }
      }
      hydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [addLocalTracksToLibrary, mapNativeItemsToTracks, getActiveAudio]);

  // Debounced persistence save
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = window.setTimeout(() => {
      void savePersistedState({
        version: 1,
        watchedFolders,
        playlists,
        folders,
        likedTrackIds,
        followedArtistIds,
        savedAlbumIds,
        playCounts,
        lastPlayedMap,
        recentlyPlayedIds,
        queueTrackIds: queue.map(q => q.id),
        searchHistory,
        listeningStats,
        smartRules,
        customTracksMeta,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        lastTrackId: currentTrack?.id || null,
        lastPositionSec: currentTime,
        settings,
        profile
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [
    watchedFolders,
    playlists,
    folders,
    likedTrackIds,
    followedArtistIds,
    savedAlbumIds,
    playCounts,
    lastPlayedMap,
    recentlyPlayedIds,
    queue,
    searchHistory,
    listeningStats,
    smartRules,
    customTracksMeta,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    currentTrack,
    currentTime,
    settings,
    profile
  ]);

  const navigate = useCallback((nextRoute: ViewRoute) => {
    setNavState(prev => {
      const cur = prev.history[prev.index];
      if (JSON.stringify(cur) === JSON.stringify(nextRoute)) return prev;
      const sliced = prev.history.slice(0, prev.index + 1);
      const updated = [...sliced, nextRoute];
      return { history: updated, index: updated.length - 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setNavState(prev => ({ ...prev, index: Math.max(0, prev.index - 1) }));
  }, []);

  const goForward = useCallback(() => {
    setNavState(prev => ({ ...prev, index: Math.min(prev.history.length - 1, prev.index + 1) }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
    if (q.trim().length > 0 && route.name !== 'search') {
      navigate({ name: 'search' });
    }
  }, [route.name, navigate]);

  const recordTrackPlay = useCallback((trackId: string) => {
    if (settingsRef.current.privateSession) return;
    const now = new Date();
    const nowMs = now.getTime();
    const dayKey = getLocalDayKey(now);
    const hour = now.getHours();
    setPlayCounts(prev => ({ ...prev, [trackId]: (prev[trackId] || 0) + 1 }));
    setLastPlayedMap(prev => ({ ...prev, [trackId]: nowMs }));
    setRecentlyPlayedIds(prev => [trackId, ...prev.filter(id => id !== trackId)].slice(0, 40));
    setListeningStats(prev => {
      const curDay = prev.dailyListening[dayKey] || { sec: 0, plays: 0 };
      const hourlyMap = prev.hourlyListening || {};
      const curHour = hourlyMap[hour] || { sec: 0, plays: 0 };
      const isNewSession =
        !prev.lastSessionAt ||
        nowMs - prev.lastSessionAt > 20 * 60 * 1000 ||
        !prev.sessionCount;
      return {
        ...prev,
        dailyListening: {
          ...prev.dailyListening,
          [dayKey]: { ...curDay, plays: curDay.plays + 1 }
        },
        hourlyListening: {
          ...hourlyMap,
          [hour]: { ...curHour, plays: curHour.plays + 1 }
        },
        sessionCount: (prev.sessionCount || 0) + (isNewSession ? 1 : 0),
        lastSessionAt: nowMs
      };
    });
  }, []);

  const playTrack = useCallback((
    track: Track,
    list?: Track[],
    playlistId?: string | null,
    isCrossfadeTransition = false
  ) => {
    if (!decksRef.current) return;
    ensureAudioGraph();

    const sessionId = ++playSessionRef.current;
    pendingSeekRef.current = null;
    crossfadeActiveRef.current = false;
    setAbLoop({ a: null, b: null });
    setCurrentTrack(track);
    if (list) setContextTracks(list);
    if (playlistId !== undefined) setActivePlaylistId(playlistId);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    recordTrackPlay(track.id);
    if (settingsRef.current.desktopNotifications) {
      window.electronAPI?.showNotification?.(track.title, `${track.artist} • ${track.album}`);
    }

    const prevIdx = activeDeckIdxRef.current;
    const nextIdx: 0 | 1 = isCrossfadeTransition ? (prevIdx === 0 ? 1 : 0) : prevIdx;
    const prevDeck = decksRef.current[prevIdx];
    const targetDeck = decksRef.current[nextIdx];
    const cfSec = isCrossfadeTransition ? settingsRef.current.crossfadeSec : 0;

    if (!isCrossfadeTransition) {
      decksRef.current[0].pause();
      decksRef.current[1].pause();
    }

    activeDeckIdxRef.current = nextIdx;
    if (
      track.audioUrl.startsWith('http://') ||
      track.audioUrl.startsWith('https://') ||
      track.audioUrl.startsWith('local-audio://')
    ) {
      targetDeck.crossOrigin = 'anonymous';
    } else {
      targetDeck.removeAttribute('crossorigin');
    }
    targetDeck.src = track.audioUrl;
    targetDeck.currentTime = 0;
    targetDeck.muted = isMutedRef.current;
    targetDeck.volume = isMutedRef.current ? 0 : volumeRef.current;
    targetDeck.playbackRate = settingsRef.current.playbackRate;
    targetDeck.load();

    // Smooth crossfade using Web Audio GainNodes if available
    if (cfSec > 0 && isCrossfadeTransition && deckGainNodesRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      const gOut = deckGainNodesRef.current[prevIdx].gain;
      const gIn = deckGainNodesRef.current[nextIdx].gain;
      gOut.cancelScheduledValues(now);
      gOut.setValueAtTime(gOut.value, now);
      gOut.linearRampToValueAtTime(0, now + cfSec);

      gIn.cancelScheduledValues(now);
      gIn.setValueAtTime(0.01, now);
      gIn.linearRampToValueAtTime(1, now + cfSec);

      window.setTimeout(() => {
        if (activeDeckIdxRef.current !== prevIdx) {
          prevDeck.pause();
          prevDeck.currentTime = 0;
          gOut.setValueAtTime(1, audioCtxRef.current?.currentTime || 0);
        }
      }, cfSec * 1000 + 80);
    } else if (deckGainNodesRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      deckGainNodesRef.current[0].gain.setValueAtTime(1, now);
      deckGainNodesRef.current[1].gain.setValueAtTime(1, now);
    }

    targetDeck.play().catch(err => {
      if (playSessionRef.current !== sessionId) return;
      if (err?.name !== 'AbortError') {
        setIsPlaying(false);
        showToast(`Could not play "${track.title}"`);
      }
    });
  }, [ensureAudioGraph, recordTrackPlay, showToast]);

  const advanceTrack = useCallback((isCrossfade: boolean, isManualSkip: boolean) => {
    const crossfade = isCrossfade === true;
    const cur = currentTrackRef.current;
    const activeAudio = getActiveAudio();

    if (
      isManualSkip &&
      !crossfade &&
      !settingsRef.current.privateSession &&
      cur &&
      activeAudio &&
      Number.isFinite(activeAudio.duration) &&
      activeAudio.duration > 10 &&
      activeAudio.currentTime < activeAudio.duration - 5
    ) {
      setListeningStats(prev => ({
        ...prev,
        totalSkips: (prev.totalSkips || 0) + 1,
        skipCounts: {
          ...(prev.skipCounts || {}),
          [cur.id]: ((prev.skipCounts || {})[cur.id] || 0) + 1
        }
      }));
    }

    const q = queueRef.current;
    if (q.length > 0) {
      const [nextFromQ, ...rest] = q;
      setQueue(rest);
      playTrack(nextFromQ, undefined, undefined, crossfade);
      return;
    }
    if (sleepTimerRef.current?.kind === 'end-of-queue') {
      setSleepTimer(null);
      setSleepRemainingSec(null);
      activeAudio?.pause();
      setIsPlaying(false);
      showToast('Queue ended: playback stopped');
      return;
    }
    const pool = contextTracksRef.current.length > 0 ? contextTracksRef.current : tracksRef.current;
    if (!cur || pool.length === 0) return;

    const idx = pool.findIndex(t => t.id === cur.id);
    if (isShuffleRef.current && pool.length > 1) {
      let randIdx = idx;
      while (randIdx === idx) {
        randIdx = Math.floor(Math.random() * pool.length);
      }
      playTrack(pool[randIdx], undefined, undefined, crossfade);
      return;
    }

    const nextIdx = idx + 1;
    if (nextIdx >= pool.length) {
      if (repeatModeRef.current === 'all') {
        playTrack(pool[0], undefined, undefined, crossfade);
      } else {
        activeAudio?.pause();
        setIsPlaying(false);
        setCurrentTime(0);
      }
      return;
    }
    playTrack(pool[nextIdx], undefined, undefined, crossfade);
  }, [playTrack, getActiveAudio]);

  const nextTrack = useCallback(() => {
    advanceTrack(false, true);
  }, [advanceTrack]);

  const nextTrackRef = useRef(advanceTrack);
  nextTrackRef.current = advanceTrack;

  const prevTrack = useCallback(() => {
    const audio = getActiveAudio();
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const pool = contextTracksRef.current.length > 0 ? contextTracksRef.current : tracksRef.current;
    const cur = currentTrackRef.current;
    if (!cur || pool.length === 0) return;
    const idx = pool.findIndex(t => t.id === cur.id);
    const prevIdx = (idx - 1 + pool.length) % pool.length;
    playTrack(pool[prevIdx]);
  }, [playTrack, getActiveAudio]);

  // Dual audio deck initialization
  useEffect(() => {
    const d0 = new Audio();
    const d1 = new Audio();
    d0.preload = 'metadata';
    d1.preload = 'metadata';
    decksRef.current = [d0, d1];

    const attach = (deck: HTMLAudioElement, idx: 0 | 1) => {
      const isActive = () => activeDeckIdxRef.current === idx;

      const onPlay = () => {
        if (isActive()) setIsPlaying(true);
      };
      const onPause = () => {
        if (isActive() && !crossfadeActiveRef.current) setIsPlaying(false);
      };
      const onLoadedMetadata = () => {
        if (!isActive()) return;
        if (Number.isFinite(deck.duration) && deck.duration > 0) {
          setDuration(deck.duration);
          const cur = currentTrackRef.current;
          if (cur && Math.abs((cur.duration || 0) - deck.duration) > 0.5) {
            setTracks(prev => prev.map(t => (t.id === cur.id ? { ...t, duration: deck.duration } : t)));
          }
        }
        if (pendingSeekRef.current !== null) {
          const target = Math.max(0, Math.min(pendingSeekRef.current, deck.duration || 0));
          deck.currentTime = target;
          setCurrentTime(target);
          pendingSeekRef.current = null;
        }
      };
      const onTimeUpdate = () => {
        if (!isActive() || isScrubbingRef.current) return;
        const t = deck.currentTime;
        setCurrentTime(t);

        // A-B Loop enforcement
        const loop = abLoopRef.current;
        if (loop.a !== null && loop.b !== null && loop.b > loop.a + 0.25 && t >= loop.b) {
          deck.currentTime = loop.a;
          setCurrentTime(loop.a);
          return;
        }

        // Crossfade trigger before track ends
        const cf = settingsRef.current.crossfadeSec;
        if (
          cf > 0 &&
          !crossfadeActiveRef.current &&
          repeatModeRef.current !== 'one' &&
          Number.isFinite(deck.duration) &&
          deck.duration > cf + 2 &&
          deck.duration - t <= cf
        ) {
          crossfadeActiveRef.current = true;
          nextTrackRef.current(true, false);
        }
      };
      const onEnded = () => {
        if (!isActive()) return;
        if (sleepTimerRef.current?.kind === 'end-of-track') {
          setSleepTimer(null);
          setSleepRemainingSec(null);
          setIsPlaying(false);
          showToast('Sleep timer paused playback');
          return;
        }
        if (sleepTimerRef.current?.kind === 'end-of-queue' && queueRef.current.length === 0) {
          setSleepTimer(null);
          setSleepRemainingSec(null);
          setIsPlaying(false);
          showToast('Queue ended: sleep timer stopped playback');
          return;
        }
        if (repeatModeRef.current === 'one') {
          deck.currentTime = 0;
          deck.play().catch(() => setIsPlaying(false));
        } else {
          nextTrackRef.current(false, false);
        }
      };
      const onError = () => {
        if (isActive() && deck.src) {
          setIsPlaying(false);
          const title = currentTrackRef.current?.title;
          if (title) showToast(`Unable to play "${title}" (file unavailable or unsupported)`);
        }
      };

      deck.addEventListener('play', onPlay);
      deck.addEventListener('pause', onPause);
      deck.addEventListener('loadedmetadata', onLoadedMetadata);
      deck.addEventListener('timeupdate', onTimeUpdate);
      deck.addEventListener('ended', onEnded);
      deck.addEventListener('error', onError);

      return () => {
        deck.pause();
        deck.src = '';
        deck.removeEventListener('play', onPlay);
        deck.removeEventListener('pause', onPause);
        deck.removeEventListener('loadedmetadata', onLoadedMetadata);
        deck.removeEventListener('timeupdate', onTimeUpdate);
        deck.removeEventListener('ended', onEnded);
        deck.removeEventListener('error', onError);
      };
    };

    const cleanup0 = attach(d0, 0);
    const cleanup1 = attach(d1, 1);

    return () => {
      cleanup0();
      cleanup1();
      void audioCtxRef.current?.close().catch(() => {});
    };
  }, [showToast]);

  // Sleep Timer countdown interval
  useEffect(() => {
    if (!sleepTimer || sleepTimer.kind !== 'until') {
      setSleepRemainingSec(null);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((sleepTimer.endAt - Date.now()) / 1000));
      setSleepRemainingSec(rem);
      if (rem <= 0) {
        getActiveAudio()?.pause();
        setIsPlaying(false);
        setSleepTimer(null);
        setSleepRemainingSec(null);
        showToast('Sleep timer stopped playback');
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sleepTimer, getActiveAudio, showToast]);

  const togglePlay = useCallback(() => {
    const audio = getActiveAudio();
    const cur = currentTrackRef.current;
    if (!audio || !cur) {
      if (tracksRef.current.length > 0) {
        playTrack(tracksRef.current[0], tracksRef.current);
      }
      return;
    }
    ensureAudioGraph();
    if (!audio.paused) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [getActiveAudio, playTrack, ensureAudioGraph]);

  const seek = useCallback((seconds: number) => {
    const audio = getActiveAudio();
    const maxDur = duration || audio?.duration || 0;
    const clamped = Math.max(0, Math.min(seconds, maxDur));
    setCurrentTime(clamped);
    if (!audio) return;
    if (audio.readyState >= 1) {
      audio.currentTime = clamped;
    } else {
      pendingSeekRef.current = clamped;
    }
  }, [duration, getActiveAudio]);

  const beginScrub = useCallback(() => {
    isScrubbingRef.current = true;
  }, []);

  const commitScrub = useCallback((seconds: number) => {
    isScrubbingRef.current = false;
    seek(seconds);
  }, [seek]);

  const setVolume = useCallback((val: number) => {
    const v = Math.max(0, Math.min(1, val));
    setVolumeState(v);
    if (v > 0) setIsMuted(false);
    if (decksRef.current) {
      decksRef.current[0].volume = v;
      decksRef.current[1].volume = v;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (decksRef.current) {
        decksRef.current[0].volume = next ? 0 : volumeRef.current;
        decksRef.current[1].volume = next ? 0 : volumeRef.current;
      }
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      showToast(!prev ? 'Shuffle enabled' : 'Shuffle disabled');
      return !prev;
    });
  }, [showToast]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      showToast(next === 'off' ? 'Repeat off' : next === 'all' ? 'Repeat all' : 'Repeat one');
      return next;
    });
  }, [showToast]);

  // Audio Tools Controls
  const setEqPreset = useCallback((preset: string) => {
    const customMap = settingsRef.current.customEqPresets || {};
    const gains = customMap[preset] || EQ_PRESETS[preset] || EQ_PRESETS.Flat;
    setSettings(prev => ({ ...prev, eqPreset: preset, eqGains: [...gains] }));
  }, []);

  const setEqBandGain = useCallback((index: number, db: number) => {
    setSettings(prev => {
      const next = [...prev.eqGains];
      next[index] = Math.max(-12, Math.min(12, db));
      return { ...prev, eqPreset: 'Custom', eqGains: next };
    });
  }, []);

  const saveCustomEqPreset = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setSettings(prev => ({
        ...prev,
        eqPreset: trimmed,
        customEqPresets: {
          ...(prev.customEqPresets || {}),
          [trimmed]: [...prev.eqGains]
        }
      }));
      showToast(`Saved EQ preset "${trimmed}"`);
    },
    [showToast]
  );

  const deleteCustomEqPreset = useCallback(
    (name: string) => {
      setSettings(prev => {
        const nextCustom = { ...(prev.customEqPresets || {}) };
        delete nextCustom[name];
        return {
          ...prev,
          eqPreset: prev.eqPreset === name ? 'Custom' : prev.eqPreset,
          customEqPresets: nextCustom
        };
      });
      showToast(`Deleted EQ preset "${name}"`);
    },
    [showToast]
  );

  const setCrossfadeSec = useCallback((sec: number) => {
    setSettings(prev => ({ ...prev, crossfadeSec: Math.max(0, Math.min(12, sec)) }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setSettings(prev => ({ ...prev, playbackRate: Math.max(0.5, Math.min(2, rate)) }));
  }, []);

  const updateAudioSettings = useCallback((patch: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const importLibraryBackup = useCallback(
    (jsonText: string) => {
      try {
        const parsed = JSON.parse(jsonText) as Partial<PersistedAppState>;
        if (parsed.profile) setProfile({ ...DEFAULT_PROFILE, ...parsed.profile });
        if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        if (Array.isArray(parsed.likedTrackIds)) setLikedTrackIds(parsed.likedTrackIds);
        if (Array.isArray(parsed.followedArtistIds)) setFollowedArtistIds(parsed.followedArtistIds);
        if (parsed.playCounts) setPlayCounts(parsed.playCounts);
        if (parsed.lastPlayedMap) setLastPlayedMap(parsed.lastPlayedMap);
        if (Array.isArray(parsed.recentlyPlayedIds)) setRecentlyPlayedIds(parsed.recentlyPlayedIds);
        if (Array.isArray(parsed.savedAlbumIds)) setSavedAlbumIds(parsed.savedAlbumIds);
        if (Array.isArray(parsed.folders)) setFolders(parsed.folders);
        if (Array.isArray(parsed.smartRules)) setSmartRules(parsed.smartRules);
        if (Array.isArray(parsed.searchHistory)) setSearchHistory(parsed.searchHistory);
        if (parsed.listeningStats) setListeningStats(parsed.listeningStats);
        if (Array.isArray(parsed.playlists)) {
          setPlaylists(prev => {
            const existingMap = new Map(prev.map(p => [p.id, p]));
            for (const incoming of parsed.playlists || []) {
              if (incoming.isUserCreated || incoming.pinned !== undefined) {
                existingMap.set(incoming.id, incoming);
              }
            }
            return Array.from(existingMap.values());
          });
        }
        showToast('Backup restored successfully');
      } catch {
        showToast('Invalid backup JSON file');
      }
    },
    [showToast]
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }));
    showToast('Profile updated');
  }, [showToast]);

  const removeWatchedFolder = useCallback((folder: string) => {
    setWatchedFolders(prev => prev.filter(f => f !== folder));
    void deleteWebDirectoryHandle(folder);
    showToast('Removed watched folder');
  }, [showToast]);

  const clearListeningHistory = useCallback(() => {
    setPlayCounts({});
    setLastPlayedMap({});
    setRecentlyPlayedIds([]);
    setListeningStats({
      totalListeningSec: 0,
      dailyListening: {},
      hourlyListening: {},
      skipCounts: {},
      totalSkips: 0,
      sessionCount: 0,
      totalSessionSec: 0,
      lastSessionAt: 0
    });
    showToast('Listening history cleared');
  }, [showToast]);

  const addSearchHistory = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearchHistory(prev => [trimmed, ...prev.filter(x => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    showToast('Search history cleared');
  }, [showToast]);

  const toggleSaveAlbum = useCallback((albumId: string) => {
    setSavedAlbumIds(prev => {
      const has = prev.includes(albumId);
      showToast(has ? 'Removed from Favourite Albums' : 'Added to Favourite Albums');
      return has ? prev.filter(id => id !== albumId) : [...prev, albumId];
    });
  }, [showToast]);

  const addCustomSmartRule = useCallback(
    (rule: Omit<SmartRuleConfig, 'id'>) => {
      const created: SmartRuleConfig = { ...rule, id: `smart-${Date.now()}` };
      setSmartRules(prev => [...prev, created]);
      showToast(`Created smart playlist "${created.title}"`);
      return created;
    },
    [showToast]
  );

  const deleteCustomSmartRule = useCallback(
    (id: string) => {
      setSmartRules(prev => prev.filter(r => r.id !== id));
      showToast('Deleted smart playlist');
    },
    [showToast]
  );

  const updateTrackMetadata = useCallback(
    (
      trackIds: string[],
      patch: Partial<Pick<Track, 'title' | 'artist' | 'album' | 'genre' | 'year' | 'trackNumber' | 'coverUrl' | 'explicit'>>
    ) => {
      const idSet = new Set(trackIds);
      setTracks(prev =>
        prev.map(t => {
          if (!idSet.has(t.id)) return t;
          const nextArtist = patch.artist !== undefined ? patch.artist : t.artist;
          return {
            ...t,
            ...patch,
            artistId: makeArtistId(nextArtist || 'Unknown Artist')
          };
        })
      );
      setCustomTracksMeta(prev => {
        const next = { ...(prev || {}) };
        for (const id of trackIds) {
          next[id] = { ...(next[id] || {}), ...patch };
        }
        return next;
      });
      if (currentTrackRef.current && idSet.has(currentTrackRef.current.id)) {
        setCurrentTrack(prev => (prev ? { ...prev, ...patch } : prev));
      }
      // On Electron desktop, write ID3 tags directly to on-disk audio files (including cover art)
      if (window.electronAPI?.writeId3Tags) {
        const affectedTracks = tracks.filter(t => idSet.has(t.id));
        for (const t of affectedTracks) {
          if (t.sourceKey && t.sourceKey.toLowerCase().endsWith('.mp3')) {
            window.electronAPI.writeId3Tags(t.sourceKey, {
              ...patch,
              coverDataUrl: patch.coverUrl
            }).catch(() => {});
          }
        }
      }
      showToast(`Updated metadata for ${trackIds.length} ${trackIds.length === 1 ? 'track' : 'tracks'}`);
    },
    [showToast, tracks]
  );

  const toggleTrackExplicit = useCallback(
    (trackId: string) => {
      const track = tracksRef.current.find(t => t.id === trackId);
      if (!track) return;
      const nextExplicit = !track.explicit;
      updateTrackMetadata([trackId], { explicit: nextExplicit });
      showToast(
        nextExplicit
          ? `Marked "${track.title}" as Explicit`
          : `Removed Explicit tag from "${track.title}"`
      );
    },
    [updateTrackMetadata, showToast]
  );

  const renameTrackFile = useCallback(
    async (trackId: string, newTitle: string): Promise<boolean> => {
      const target = tracks.find(t => t.id === trackId);
      if (!target) return false;
      const cleanTitle = newTitle.trim() || target.title;

      // Update in-memory metadata first
      updateTrackMetadata([trackId], { title: cleanTitle });

      // If in Electron and on local disk, physically rename the file
      if (window.electronAPI?.renameFile && target.sourceKey && !target.sourceKey.startsWith('idb:')) {
        try {
          const res = await window.electronAPI.renameFile(target.sourceKey, cleanTitle);
          if (res.success && res.newPath) {
            setTracks(prev =>
              prev.map(t => (t.id === trackId ? { ...t, sourceKey: res.newPath } : t))
            );
            showToast(`Renamed file on disk to ${res.newFileName || cleanTitle}`);
            return true;
          } else if (res.error) {
            showToast(`Metadata updated, disk rename failed: ${res.error}`);
            return false;
          }
        } catch (err) {
          console.error('Failed to rename file on disk:', err);
        }
      }

      showToast(`Track renamed to "${cleanTitle}"`);
      return true;
    },
    [tracks, updateTrackMetadata, showToast]
  );

  const updateTrackLyrics = useCallback(
    (trackId: string, lyrics: LyricLine[], offsetSec?: number) => {
      setTracks(prev =>
        prev.map(t =>
          t.id === trackId
            ? { ...t, lyrics, ...(offsetSec !== undefined ? { lyricsOffsetSec: offsetSec } : {}) }
            : t
        )
      );
      setCustomTracksMeta(prev => ({
        ...(prev || {}),
        [trackId]: {
          ...(prev?.[trackId] || {}),
          lyrics,
          ...(offsetSec !== undefined ? { lyricsOffsetSec: offsetSec } : {})
        }
      }));
      if (currentTrackRef.current?.id === trackId) {
        setCurrentTrack(prev =>
          prev
            ? { ...prev, lyrics, ...(offsetSec !== undefined ? { lyricsOffsetSec: offsetSec } : {}) }
            : prev
        );
      }
    },
    []
  );

  const checkMissingFiles = useCallback(async () => {
    if (window.electronAPI?.checkMissingFiles) {
      const paths = tracksRef.current
        .map(t => t.sourceKey)
        .filter((p): p is string => Boolean(p && !p.includes('::')));
      const result = await window.electronAPI.checkMissingFiles(paths);
      let missingPaths = new Set<string>();
      let disconnectedPaths = new Set<string>();

      if (result && typeof result === 'object' && !Array.isArray(result)) {
        missingPaths = new Set(result.missingPaths || []);
        disconnectedPaths = new Set(result.disconnectedDrivePaths || []);
      } else if (Array.isArray(result)) {
        missingPaths = new Set(result);
      }

      const missingIds = tracksRef.current
        .filter(t => t.sourceKey && missingPaths.has(t.sourceKey))
        .map(t => t.id);
      const disconnectedIds = tracksRef.current
        .filter(t => t.sourceKey && disconnectedPaths.has(t.sourceKey))
        .map(t => t.id);

      setMissingTrackIds(missingIds);
      setDisconnectedDriveTrackIds(disconnectedIds);

      if (disconnectedIds.length > 0 && missingIds.length > 0) {
        showToast(`${missingIds.length} missing files, ${disconnectedIds.length} on disconnected USB drive`);
      } else if (disconnectedIds.length > 0) {
        showToast(`${disconnectedIds.length} tracks on disconnected external drive (preserved)`);
      } else if (missingIds.length > 0) {
        showToast(`Found ${missingIds.length} missing ${missingIds.length === 1 ? 'file' : 'files'}`);
      } else {
        showToast('All local library files verified intact');
      }
      return missingIds.length;
    }

    const stored = await loadBrowserAudioTracks().catch(() => []);
    const storedIds = new Set(stored.map(t => t.id));
    const missingIds = tracksRef.current
      .filter(t => !t.audioUrl || (!storedIds.has(t.id) && !t.audioUrl.startsWith('blob:')))
      .map(t => t.id);
    setMissingTrackIds(missingIds);
    showToast(
      missingIds.length === 0
        ? `All ${tracksRef.current.length} local tracks verified intact`
        : `Found ${missingIds.length} broken track reference(s)`
    );
    return missingIds.length;
  }, [showToast]);

  const removeMissingTracks = useCallback(() => {
    if (missingTrackIds.length === 0) return;
    const missSet = new Set(missingTrackIds);
    setTracks(prev => prev.filter(t => !missSet.has(t.id)));
    setPlaylists(prev =>
      prev.map(p => ({ ...p, trackIds: p.trackIds.filter(id => !missSet.has(id)) }))
    );
    setMissingTrackIds([]);
    showToast(`Removed ${missSet.size} missing track references`);
  }, [missingTrackIds, showToast]);

  const exportLibraryBackup = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      watchedFolders,
      playlists,
      folders,
      smartRules,
      likedTrackIds,
      followedArtistIds,
      savedAlbumIds,
      playCounts,
      lastPlayedMap,
      listeningStats,
      searchHistory,
      recentlyPlayedIds
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vybe-offline-backup-${getLocalDayKey()}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Library backup exported');
  }, [
    profile,
    settings,
    watchedFolders,
    playlists,
    folders,
    smartRules,
    likedTrackIds,
    followedArtistIds,
    savedAlbumIds,
    playCounts,
    lastPlayedMap,
    listeningStats,
    searchHistory,
    recentlyPlayedIds,
    showToast
  ]);

  const setCompactMode = useCallback((v: boolean) => {
    setSettings(prev => ({ ...prev, compactMode: v }));
  }, []);

  const setAmoledMode = useCallback((v: boolean) => {
    setSettings(prev => ({ ...prev, amoledMode: v }));
  }, []);

  const setHazyMode = useCallback((v: boolean) => {
    setSettings(prev => ({ ...prev, hazyMode: v }));
  }, []);

  const setHazyBlur = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setSettings(prev => ({ ...prev, hazyBlur: clamped }));
  }, []);

  const setLoopA = useCallback(() => {
    if (!currentTrackRef.current) return;
    const t = getActiveAudio()?.currentTime ?? currentTime;
    setAbLoop(prev => ({ a: t, b: prev.b !== null && prev.b > t ? prev.b : null }));
    showToast(`Loop start A set at ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
  }, [currentTime, getActiveAudio, showToast]);

  const setLoopB = useCallback(() => {
    if (!currentTrackRef.current) return;
    const t = getActiveAudio()?.currentTime ?? currentTime;
    setAbLoop(prev => {
      const start = prev.a ?? 0;
      if (t <= start + 0.3) {
        showToast('Point B must be after Point A');
        return prev;
      }
      showToast(`Looping A–B active`);
      return { a: start, b: t };
    });
  }, [currentTime, getActiveAudio, showToast]);

  const clearAbLoop = useCallback(() => {
    setAbLoop({ a: null, b: null });
    showToast('A–B loop cleared');
  }, [showToast]);

  const startSleepTimer = useCallback((minutes: number | 'end-of-track' | 'end-of-queue' | null) => {
    if (minutes === null) {
      setSleepTimer(null);
      setSleepRemainingSec(null);
      showToast('Sleep timer turned off');
    } else if (minutes === 'end-of-track') {
      setSleepTimer({ kind: 'end-of-track' });
      setSleepRemainingSec(null);
      showToast('Playback will pause after this track');
    } else if (minutes === 'end-of-queue') {
      setSleepTimer({ kind: 'end-of-queue' });
      setSleepRemainingSec(null);
      showToast('Playback will stop when queue finishes');
    } else {
      setSleepTimer({ kind: 'until', endAt: Date.now() + minutes * 60 * 1000 });
      showToast(`Sleep timer set for ${minutes} min`);
    }
  }, [showToast]);

  // Enumerate hardware audio output devices (Web & Desktop)
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const refreshDevices = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const outputs = list
          .filter(d => d.kind === 'audiooutput' && d.deviceId)
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label:
              d.label ||
              (d.deviceId === 'default'
                ? 'System Default Output'
                : `Audio Output ${idx + 1}`)
          }));
        if (outputs.length > 0) {
          setAudioOutputDevices(outputs);
        }
      } catch {
        // ignore restricted mediaDevices
      }
    };
    void refreshDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices);
    };
  }, []);

  const selectAudioOutputDevice = useCallback(
    async (deviceId: string, label?: string) => {
      setActiveDeviceId(deviceId);
      const sinkId = deviceId === 'dev-local' ? 'default' : deviceId;
      if (decksRef.current) {
        for (const deck of decksRef.current) {
          const withSink = deck as HTMLAudioElement & {
            setSinkId?: (id: string) => Promise<void>;
          };
          if (withSink.setSinkId) {
            await withSink.setSinkId(sinkId).catch(() => {});
          }
        }
      }
      const ctx = audioCtxRef.current as (AudioContext & {
        setSinkId?: (id: string) => Promise<void>;
      }) | null;
      if (ctx?.setSinkId) {
        await ctx.setSinkId(sinkId).catch(() => {});
      }
      showToast(`Output: ${label || 'Selected audio device'}`);
    },
    [showToast]
  );

  // OS MediaSession + Desktop Taskbar/Tray + Android Foreground Media Service
  useEffect(() => {
    const cur = currentTrack;
    if ('mediaSession' in navigator) {
      if (cur) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: cur.title,
          artist: cur.artist,
          album: cur.album,
          artwork: cur.coverUrl ? [{ src: cur.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
        });
      } else {
        navigator.mediaSession.metadata = null;
      }
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : cur ? 'paused' : 'none';
      if (cur && Number.isFinite(duration) && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate: settings.playbackRate,
            position: Math.min(duration, Math.max(0, currentTime))
          });
        } catch {
          // ignore unsupported setPositionState
        }
      }
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (!decksRef.current?.[activeDeckIdxRef.current]?.paused) return;
          togglePlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (decksRef.current?.[activeDeckIdxRef.current]?.paused) return;
          togglePlay();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
        navigator.mediaSession.setActionHandler('seekto', details => {
          if (typeof details.seekTime === 'number') seek(details.seekTime);
        });
        navigator.mediaSession.setActionHandler('seekbackward', details => {
          const offset = details.seekOffset || 10;
          const deck = decksRef.current?.[activeDeckIdxRef.current];
          if (deck) seek(Math.max(0, deck.currentTime - offset));
        });
        navigator.mediaSession.setActionHandler('seekforward', details => {
          const offset = details.seekOffset || 10;
          const deck = decksRef.current?.[activeDeckIdxRef.current];
          if (deck) seek(Math.min(duration || 0, deck.currentTime + offset));
        });
      } catch {
        // ignore unsupported mediaSession actions
      }
    }
  }, [currentTrack, isPlaying, duration, currentTime, settings.playbackRate, togglePlay, prevTrack, nextTrack, seek]);

  // Sync Android native Foreground Media Service when track or play/pause changes
  useEffect(() => {
    if (!LocalMedia) return;
    if (!currentTrack) {
      void LocalMedia.stopService().catch(() => {});
      return;
    }
    void LocalMedia.updateState({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      isPlaying,
      durationMs: Math.round((duration || currentTrack.duration || 0) * 1000),
      positionMs: Math.round((getActiveAudio()?.currentTime || 0) * 1000),
      coverDataUrl: currentTrack.coverUrl?.startsWith('data:image') ? currentTrack.coverUrl : ''
    }).catch(() => {});
  }, [currentTrack, isPlaying, duration, getActiveAudio]);

  // Listen to native media control events from Desktop Tray/Thumbar and Android Notification/Lockscreen
  useEffect(() => {
    const dispatchControl = (action: string) => {
      if (action === 'toggle') {
        togglePlay();
      } else if (action === 'play') {
        if (decksRef.current?.[activeDeckIdxRef.current]?.paused) togglePlay();
      } else if (action === 'pause') {
        if (decksRef.current && !decksRef.current[activeDeckIdxRef.current]?.paused) togglePlay();
      } else if (action === 'next') {
        nextTrack();
      } else if (action === 'prev') {
        prevTrack();
      }
    };

    const unsubElectron = window.electronAPI?.onMediaControl?.(dispatchControl);
    const unsubOpenFiles = window.electronAPI?.onOpenFiles?.(async (items) => {
      if (!items || items.length === 0) return;
      const mapped = await mapNativeItemsToTracks(items);
      await addLocalTracksToLibrary(mapped);
      if (mapped[0]) {
        playTrack(mapped[0], mapped, null);
      }
    });
    let capHandle: { remove: () => Promise<void> } | null = null;
    if (LocalMedia) {
      void LocalMedia.addListener('mediaControl', ({ action }) => {
        dispatchControl(action);
      }).then(h => {
        capHandle = h;
      });
    }
    return () => {
      unsubElectron?.();
      unsubOpenFiles?.();
      void capHandle?.remove();
    };
  }, [togglePlay, nextTrack, prevTrack, mapNativeItemsToTracks, addLocalTracksToLibrary, playTrack]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate({ name: 'search' });
        window.setTimeout(() => searchInputRef.current?.focus(), 40);
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') {
        e.preventDefault();
        navigate({ name: 'search' });
        window.setTimeout(() => searchInputRef.current?.focus(), 40);
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === '?' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(p => !p);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        nextTrack();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        prevTrack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, toggleMute, nextTrack, prevTrack, navigate]);

  const playPlaylist = useCallback((playlistId: string, startIndex = 0) => {
    const pl = playlistsRef.current.find(p => p.id === playlistId);
    if (!pl) return;
    const plTracks = pl.trackIds
      .map(id => tracksRef.current.find(t => t.id === id))
      .filter((t): t is Track => Boolean(t));
    if (plTracks.length === 0) {
      showToast(`"${pl.title}" has no tracks yet`);
      return;
    }
    const target = plTracks[Math.min(startIndex, plTracks.length - 1)];
    if (currentTrackRef.current?.id === target.id && activePlaylistId === playlistId && startIndex === 0) {
      togglePlay();
    } else {
      playTrack(target, plTracks, playlistId);
    }
  }, [activePlaylistId, togglePlay, playTrack, showToast]);

  // Import browser/Android File objects with full ID3/cover/LRC parsing + IndexedDB save
  const importBrowserAudioFiles = useCallback((files: FileList | File[]) => {
    const allFiles = Array.from(files);
    const lyricsMap = new Map<string, File>();
    for (const f of allFiles) {
      if (/\.lrc$/i.test(f.name)) {
        const stem = f.name.replace(/\.lrc$/i, '').toLowerCase();
        lyricsMap.set(stem, f);
      } else if (/\.txt$/i.test(f.name)) {
        const stem = f.name.replace(/\.txt$/i, '').toLowerCase();
        if (!lyricsMap.has(stem)) lyricsMap.set(stem, f);
      }
    }

    const audioFiles = allFiles.filter(f => AUDIO_EXT_RE.test(f.name) || f.type.startsWith('audio/'));
    if (audioFiles.length === 0) {
      showToast('No supported audio files found (.mp3, .wav, .flac, .m4a, .ogg)');
      return;
    }

    setIsImporting(true);
    void (async () => {
      try {
        const parsedTracks: Track[] = [];
        const CONCURRENCY = 4;
        for (let i = 0; i < audioFiles.length; i += CONCURRENCY) {
          const batch = audioFiles.slice(i, i + CONCURRENCY);
          const built = await Promise.all(
            batch.map(async f => {
              const sourceKey = `${f.name}::${f.size}::${f.lastModified}`;
              const id = `file-${hashString(sourceKey)}`;
              const stem = f.name.replace(AUDIO_EXT_RE, '').toLowerCase();
              const lrcFile = lyricsMap.get(stem);
              const lrcText = lrcFile ? await lrcFile.text().catch(() => undefined) : undefined;
              const meta = await parseBrowserAudioFile(f, lrcText);

              const track: Track = {
                id,
                sourceKey,
                title: meta.title,
                artist: meta.artist,
                artistId: makeArtistId(meta.artist),
                album: meta.album,
                trackNumber: meta.trackNumber,
                year: meta.year,
                genre: meta.genre,
                bitrate: meta.bitrate,
                sampleRate: meta.sampleRate,
                bitDepth: meta.bitDepth,
                codec: meta.codec,
                fileSize: f.size,
                duration: meta.duration,
                plays: 'Local',
                dateAdded: 'Just now',
                addedAt: Date.now(),
                coverUrl: meta.coverUrl,
                audioUrl: URL.createObjectURL(f),
                accentColor: meta.accentColor,
                category: 'Music',
                lyrics: meta.lyrics
              };
              await saveBrowserAudioTrack(track, f);
              return track;
            })
          );
          parsedTracks.push(...built);
        }
        await addLocalTracksToLibrary(parsedTracks);
      } finally {
        setIsImporting(false);
      }
    })();
  }, [addLocalTracksToLibrary, showToast]);

  const pickNativeAudioFiles = useCallback(async () => {
    if (window.electronAPI?.pickAudioFiles) {
      setIsImporting(true);
      try {
        const items = await window.electronAPI.pickAudioFiles();
        if (items.length > 0) {
          const mapped = await mapNativeItemsToTracks(items);
          await addLocalTracksToLibrary(mapped);
        }
      } finally {
        setIsImporting(false);
      }
      return;
    }
    fileInputRef.current?.click();
  }, [mapNativeItemsToTracks, addLocalTracksToLibrary]);

  const pickNativeAudioFolder = useCallback(async () => {
    if (window.electronAPI?.pickAudioFolder) {
      setIsImporting(true);
      try {
        const res = await window.electronAPI.pickAudioFolder();
        if (res) {
          setWatchedFolders(prev => (prev.includes(res.folderPath) ? prev : [...prev, res.folderPath]));
          if (res.items.length > 0) {
            const mapped = await mapNativeItemsToTracks(res.items);
            await addLocalTracksToLibrary(mapped);
          } else {
            showToast('Folder watched (no audio files found yet)');
          }
        }
      } finally {
        setIsImporting(false);
      }
      return;
    }

    const winWithPicker = window as unknown as {
      showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    };
    if (!Capacitor.isNativePlatform() && typeof winWithPicker.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await winWithPicker.showDirectoryPicker({ mode: 'read' });
        await saveWebDirectoryHandle(dirHandle.name, dirHandle);
        setWatchedFolders(prev => (prev.includes(dirHandle.name) ? prev : [...prev, dirHandle.name]));
        const files = await collectFilesFromWebDirectoryHandle(dirHandle);
        if (files.length > 0) {
          importBrowserAudioFiles(files);
        } else {
          showToast('Folder saved (no audio files found)');
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          folderInputRef.current?.click();
        }
      }
      return;
    }

    folderInputRef.current?.click();
  }, [mapNativeItemsToTracks, addLocalTracksToLibrary, importBrowserAudioFiles, showToast]);

  const rescanWatchedFolders = useCallback(async () => {
    if (window.electronAPI?.scanWatchedFolders) {
      if (watchedFolders.length === 0) return;
      setIsImporting(true);
      try {
        const items = await window.electronAPI.scanWatchedFolders(watchedFolders);
        if (items.length > 0) {
          const mapped = await mapNativeItemsToTracks(items);
          await addLocalTracksToLibrary(mapped);
        }
      } finally {
        setIsImporting(false);
      }
      return;
    }

    const handles = await loadWebDirectoryHandles();
    if (handles.length === 0) return;
    setIsImporting(true);
    try {
      const collected: File[] = [];
      for (const entry of handles) {
        const handleAny = entry.handle as unknown as {
          queryPermission?: (opts: { mode: string }) => Promise<string>;
          requestPermission?: (opts: { mode: string }) => Promise<string>;
        };
        let perm = await handleAny.queryPermission?.({ mode: 'read' });
        if (perm !== 'granted') {
          perm = await handleAny.requestPermission?.({ mode: 'read' });
        }
        if (perm === 'granted') {
          await collectFilesFromWebDirectoryHandle(entry.handle, collected);
        }
      }
      if (collected.length > 0) {
        importBrowserAudioFiles(collected);
      } else {
        showToast('Watched folders checked — no new audio files found');
      }
    } finally {
      setIsImporting(false);
    }
  }, [watchedFolders, mapNativeItemsToTracks, addLocalTracksToLibrary, importBrowserAudioFiles, showToast]);

  const handleDroppedFiles = useCallback(async (dt: DataTransfer) => {
    const files = Array.from(dt.files || []);
    if (files.length === 0) return;
    if (window.electronAPI?.scanDroppedPaths && window.electronAPI.getPathForFile) {
      const paths = files.map(f => window.electronAPI!.getPathForFile!(f)).filter(Boolean);
      if (paths.length > 0) {
        setIsImporting(true);
        try {
          const res = await window.electronAPI.scanDroppedPaths(paths);
          if (res.folders.length > 0) {
            setWatchedFolders(prev => Array.from(new Set([...prev, ...res.folders])));
          }
          if (res.items.length > 0) {
            const mapped = await mapNativeItemsToTracks(res.items);
            await addLocalTracksToLibrary(mapped);
          }
        } finally {
          setIsImporting(false);
        }
        return;
      }
    }
    importBrowserAudioFiles(files);
  }, [mapNativeItemsToTracks, addLocalTracksToLibrary, importBrowserAudioFiles]);

  const playNextInQueue = useCallback((track: Track) => {
    setQueue(prev => [track, ...prev]);
    showToast(`Playing "${track.title}" next`);
  }, [showToast]);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
    showToast(`Added "${track.title}" to queue`);
  }, [showToast]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reorderQueue = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      if (!moved) return prev;
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    showToast('Queue cleared');
  }, [showToast]);

  const moveQueueItem = useCallback((fromIdx: number, toIdx: number) => {
    setQueue(prev => {
      if (fromIdx < 0 || fromIdx >= prev.length || toIdx < 0 || toIdx >= prev.length || fromIdx === toIdx) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  const shuffleQueue = useCallback(() => {
    setQueue(prev => {
      if (prev.length <= 1) return prev;
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    showToast('Queue shuffled');
  }, [showToast]);

  const reverseQueue = useCallback(() => {
    setQueue(prev => {
      if (prev.length <= 1) return prev;
      return [...prev].reverse();
    });
    showToast('Queue reversed');
  }, [showToast]);

  const saveQueueAsPlaylist = useCallback((titleName?: string) => {
    const allTracks = currentTrackRef.current ? [currentTrackRef.current, ...queueRef.current] : [...queueRef.current];
    const name = titleName?.trim() || `Queue - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const newPl: Playlist = {
      id: `pl-queue-${Date.now()}`,
      title: name,
      description: `Saved from playback queue (${allTracks.length} song${allTracks.length === 1 ? '' : 's'})`,
      owner: profile.displayName || 'You',
      type: 'playlist',
      category: 'Music',
      coverUrl: allTracks[0]?.coverUrl || '',
      accentColor: allTracks[0]?.accentColor || '#1db954',
      isUserCreated: true,
      trackIds: allTracks.map(t => t.id)
    };
    setPlaylists(prev => [newPl, ...prev]);
    setSavedPlaylistIds(prev => [newPl.id, ...prev]);
    showToast(`Queue saved as playlist "${name}"`);
    return newPl;
  }, [profile.displayName, showToast]);

  const queueRemainingSec = useMemo(() => {
    const curRem = currentTrack && duration > 0 ? Math.max(0, duration - currentTime) : 0;
    const qRem = queue.reduce((acc, t) => acc + (t.duration || 0), 0);
    return Math.round(curRem + qRem);
  }, [currentTrack, duration, currentTime, queue]);

  const queueEstimatedEndTime = useMemo(() => {
    if (queueRemainingSec <= 0) return null;
    return new Date(Date.now() + queueRemainingSec * 1000);
  }, [queueRemainingSec]);

  const toggleLikeTrack = useCallback((trackId: string) => {
    setLikedTrackIds(prev => {
      const exists = prev.includes(trackId);
      showToast(exists ? 'Removed from Liked Songs' : 'Added to Liked Songs');
      return exists ? prev.filter(id => id !== trackId) : Array.from(new Set([trackId, ...prev]));
    });
  }, [showToast]);

  const toggleFollowArtist = useCallback((artistId: string) => {
    setFollowedArtistIds(prev => {
      const exists = prev.includes(artistId);
      showToast(exists ? 'Removed from Your Library' : 'Saved to Your Library');
      return exists ? prev.filter(id => id !== artistId) : [...prev, artistId];
    });
  }, [showToast]);

  const toggleSavePlaylist = useCallback((playlistId: string) => {
    setSavedPlaylistIds(prev => {
      const exists = prev.includes(playlistId);
      showToast(exists ? 'Removed from Your Library' : 'Saved to Your Library');
      return exists ? prev.filter(id => id !== playlistId) : [...prev, playlistId];
    });
  }, [showToast]);

  const togglePinPlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev =>
      prev.map(p => (p.id === playlistId ? { ...p, pinned: !p.pinned } : p))
    );
  }, []);

  const createFolder = useCallback(
    (name?: string) => {
      const f: PlaylistFolder = {
        id: `folder-${Date.now()}`,
        name: name?.trim() || `New Folder ${folders.length + 1}`,
      };
      setFolders(prev => [f, ...prev]);
      showToast(`Created folder "${f.name}"`);
      return f;
    },
    [folders.length, showToast]
  );

  const renameFolder = useCallback(
    (folderId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setFolders(prev =>
        prev.map(f => (f.id === folderId ? { ...f, name: trimmed } : f))
      );
      showToast(`Folder renamed to "${trimmed}"`);
    },
    [showToast]
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setPlaylists(prev =>
        prev.map(p => (p.folderId === folderId ? { ...p, folderId: undefined } : p))
      );
      showToast('Folder removed');
    },
    [showToast]
  );

  const movePlaylistToFolder = useCallback(
    (playlistId: string, folderId: string | undefined) => {
      setPlaylists(prev =>
        prev.map(p => (p.id === playlistId ? { ...p, folderId } : p))
      );
      showToast(folderId ? 'Moved playlist to folder' : 'Removed from folder');
    },
    [showToast]
  );

  const createPlaylist = useCallback((customTitle?: string, folderId?: string) => {
    const userCount = playlistsRef.current.filter(p => p.isUserCreated).length + 1;
    const newPl: Playlist = {
      id: `user-pl-${Date.now()}`,
      title: customTitle || `My Playlist #${userCount}`,
      description: 'Custom playlist in Your Library.',
      owner: 'You',
      type: 'playlist',
      category: 'Music',
      coverUrl: '',
      accentColor: '#282828',
      isUserCreated: true,
      folderId,
      trackIds: []
    };
    setPlaylists(prev => [prev[0], newPl, ...prev.slice(1)]);
    setSavedPlaylistIds(prev => [newPl.id, ...prev]);
    navigate({ name: 'playlist', id: newPl.id });
    showToast(`Created "${newPl.title}"`);
    return newPl;
  }, [navigate, showToast]);

  const importM3uPlaylist = useCallback(
    (name: string, content: string) => {
      const matched = matchM3uTracks(content, tracksRef.current);
      const cleanName = name.replace(/\.(m3u8?|txt)$/i, '').trim() || 'Imported Playlist';
      const newPl: Playlist = {
        id: `user-pl-${Date.now()}`,
        title: cleanName,
        description: `Imported playlist (${matched.length} matched local tracks).`,
        owner: 'You',
        type: 'playlist',
        category: 'Music',
        coverUrl: matched.find(t => t.coverUrl)?.coverUrl || '',
        accentColor: matched.find(t => t.accentColor !== '#282828')?.accentColor || '#282828',
        isUserCreated: true,
        trackIds: matched.map(t => t.id)
      };
      setPlaylists(prev => [prev[0], newPl, ...prev.slice(1)]);
      setSavedPlaylistIds(prev => [newPl.id, ...prev]);
      navigate({ name: 'playlist', id: newPl.id });
      showToast(
        matched.length > 0
          ? `Imported "${cleanName}" (${matched.length} tracks matched)`
          : `Created "${cleanName}" (0 local matches found)`
      );
      return matched.length;
    },
    [navigate, showToast]
  );

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    setSavedPlaylistIds(prev => prev.filter(id => id !== playlistId));
    navigate({ name: 'home' });
    showToast('Playlist deleted');
  }, [navigate, showToast]);

  const renamePlaylist = useCallback((playlistId: string, title: string, description?: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, title: title.trim() || p.title, description: description !== undefined ? description : p.description }
          : p
      )
    );
    showToast('Playlist details updated');
  }, [showToast]);

  const updatePlaylistCover = useCallback(async (playlistId: string, coverUrl: string) => {
    const accentColor = await extractDominantColor(coverUrl);
    setPlaylists(prev =>
      prev.map(p => (p.id === playlistId ? { ...p, coverUrl, accentColor } : p))
    );
    showToast('Playlist cover updated');
  }, [showToast]);

  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    const pl = playlistsRef.current.find(p => p.id === playlistId);
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p
      )
    );
    if (pl) showToast(`Added to "${pl.title}"`);
  }, [showToast]);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    if (playlistId === 'liked-songs') {
      setLikedTrackIds(prev => prev.filter(id => id !== trackId));
      showToast('Removed from Liked Songs');
      return;
    }
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } : p
      )
    );
    showToast('Removed from playlist');
  }, [showToast]);

  const reorderPlaylistTracks = useCallback((playlistId: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (playlistId === 'liked-songs') {
      setLikedTrackIds(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        if (!moved) return prev;
        next.splice(toIdx, 0, moved);
        return next;
      });
      return;
    }
    setPlaylists(prev =>
      prev.map(p => {
        if (p.id !== playlistId) return p;
        const next = [...p.trackIds];
        const [moved] = next.splice(fromIdx, 1);
        if (!moved) return p;
        next.splice(toIdx, 0, moved);
        return { ...p, trackIds: next };
      })
    );
  }, []);

  const removeTrackFromLibrary = useCallback((trackId: string) => {
    const t = tracksRef.current.find(tr => tr.id === trackId);
    if (t?.audioUrl.startsWith('blob:')) URL.revokeObjectURL(t.audioUrl);
    void deleteBrowserAudioTrack(trackId);

    if (currentTrackRef.current?.id === trackId) {
      decksRef.current?.forEach(d => {
        d.pause();
        d.removeAttribute('src');
        d.load();
      });
      setAbLoop({ a: null, b: null });
      setCurrentTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }

    setQueue(prev => prev.filter(q => q.id !== trackId));
    setContextTracks(prev => prev.filter(tr => tr.id !== trackId));
    setTracks(prev => prev.filter(tr => tr.id !== trackId));
    setLikedTrackIds(prev => prev.filter(id => id !== trackId));
    setRecentlyPlayedIds(prev => prev.filter(id => id !== trackId));
    setPlayCounts(prev => {
      if (!(trackId in prev)) return prev;
      const copy = { ...prev };
      delete copy[trackId];
      return copy;
    });
    setPlaylists(prev =>
      prev.map(p => ({ ...p, trackIds: p.trackIds.filter(id => id !== trackId) }))
    );
    showToast('Removed track from library');
  }, [showToast]);

  const openRightDrawer = useCallback((mode: RightDrawerMode) => {
    setRightDrawerMode(mode);
    setIsRightDrawerOpen(true);
  }, []);

  const toggleRightDrawer = useCallback((mode: RightDrawerMode) => {
    if (isRightDrawerOpen && rightDrawerMode === mode) {
      setIsRightDrawerOpen(false);
    } else {
      setRightDrawerMode(mode);
      setIsRightDrawerOpen(true);
    }
  }, [isRightDrawerOpen, rightDrawerMode]);

  const closeRightDrawer = useCallback(() => setIsRightDrawerOpen(false), []);

  return (
    <PlayerContext.Provider
      value={{
        tracks,
        playlists,
        folders,
        artists,
        albums,
        watchedFolders,
        likedTrackIds,
        followedArtistIds,
        savedPlaylistIds,
        savedAlbumIds,
        playCounts,
        lastPlayedMap,
        recentlyPlayedIds,
        searchHistory,
        listeningStats,
        smartRules,
        missingTrackIds,
        disconnectedDriveTrackIds,
        isImporting,
        currentTrack,
        activePlaylistId,
        contextTracks,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        settings,
        updateAudioSettings,
        profile,
        updateProfile,
        removeWatchedFolder,
        clearListeningHistory,
        exportLibraryBackup,
        importLibraryBackup,
        abLoop,
        sleepTimer,
        sleepRemainingSec,
        setEqPreset,
        setEqBandGain,
        saveCustomEqPreset,
        deleteCustomEqPreset,
        setCrossfadeSec,
        setPlaybackRate,
        setCompactMode,
        setAmoledMode,
        setHazyMode,
        setHazyBlur,
        setLoopA,
        setLoopB,
        clearAbLoop,
        startSleepTimer,
        route,
        canGoBack: navState.index > 0,
        canGoForward: navState.index < navState.history.length - 1,
        navigate,
        goBack,
        goForward,
        searchQuery,
        setSearchQuery,
        addSearchHistory,
        clearSearchHistory,
        searchInputRef,
        isRightDrawerOpen,
        rightDrawerMode,
        openRightDrawer,
        toggleRightDrawer,
        closeRightDrawer,
        activeDeviceId,
        setActiveDeviceId,
        audioOutputDevices,
        selectAudioOutputDevice,
        isMiniplayer,
        setIsMiniplayer,
        isTheaterMode,
        setIsTheaterMode,
        isMobilePlayerOpen,
        setIsMobilePlayerOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
        toastMessage,
        showToast,
        getFrequencyData,
        getWaveformData,
        beginScrub,
        commitScrub,
        playTrack,
        playPlaylist,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
        toggleShuffle,
        cycleRepeat,
        playNextInQueue,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        moveQueueItem,
        shuffleQueue,
        reverseQueue,
        saveQueueAsPlaylist,
        queueRemainingSec,
        queueEstimatedEndTime,
        toggleLikeTrack,
        toggleFollowArtist,
        toggleSavePlaylist,
        toggleSaveAlbum,
        togglePinPlaylist,
        createPlaylist,
        importM3uPlaylist,
        deletePlaylist,
        createFolder,
        renameFolder,
        deleteFolder,
        movePlaylistToFolder,
        renamePlaylist,
        updatePlaylistCover,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        reorderPlaylistTracks,
        removeTrackFromLibrary,
        updateTrackMetadata,
        toggleTrackExplicit,
        renameTrackFile,
        updateTrackLyrics,
        checkMissingFiles,
        removeMissingTracks,
        addCustomSmartRule,
        deleteCustomSmartRule,
        importBrowserAudioFiles,
        handleDroppedFiles,
        pickNativeAudioFiles,
        pickNativeAudioFolder,
        rescanWatchedFolders,
        fileInputRef,
        folderInputRef
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac,.opus,.aiff,.aif,.lrc,.txt"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) importBrowserAudioFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory supported in Chromium/Electron
        webkitdirectory=""
        className="hidden"
        onChange={e => {
          if (e.target.files) importBrowserAudioFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
