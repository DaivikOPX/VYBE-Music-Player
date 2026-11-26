export type ContentCategory = 'Music' | 'Podcasts' | 'Audiobooks';

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface Track {
  id: string;
  sourceKey?: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  trackNumber?: number;
  year?: number;
  genre?: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  codec?: string;
  fileSize?: number;
  duration: number;
  plays: string;
  playCount?: number;
  lastPlayedAt?: number;
  dateAdded: string;
  addedAt?: number;
  explicit?: boolean;
  coverUrl: string;
  audioUrl: string;
  accentColor: string;
  category: ContentCategory;
  lyrics?: LyricLine[];
  lyricsOffsetSec?: number;
  isMissing?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  owner: string;
  type: 'playlist' | 'album' | 'podcast' | 'audiobook';
  category: ContentCategory;
  coverUrl: string;
  accentColor: string;
  saves?: string;
  pinned?: boolean;
  isLikedSongs?: boolean;
  isUserCreated?: boolean;
  isLocalFiles?: boolean;
  folderId?: string;
  trackIds: string[];
}

export interface PlaylistFolder {
  id: string;
  name: string;
}

export interface Artist {
  id: string;
  name: string;
  coverUrl: string;
  accentColor: string;
  trackIds: string[];
  albums: string[];
}

export interface AlbumSummary {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  year?: number;
  coverUrl: string;
  accentColor: string;
  trackIds: string[];
}

export type ViewRoute =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'browse' }
  | { name: 'library' }
  | { name: 'playlist'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'album'; albumName: string; artistName?: string }
  | { name: 'liked' }
  | { name: 'lyrics' }
  | { name: 'recently-played' }
  | { name: 'most-played' }
  | { name: 'stats' }
  | { name: 'profile' }
  | { name: 'folder-tree' }
  | { name: 'settings' };

export interface SmartRuleConfig {
  id: string;
  title: string;
  description: string;
  kind:
    | 'recently-added'
    | 'never-played'
    | 'last-7-days'
    | 'not-played-30d'
    | 'not-played-90d'
    | 'custom';
  artist?: string;
  genre?: string;
  year?: number;
  maxDurationSec?: number;
  codec?: string;
}

export interface ListeningStats {
  totalListeningSec: number;
  dailyListening: Record<string, { sec: number; plays: number }>;
  hourlyListening?: Record<number, { sec: number; plays: number }>;
  skipCounts?: Record<string, number>;
  totalSkips?: number;
  sessionCount?: number;
  totalSessionSec?: number;
  lastSessionAt?: number;
}

export interface UserProfile {
  displayName: string;
  avatarUrl: string;
  accentColor: string;
  bio: string;
}

export type RightDrawerMode = 'nowPlaying' | 'queue' | 'friends';

export interface AudioSettings {
  eqPreset: string;
  eqGains: number[]; // 6 bands: 60, 170, 400, 1000, 3000, 10000 Hz (-12 to +12 dB)
  crossfadeSec: number; // 0 to 12
  playbackRate: number; // 0.75 to 2.0
  compactMode: boolean;
  amoledMode: boolean;
  hazyMode?: boolean;
  hazyBlur?: number; // 0 (complete transparent, 0px blur) to 100 (full blur, 80px blur)
  sidebarMode?: 'pinned' | 'hover';
  preampDb?: number; // -6 to +6 dB
  showVisualizer?: boolean;
  animationsEnabled?: boolean;
  resumeOnStartup?: boolean;
  closeToTray?: boolean;
  showFormatBadges?: boolean;
  gaplessPlayback?: boolean;
  normalizeVolume?: 'off' | 'quiet' | 'normal' | 'loud';
  monoAudio?: boolean;
  audioBalance?: number;
  privateSession?: boolean;
  customEqPresets?: Record<string, number[]>;
  lightMode?: boolean;
  viewMode?: 'grid' | 'list';
  desktopNotifications?: boolean;
  startOnBoot?: boolean;
  globalShortcuts?: boolean;
  visualizerStyle?: 'bars' | 'waveform' | 'fluid' | 'radial' | 'particles';
  zoomLevel?: number; // 70 to 130
  lyricsSource?: 'online' | 'local';
  dynamicAccentColor?: boolean;
}

export interface PersistedAppState {
  version: number;
  watchedFolders: string[];
  playlists: Playlist[];
  folders?: PlaylistFolder[];
  likedTrackIds: string[];
  followedArtistIds: string[];
  savedAlbumIds?: string[];
  pinnedItemIds?: string[];
  playCounts: Record<string, number>;
  lastPlayedMap?: Record<string, number>;
  recentlyPlayedIds: string[];
  queueTrackIds?: string[];
  searchHistory?: string[];
  listeningStats?: ListeningStats;
  smartRules?: SmartRuleConfig[];
  customTracksMeta?: Record<
    string,
    Pick<Partial<Track>, 'title' | 'artist' | 'album' | 'genre' | 'year' | 'trackNumber' | 'coverUrl' | 'lyrics' | 'lyricsOffsetSec' | 'explicit'>
  >;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  lastTrackId: string | null;
  lastPositionSec: number;
  settings: AudioSettings;
  profile?: UserProfile;
}

export interface NativeAudioItem {
  id: string;
  sourceKey?: string;
  title: string;
  artist: string;
  album: string;
  trackNumber?: number;
  year?: number;
  genre?: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  codec?: string;
  fileSize?: number;
  coverUrl?: string;
  accentColor?: string;
  lyrics?: LyricLine[];
  audioUrl: string;
  fileName: string;
}

export interface ElectronBridgeAPI {
  isElectron: boolean;
  platform: string;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (cb: (maximized: boolean) => void) => () => void;
  onMediaControl?: (cb: (action: string) => void) => () => void;
  onOpenFiles?: (cb: (items: NativeAudioItem[]) => void) => () => void;
  pickAudioFiles: () => Promise<NativeAudioItem[]>;
  pickAudioFolder: () => Promise<{ folderPath: string; items: NativeAudioItem[] } | null>;
  scanWatchedFolders: (folders: string[]) => Promise<NativeAudioItem[]>;
  scanDroppedPaths: (paths: string[]) => Promise<{ folders: string[]; items: NativeAudioItem[] }>;
  checkMissingFiles?: (paths: string[]) => Promise<{ missingPaths: string[]; disconnectedDrivePaths: string[] } | string[]>;
  importPlaylistFile?: () => Promise<{ name: string; content: string } | null>;
  getPathForFile?: (file: File) => string;
  loadState: () => Promise<PersistedAppState | null>;
  saveState: (state: PersistedAppState) => Promise<void>;
  showInExplorer: (filePath: string) => void;
  renameFile?: (oldPath: string, newFileName: string) => Promise<{ success: boolean; newPath?: string; newFileName?: string; error?: string }>;
  writeId3Tags?: (filePath: string, tags: { title?: string; artist?: string; album?: string; genre?: string; year?: number | string; trackNumber?: number | string; coverDataUrl?: string }) => Promise<{ success: boolean; error?: string; format?: string }>;
  findLocalCover?: (filePath: string) => Promise<string | null>;
  updatePlayState: (isPlaying: boolean, title?: string) => void;
  setCloseToTray?: (enabled: boolean) => void;
  setStartOnBoot?: (enabled: boolean) => void;
  getStartOnBoot?: () => Promise<boolean>;
  setGlobalShortcuts?: (enabled: boolean) => void;
  showNotification?: (title: string, body: string) => void;
  setZoomFactor?: (factor: number) => void;
  getZoomFactor?: () => number;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridgeAPI;
  }
}
