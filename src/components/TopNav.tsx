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
  FolderOpen,
  FileAudio,
  Keyboard,
  RefreshCw,
  Loader2,
  Sparkles,
  Settings,
  BarChart3,
  Droplets,
  Sliders,
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
    setAmoledMode,
    setHazyMode,
    setHazyBlur,
    profile,
    showToast,
  } = usePlayer();

  const [menuOpen, setMenuOpen] = useState<'app' | 'profile' | 'hazy' | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
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
      className={`hidden md:flex h-14 ${
        settings.hazyMode
          ? 'bg-black/25 backdrop-blur-3xl border-b border-white/10'
          : 'bg-black/90 backdrop-blur-2xl border-b border-white/[0.06]'
      } items-center justify-between px-3 select-none text-spotify-muted shrink-0 relative z-40 app-drag`}
    >
      {/* Left: App Menu Dots & History Navigation */}
      <div className="flex items-center gap-2 min-w-[140px] app-no-drag">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === 'app' ? null : 'app')}
            title="Menu"
            className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen === 'app' && (
            <div className="absolute left-0 top-10 w-64 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1.5 text-sm text-white z-50">
              <button
                onClick={() => {
                  void pickNativeAudioFiles();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <FileAudio size={15} className="text-spotify-muted" />
                <span>Open Audio Files...</span>
              </button>
              <button
                onClick={() => {
                  void pickNativeAudioFolder();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <FolderOpen size={15} className="text-spotify-muted" />
                <span>Open Music Folder...</span>
              </button>
              {watchedFolders.length > 0 && (
                <button
                  onClick={() => {
                    void rescanWatchedFolders();
                    setMenuOpen(null);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <RefreshCw size={15} className="text-spotify-green" />
                  <span>Rescan Watched Folders</span>
                </button>
              )}
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => {
                  togglePlay();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                <span className="text-xs text-spotify-muted">Space</span>
              </button>
              <button
                onClick={() => {
                  toggleShuffle();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span>Shuffle</span>
                {isShuffle && <Check size={14} className="text-spotify-green" />}
              </button>
              <button
                onClick={() => {
                  cycleRepeat();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span>Repeat ({repeatMode})</span>
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => {
                  navigate({ name: 'stats' });
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
              >
                Listening Stats & Health
              </button>
              <button
                onClick={() => {
                  navigate({ name: 'lyrics' });
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
              >
                Lyrics View
              </button>
              <button
                onClick={() => {
                  toggleRightDrawer('queue');
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
              >
                Queue
              </button>
              <button
                onClick={() => {
                  setAmoledMode(!settings.amoledMode);
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className="text-spotify-muted" />
                  <span>AMOLED Black</span>
                </span>
                {settings.amoledMode && <Check size={14} className="text-spotify-green" />}
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => {
                  setIsShortcutsOpen(true);
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Keyboard size={14} className="text-spotify-muted" />
                  <span>Keyboard Shortcuts</span>
                </span>
                <span className="text-xs text-spotify-muted">?</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            title="Go back"
            className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white disabled:opacity-35 disabled:hover:text-spotify-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            title="Go forward"
            className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white disabled:opacity-35 disabled:hover:text-spotify-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Center: Home Button + Search Pill */}
      <div className="flex items-center gap-2 flex-1 max-w-[540px] justify-center px-2 app-no-drag">
        <button
          data-testid="home-button"
          onClick={() => navigate({ name: 'home' })}
          title="Home"
          className="w-10 h-10 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-104 active:scale-95 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
        >
          {route.name === 'home' ? (
            <HomeFilledIcon size={20} className="text-white" />
          ) : (
            <HomeOutlineIcon size={20} className="text-spotify-muted hover:text-white" />
          )}
        </button>

        <div
          onClick={() => {
            if (route.name !== 'search' && route.name !== 'browse') {
              navigate({ name: searchQuery.trim() ? 'search' : 'browse' });
            }
          }}
          className="relative flex-1 max-w-[480px] h-10 bg-[#1f1f1f] hover:bg-[#2a2a2a] focus-within:bg-[#242424] focus-within:ring-2 focus-within:ring-white rounded-full flex items-center px-3.5 transition-all group"
        >
          <SearchIcon
            size={18}
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
            placeholder="What do you want to play? (Ctrl+K)"
            className="bg-transparent text-white placeholder:text-spotify-muted text-sm font-normal w-full focus:outline-none"
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
          <div className="h-5 w-[1px] bg-[#7c7c7c]/40 mx-1.5 shrink-0" />
          <button
            data-testid="browse-button"
            onClick={e => {
              e.stopPropagation();
              navigate({ name: 'browse' });
            }}
            title="Browse Library"
            className="p-1 text-spotify-muted hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {route.name === 'browse' ? (
              <BrowseFilledIcon size={19} className="text-white" />
            ) : (
              <BrowseOutlineIcon size={19} />
            )}
          </button>
        </div>
      </div>

      {/* Right: Utility Buttons & Real Desktop Window Caption Controls */}
      <div className="flex items-center gap-1.5 min-w-[200px] justify-end app-no-drag">
        {isImporting && (
          <div
            title="Scanning local music files..."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-spotify-green/15 text-spotify-green text-xs font-bold mr-1"
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Importing</span>
          </div>
        )}

        <button
          onClick={() => void pickNativeAudioFolder()}
          title="Import Music Folder"
          className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#1f1f1f] hover:scale-105 transition-all cursor-pointer"
        >
          <FolderOpen size={17} />
        </button>

        {/* Hazy Glass & Blur Quick Popover directly in settings bar */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === 'hazy' ? null : 'hazy')}
            title="Display & Hazy Glass Blur Settings"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
              menuOpen === 'hazy' || settings.hazyMode
                ? 'text-spotify-green bg-white/10 ring-1 ring-spotify-green/40'
                : 'text-spotify-muted hover:text-white hover:bg-[#1f1f1f]'
            }`}
          >
            <Sliders size={16} />
            {settings.hazyMode && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-spotify-green shadow-xs" />
            )}
          </button>

          {menuOpen === 'hazy' && (
            <div className="absolute right-0 top-10 w-72 bg-[#222222]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-3.5 shadow-2xl z-50 text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className={settings.hazyMode ? 'text-spotify-green' : 'text-spotify-muted'} />
                  <span className="font-bold text-xs tracking-wide">Hazy Glass Theme</span>
                </div>
                <button
                  onClick={() => setHazyMode(!settings.hazyMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.hazyMode ? 'bg-spotify-green' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                      settings.hazyMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Blur & Transparency Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-spotify-muted font-medium">Blur & Transparency</span>
                  <span className="font-mono font-bold text-spotify-green bg-spotify-green/10 px-1.5 py-0.5 rounded text-[11px]">
                    {(settings.hazyBlur ?? 45) === 0 ? '0% (Transparent)' : `${settings.hazyBlur ?? 45}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.hazyBlur ?? 45}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setHazyBlur(val);
                    if (!settings.hazyMode) setHazyMode(true);
                  }}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-spotify-green"
                />

                <div className="flex justify-between text-[10px] text-spotify-muted font-medium pt-0.5">
                  <span>0% Clear</span>
                  <span>50% Acrylic</span>
                  <span>100% Full Blur</span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-5 gap-1 pt-1.5">
                  {[
                    { label: '0%', val: 0 },
                    { label: '25%', val: 25 },
                    { label: '50%', val: 50 },
                    { label: '75%', val: 75 },
                    { label: '100%', val: 100 },
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => {
                        setHazyBlur(p.val);
                        if (!settings.hazyMode) setHazyMode(true);
                      }}
                      className={`text-[10px] font-bold py-1 rounded transition-colors text-center cursor-pointer ${
                        (settings.hazyBlur ?? 45) === p.val
                          ? 'bg-spotify-green text-black font-extrabold shadow-sm'
                          : 'bg-white/10 hover:bg-white/15 text-spotify-muted hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-2.5 border-t border-white/10" />

              {/* AMOLED toggle */}
              <button
                onClick={() => setAmoledMode(!settings.amoledMode)}
                className="w-full px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between text-xs text-spotify-muted hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={13} />
                  <span>AMOLED True Black</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${settings.amoledMode ? 'bg-spotify-green/20 text-spotify-green' : 'bg-white/10 text-spotify-muted'}`}>
                  {settings.amoledMode ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Open Full Settings */}
              <button
                onClick={() => {
                  navigate({ name: 'settings' });
                  setMenuOpen(null);
                }}
                className="w-full mt-1 px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Settings size={13} className="text-spotify-muted" />
                  <span>All Display Settings</span>
                </span>
                <span className="text-spotify-muted text-[11px]">→</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Settings Gear Button in Top Navigation */}
        <button
          onClick={() => navigate({ name: 'settings' })}
          title="Settings"
          className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#1f1f1f] hover:scale-105 transition-all cursor-pointer"
        >
          <Settings size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === 'profile' ? null : 'profile')}
            title={`${profile.displayName} • Profile & Settings`}
            className="w-8 h-8 rounded-full bg-[#1f1f1f] hover:scale-105 flex items-center justify-center transition-transform cursor-pointer overflow-hidden border border-white/10"
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

          {menuOpen === 'profile' && (
            <div className="absolute right-0 top-10 w-56 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1.5 text-sm text-white z-50">
              <button
                onClick={() => {
                  navigate({ name: 'profile' });
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer font-semibold"
              >
                <span>Profile</span>
                <User size={14} className="text-spotify-muted" />
              </button>
              <button
                onClick={() => {
                  navigate({ name: 'settings' });
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span>Settings</span>
                <Settings size={14} className="text-spotify-muted" />
              </button>
              <button
                onClick={() => {
                  setHazyMode(!settings.hazyMode);
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Droplets size={14} className={settings.hazyMode ? 'text-spotify-green' : 'text-spotify-muted'} />
                  <span>Transparent Theme</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${settings.hazyMode ? 'bg-spotify-green/20 text-spotify-green' : 'bg-white/10 text-spotify-muted'}`}>
                  {settings.hazyMode ? 'ON' : 'OFF'}
                </span>
              </button>
              <button
                onClick={() => {
                  navigate({ name: 'stats' });
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer font-semibold text-spotify-green"
              >
                <span>Listening Stats</span>
                <BarChart3 size={14} className="text-spotify-green" />
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => {
                  void pickNativeAudioFiles();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
              >
                Import Local Audio Files
              </button>
              <button
                onClick={() => {
                  void pickNativeAudioFolder();
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
              >
                Import Local Folder
              </button>
              <button
                onClick={() => {
                  setIsShortcutsOpen(true);
                  setMenuOpen(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
              >
                Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>

        {/* Native Window Controls (Desktop .exe only) */}
        {window.electronAPI && (
          <div className="flex items-center ml-1 pl-2 border-l border-white/10">
            <button
              onClick={handleMinimize}
              title="Minimize"
              className="w-9 h-8 flex items-center justify-center text-spotify-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={handleMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="w-9 h-8 flex items-center justify-center text-spotify-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isMaximized ? <Copy size={12} /> : <Square size={12} />}
            </button>
            <button
              onClick={handleClose}
              title="Close"
              className="w-9 h-8 flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
