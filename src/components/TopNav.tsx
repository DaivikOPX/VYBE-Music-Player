import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Minus,
  Square,
  Copy,
  X,
  User,
  Check,
  RefreshCw,
  Loader2,
  Sparkles,
  Settings,
  BarChart3,
  Droplets,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import {
  HomeFilledIcon,
  HomeOutlineIcon,
  SearchIcon,
  BrowseFilledIcon,
  BrowseOutlineIcon,
} from './SpotifyIcons';

export const TopNav: React.FC = () => {
  const {
    route,
    navigate,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    searchQuery,
    setSearchQuery,
    addSearchHistory,
    searchInputRef,
    toggleRightDrawer,
    isPlaying,
    togglePlay,
    toggleShuffle,
    cycleRepeat,
    isShuffle,
    repeatMode,
    watchedFolders,
    isImporting,
    pickNativeAudioFiles,
    pickNativeAudioFolder,
    rescanWatchedFolders,
    setIsShortcutsOpen,
    settings,
    updateAudioSettings,
    setAmoledMode,
    setHazyMode,
    profile,
    showToast,
    setIsTheaterMode,
    currentTrack,
    tracks,
    playTrack,
  } = usePlayer();

  const [menuOpen, setMenuOpen] = useState<'app' | 'profile' | 'hazy' | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'file' | 'edit' | 'view' | 'playback' | 'help' | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
        setActiveSubmenu(null);
      }
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    const unsub = window.electronAPI.onMaximizedChange(setIsMaximized);
    return unsub;
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    } else {
      showToast('Window minimize requires Desktop App');
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize();
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else {
      showToast('Close window requires Desktop App');
    }
  };

  return (
    <header
      ref={navRef}
      data-testid="global-nav-bar"
      className={`hidden md:flex h-16 ${
        settings.hazyMode
          ? 'bg-black/35 backdrop-blur-3xl border-b border-white/5'
          : 'bg-black border-b border-black'
      } items-center justify-between px-4 select-none text-spotify-muted shrink-0 relative z-40 app-drag`}
    >
      {/* Left: App Menu Dots & History Navigation */}
      <div className="flex items-center gap-2 min-w-[200px] app-no-drag">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === 'app' ? null : 'app')}
            title="Menu"
            className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen === 'app' && (
            <div
              className="absolute left-0 top-10 w-48 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1 text-[13px] text-white z-50 select-none animate-in fade-in duration-100"
            >
              {/* File */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu('file')}
              >
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === 'file' ? null : 'file')}
                  className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                    activeSubmenu === 'file' ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-[#d1d1d1]'
                  }`}
                >
                  <span className="font-normal">File</span>
                  <ChevronRight size={14} className="text-white/60" />
                </button>

                {activeSubmenu === 'file' && (
                  <div
                    onMouseEnter={() => setActiveSubmenu('file')}
                    className="absolute left-full top-0 -ml-1 pl-1 w-56 z-50"
                  >
                    <div className="w-full bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1 text-[13px] text-white">
                    <button
                      onClick={() => {
                        void pickNativeAudioFiles();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Open Audio Files...</span>
                      <span className="text-[11px] text-white/40">Ctrl+O</span>
                    </button>
                    <button
                      onClick={() => {
                        void pickNativeAudioFolder();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Open Music Folder...</span>
                      <span className="text-[11px] text-white/40">Ctrl+Shift+O</span>
                    </button>
                    {watchedFolders.length > 0 && (
                      <button
                        onClick={() => {
                          void rescanWatchedFolders();
                          setMenuOpen(null);
                          setActiveSubmenu(null);
                        }}
                        className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-spotify-green hover:brightness-110"
                      >
                        <span>Rescan Folders</span>
                        <RefreshCw size={13} />
                      </button>
                    )}
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        navigate({ name: 'home' });
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>New Playlist</span>
                      <span className="text-[11px] text-white/40">Ctrl+N</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        handleClose();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Close</span>
                      <span className="text-[11px] text-white/40">Alt+F4</span>
                    </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu('edit')}
              >
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === 'edit' ? null : 'edit')}
                  className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                    activeSubmenu === 'edit' ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-[#d1d1d1]'
                  }`}
                >
                  <span className="font-normal">Edit</span>
                  <ChevronRight size={14} className="text-white/60" />
                </button>

                {activeSubmenu === 'edit' && (
                  <div
                    onMouseEnter={() => setActiveSubmenu('edit')}
                    className="absolute left-full top-0 -ml-1 pl-1 w-52 z-50"
                  >
                    <div className="w-full bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1 text-[13px] text-white">
                    <button
                      onClick={() => {
                        document.execCommand('undo');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Undo</span>
                      <span className="text-[11px] text-white/40">Ctrl+Z</span>
                    </button>
                    <button
                      onClick={() => {
                        document.execCommand('redo');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Redo</span>
                      <span className="text-[11px] text-white/40">Ctrl+Y</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        document.execCommand('cut');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Cut</span>
                      <span className="text-[11px] text-white/40">Ctrl+X</span>
                    </button>
                    <button
                      onClick={() => {
                        document.execCommand('copy');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Copy</span>
                      <span className="text-[11px] text-white/40">Ctrl+C</span>
                    </button>
                    <button
                      onClick={() => {
                        document.execCommand('paste');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Paste</span>
                      <span className="text-[11px] text-white/40">Ctrl+V</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        navigate({ name: 'settings' });
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Preferences...</span>
                      <span className="text-[11px] text-white/40">Ctrl+P</span>
                    </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu('view')}
              >
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === 'view' ? null : 'view')}
                  className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                    activeSubmenu === 'view' ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-[#d1d1d1]'
                  }`}
                >
                  <span className="font-normal">View</span>
                  <ChevronRight size={14} className="text-white/60" />
                </button>

                {activeSubmenu === 'view' && (
                  <div
                    onMouseEnter={() => setActiveSubmenu('view')}
                    className="absolute left-full top-0 -ml-1 pl-1 w-52 z-50"
                  >
                    <div className="w-full bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1 text-[13px] text-white">
                    <button
                      onClick={() => {
                        const cur = settings.zoomLevel || 100;
                        const next = Math.min(130, cur + 10);
                        if (next !== cur) {
                          updateAudioSettings({ zoomLevel: next });
                        }
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Zoom In</span>
                      <span className="text-[11px] text-white/40">Ctrl++</span>
                    </button>
                    <button
                      onClick={() => {
                        const cur = settings.zoomLevel || 100;
                        const next = Math.max(70, cur - 10);
                        if (next !== cur) {
                          updateAudioSettings({ zoomLevel: next });
                        }
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Zoom Out</span>
                      <span className="text-[11px] text-white/40">Ctrl+-</span>
                    </button>
                    <button
                      onClick={() => {
                        updateAudioSettings({ zoomLevel: 100 });
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Reset Zoom</span>
                      <span className="text-[11px] text-white/40">Ctrl+0</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        handleMaximize();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Full Screen</span>
                      <span className="text-[11px] text-white/40">F11</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!currentTrack && tracks.length > 0) {
                          playTrack(tracks[0], tracks, null);
                        }
                        setIsTheaterMode(true);
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-spotify-green hover:text-spotify-green font-medium"
                    >
                      <span>Theater Mode (Visualizer)</span>
                      <span className="text-[11px] text-white/40">F</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate({ name: 'folder-tree' });
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Folder Tree Explorer</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        navigate({ name: 'lyrics' });
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Lyrics</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleRightDrawer('queue');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Queue</span>
                    </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu('playback')}
              >
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === 'playback' ? null : 'playback')}
                  className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                    activeSubmenu === 'playback' ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-[#d1d1d1]'
                  }`}
                >
                  <span className="font-normal">Playback</span>
                  <ChevronRight size={14} className="text-white/60" />
                </button>

                {activeSubmenu === 'playback' && (
                  <div
                    onMouseEnter={() => setActiveSubmenu('playback')}
                    className="absolute left-full top-0 -ml-1 pl-1 w-52 z-50"
                  >
                    <div className="w-full bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1 text-[13px] text-white">
                    <button
                      onClick={() => {
                        togglePlay();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      <span className="text-[11px] text-white/40">Space</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleShuffle();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Shuffle</span>
                      {isShuffle && <Check size={13} className="text-spotify-green" />}
                    </button>
                    <button
                      onClick={() => {
                        cycleRepeat();
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Repeat ({repeatMode})</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        setAmoledMode(!settings.amoledMode);
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>AMOLED Black</span>
                      {settings.amoledMode && <Check size={13} className="text-spotify-green" />}
                    </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Help */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu('help')}
              >
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === 'help' ? null : 'help')}
                  className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between cursor-pointer transition-colors ${
                    activeSubmenu === 'help' ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-[#d1d1d1]'
                  }`}
                >
                  <span className="font-normal">Help</span>
                  <ChevronRight size={14} className="text-white/60" />
                </button>

                {activeSubmenu === 'help' && (
                  <div
                    onMouseEnter={() => setActiveSubmenu('help')}
                    className="absolute left-full top-0 -ml-1 pl-1 w-52 z-50"
                  >
                    <div className="w-full bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1 text-[13px] text-white">
                    <button
                      onClick={() => {
                        setIsShortcutsOpen(true);
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>Keyboard Shortcuts</span>
                      <span className="text-[11px] text-white/40">?</span>
                    </button>
                    <button
                      onClick={() => {
                        showToast('VYBE Music Player v1.0.0 — Modern Studio Audio Player');
                        setMenuOpen(null);
                        setActiveSubmenu(null);
                      }}
                      className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
                    >
                      <span>About VYBE</span>
                    </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            title="Go back"
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-white/10 flex items-center justify-center text-spotify-muted hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-spotify-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            title="Go forward"
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-white/10 flex items-center justify-center text-spotify-muted hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-spotify-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Center: Home Button + Search Pill (Dead-Centered Spotify Layout) */}
      <div className="flex-1 flex items-center justify-center gap-2 max-w-[620px] mx-auto px-2 app-no-drag">
        <button
          data-testid="home-button"
          onClick={() => navigate({ name: 'home' })}
          title="Home"
          className="w-12 h-12 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-104 active:scale-95 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm"
        >
          {route.name === 'home' ? (
            <HomeFilledIcon size={24} className="text-white" />
          ) : (
            <HomeOutlineIcon size={24} className="text-spotify-muted hover:text-white" />
          )}
        </button>

        <div
          onClick={() => {
            if (route.name !== 'search' && route.name !== 'browse') {
              navigate({ name: searchQuery.trim() ? 'search' : 'browse' });
            }
          }}
          className="relative flex-1 max-w-[480px] h-12 bg-[#1f1f1f] hover:bg-[#2a2a2a] focus-within:bg-[#242424] focus-within:ring-2 focus-within:ring-white rounded-full flex items-center px-4 transition-all group border border-transparent shadow-sm"
        >
          <SearchIcon
            size={20}
            className="text-spotify-muted group-hover:text-white group-focus-within:text-white transition-colors mr-3 shrink-0"
          />
          <input
            ref={searchInputRef}
            data-testid="search-input"
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() && route.name !== 'search') {
                navigate({ name: 'search' });
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addSearchHistory(searchQuery);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim() && route.name !== 'search') {
                navigate({ name: 'search' });
              }
            }}
            placeholder="What do you want to play?"
            className="bg-transparent text-white placeholder:text-spotify-muted text-[14px] font-normal w-full focus:outline-none"
          />
          {searchQuery && (
            <button
              data-testid="clear-button"
              onClick={e => {
                e.stopPropagation();
                setSearchQuery('');
                navigate({ name: 'browse' });
              }}
              title="Clear search field"
              className="text-spotify-muted hover:text-white p-1 mr-1 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          )}
          <div className="h-6 w-[1px] bg-white/15 mx-2 shrink-0" />
          <button
            data-testid="browse-button"
            onClick={e => {
              e.stopPropagation();
              navigate({ name: 'browse' });
            }}
            title="Browse"
            className="p-1 text-spotify-muted hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {route.name === 'browse' ? (
              <BrowseFilledIcon size={22} className="text-white" />
            ) : (
              <BrowseOutlineIcon size={22} />
            )}
          </button>
        </div>
      </div>

      {/* Right: Authentic Uncluttered Spotify Actions & Native Caption Controls */}
      <div className="flex items-center gap-3 min-w-[200px] justify-end app-no-drag">
        {isImporting && (
          <div
            title="Scanning local music files..."
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-spotify-green/15 text-spotify-green text-xs font-semibold mr-1"
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Importing</span>
          </div>
        )}

        {/* Profile Avatar Button */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === 'profile' ? null : 'profile')}
            title={`${profile.displayName} • Profile & Settings`}
            className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer overflow-hidden border border-white/10"
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
                className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
              >
                {(profile.displayName || 'M').trim().charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {menuOpen === 'profile' && (
            <div className="absolute right-0 top-11 w-56 bg-[#282828] rounded-lg shadow-2xl border border-white/10 py-1.5 text-[13px] text-white z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  navigate({ name: 'profile' });
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer font-medium"
              >
                <span>Profile</span>
                <User size={15} className="text-spotify-muted" />
              </button>
              <button
                onClick={() => {
                  navigate({ name: 'settings' });
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer font-medium"
              >
                <span>Settings</span>
                <Settings size={15} className="text-spotify-muted" />
              </button>
              <button
                onClick={() => {
                  navigate({ name: 'stats' });
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer font-medium text-spotify-green"
              >
                <span>Listening Stats</span>
                <BarChart3 size={15} className="text-spotify-green" />
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => {
                  setHazyMode(!settings.hazyMode);
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Droplets size={14} className={settings.hazyMode ? 'text-spotify-green' : 'text-spotify-muted'} />
                  <span>Glass Theme</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${settings.hazyMode ? 'bg-spotify-green/20 text-spotify-green' : 'bg-white/10 text-spotify-muted'}`}>
                  {settings.hazyMode ? 'ON' : 'OFF'}
                </span>
              </button>
              <button
                onClick={() => {
                  setAmoledMode(!settings.amoledMode);
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className={settings.amoledMode ? 'text-spotify-green' : 'text-spotify-muted'} />
                  <span>AMOLED True Black</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${settings.amoledMode ? 'bg-spotify-green/20 text-spotify-green' : 'bg-white/10 text-spotify-muted'}`}>
                  {settings.amoledMode ? 'ON' : 'OFF'}
                </span>
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => {
                  void pickNativeAudioFolder();
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 cursor-pointer text-[#d1d1d1] hover:text-white"
              >
                Import Music Folder...
              </button>
              <button
                onClick={() => {
                  void pickNativeAudioFiles();
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 cursor-pointer text-[#d1d1d1] hover:text-white"
              >
                Import Audio Files...
              </button>
              <button
                onClick={() => {
                  setIsShortcutsOpen(true);
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
              >
                <span>Keyboard Shortcuts</span>
                <span className="text-[11px] text-white/40">Ctrl+/</span>
              </button>
              <button
                onClick={() => {
                  if (!currentTrack && tracks.length > 0) {
                    playTrack(tracks[0], tracks, null);
                  }
                  setIsTheaterMode(true);
                  setMenuOpen(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer text-[#d1d1d1] hover:text-white"
              >
                <span>Theater Mode</span>
                <span className="text-[11px] text-white/40">F</span>
              </button>
            </div>
          )}
        </div>

        {/* Native Windows Caption Controls (Desktop .exe) */}
        {window.electronAPI && (
          <div className="flex items-center -mr-4 h-16 ml-1">
            <button
              onClick={handleMinimize}
              title="Minimize"
              className="w-12 h-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Minus size={15} />
            </button>
            <button
              onClick={handleMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="w-12 h-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isMaximized ? <Copy size={13} /> : <Square size={13} />}
            </button>
            <button
              onClick={handleClose}
              title="Close"
              className="w-12 h-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
