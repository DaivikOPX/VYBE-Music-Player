import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ArrowRight,
  Search,
  Heart,
  Pin,
  Music,
  Volume2,
  X,
  Check,
  FolderOpen,
  Disc3,
  Trash2,
  ChevronRight,
  ChevronDown,
  AlignJustify,
  List,
  Grid3X3,
  Grid2X2,
  Folder,
  Edit2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import {
  LibraryExpandedIcon,
  LibraryCollapsedIcon,
  Play16Icon,
  CreatePlaylistMenuIcon,
  CreateFolderMenuIcon,
} from './SpotifyIcons';

type LibraryFilter = 'all' | 'playlists' | 'artists' | 'albums';
type SortMode = 'recents' | 'recently-added' | 'alphabetical' | 'creator';
type SidebarViewMode = 'compact' | 'list' | 'grid' | 'large-grid';

export const Sidebar: React.FC = () => {
  const {
    playlists,
    folders,
    artists,
    albums,
    savedPlaylistIds,
    followedArtistIds,
    likedTrackIds,
    route,
    navigate,
    playPlaylist,
    playTrack,
    tracks,
    activePlaylistId,
    isPlaying,
    createPlaylist,
    deletePlaylist,
    createFolder,
    renameFolder,
    deleteFolder,
    movePlaylistToFolder,
    togglePinPlaylist,
    addTrackToPlaylist,
    importM3uPlaylist,
    settings,
  } = usePlayer();
  const m3uInputRef = useRef<HTMLInputElement>(null);

  const [width, setWidth] = useState(280);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpandedWide, setIsExpandedWide] = useState(false);
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem('sidebar_sort_mode') as SortMode) || 'recents';
  });
  const [sidebarViewMode, setSidebarViewMode] = useState<SidebarViewMode>(() => {
    return (localStorage.getItem('sidebar_view_mode') as SidebarViewMode) || 'list';
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    isUserCreated?: boolean;
    pinned?: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    id: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const isResizingRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const createMenuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newW = e.clientX - 8;
      if (newW < 150) {
        setIsCollapsed(true);
        setIsExpandedWide(false);
      } else {
        setIsCollapsed(false);
        setIsExpandedWide(false);
        setWidth(Math.max(250, Math.min(440, newW)));
      }
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    const closeMenus = (e: MouseEvent) => {
      if (
        createMenuContainerRef.current &&
        !createMenuContainerRef.current.contains(e.target as Node)
      ) {
        setCreateMenuOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
      setContextMenu(null);
      setFolderContextMenu(null);
    };
    window.addEventListener('mousedown', closeMenus);
    return () => window.removeEventListener('mousedown', closeMenus);
  }, []);

  const libraryPlaylists = playlists.filter(
    p => (p.isLikedSongs || p.isUserCreated || p.isLocalFiles || savedPlaylistIds.includes(p.id)) && !p.folderId
  );
  // Show followed artists or all artists when explicitly filtering by Artists
  const libraryArtists =
    activeFilter === 'artists'
      ? artists
      : artists.filter(a => followedArtistIds.includes(a.id));

  type Entry = {
    kind: 'playlist' | 'artist' | 'album';
    id: string;
    title: string;
    subtitle: string;
    coverUrl: string;
    isLikedSongs?: boolean;
    isLocalFiles?: boolean;
    isUserCreated?: boolean;
    pinned?: boolean;
    owner: string;
    addedAt?: number;
    lastPlayedAt?: number;
  };

  let entries: Entry[] = [
    ...libraryPlaylists.map(p => {
      const plTracks = p.trackIds
        .map(tid => tracks.find(t => t.id === tid))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));
      const latestPlayed = Math.max(0, ...plTracks.map(t => t.lastPlayedAt || 0));
      const latestAdded = Math.max(0, ...plTracks.map(t => t.addedAt || 0));
      const idTime = p.id.startsWith('pl-') ? parseInt(p.id.replace('pl-', '')) || 0 : 0;
      return {
        kind: 'playlist' as const,
        id: p.id,
        title: p.title,
        subtitle: p.isLikedSongs
          ? `Playlist • ${likedTrackIds.length} songs`
          : p.isLocalFiles
          ? `Playlist • ${p.trackIds.length} local files`
          : `Playlist • ${p.owner}`,
        coverUrl: p.coverUrl,
        isLikedSongs: p.isLikedSongs,
        isLocalFiles: p.isLocalFiles,
        isUserCreated: p.isUserCreated,
        pinned: p.pinned,
        owner: p.owner,
        addedAt: latestAdded || idTime,
        lastPlayedAt: latestPlayed || idTime,
      };
    }),
    ...libraryArtists.map(a => {
      const artTracks = a.trackIds
        .map(tid => tracks.find(t => t.id === tid))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));
      const latestPlayed = Math.max(0, ...artTracks.map(t => t.lastPlayedAt || 0));
      const latestAdded = Math.max(0, ...artTracks.map(t => t.addedAt || 0));
      return {
        kind: 'artist' as const,
        id: a.id,
        title: a.name,
        subtitle: `Artist • ${a.trackIds.length} songs`,
        coverUrl: a.coverUrl,
        owner: a.name,
        addedAt: latestAdded,
        lastPlayedAt: latestPlayed,
      };
    }),
    ...(activeFilter === 'albums'
      ? albums.map(alb => {
          const albTracks = alb.trackIds
            .map(tid => tracks.find(t => t.id === tid))
            .filter((t): t is NonNullable<typeof t> => Boolean(t));
          const latestPlayed = Math.max(0, ...albTracks.map(t => t.lastPlayedAt || 0));
          const latestAdded = Math.max(0, ...albTracks.map(t => t.addedAt || 0));
          return {
            kind: 'album' as const,
            id: alb.id,
            title: alb.name,
            subtitle: `Album • ${alb.artist}`,
            coverUrl: alb.coverUrl,
            owner: alb.artist,
            addedAt: latestAdded,
            lastPlayedAt: latestPlayed,
          };
        })
      : []),
  ];

  if (activeFilter === 'playlists') entries = entries.filter(e => e.kind === 'playlist');
  if (activeFilter === 'artists') entries = entries.filter(e => e.kind === 'artist');
  if (activeFilter === 'albums') entries = entries.filter(e => e.kind === 'album');

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    entries = entries.filter(
      e => e.title.toLowerCase().includes(q) || e.subtitle.toLowerCase().includes(q)
    );
  }

  entries.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    if (sortMode === 'recently-added') {
      return (b.addedAt || 0) - (a.addedAt || 0);
    }
    if (sortMode === 'alphabetical') {
      return a.isLikedSongs ? -1 : b.isLikedSongs ? 1 : a.title.localeCompare(b.title);
    }
    if (sortMode === 'creator') {
      return a.isLikedSongs ? -1 : b.isLikedSongs ? 1 : a.owner.localeCompare(b.owner);
    }
    // 'recents'
    if ((b.lastPlayedAt || 0) !== (a.lastPlayedAt || 0)) {
      return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
    }
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  const isDynamicHover = settings.sidebarMode === 'hover';
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      if (!contextMenu && !createMenuOpen && !sortMenuOpen) {
        setIsHovered(false);
      }
    }, 240);
  };

  const effectiveWidth = isDynamicHover ? 320 : isCollapsed ? 72 : isExpandedWide ? 440 : width;

  return (
    <div
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={
        isDynamicHover
          ? 'hidden md:flex relative h-full w-0 overflow-visible shrink-0 select-none z-40'
          : 'hidden md:flex relative h-full shrink-0 select-none'
      }
    >
      {/* Edge trigger strip when dynamic hover mode is active */}
      {isDynamicHover && (
        <div
          onMouseEnter={handleMouseEnter}
          onClick={() => setIsHovered(prev => !prev)}
          title="Your Library (Hover to reveal)"
          className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-[#1e1e1e]/95 hover:bg-[#282828] border-y border-r border-white/20 hover:border-spotify-green/60 rounded-r-xl py-3.5 px-1.5 flex flex-col items-center gap-1.5 cursor-pointer shadow-2xl backdrop-blur-md transition-all duration-200 group ${
            isHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <LibraryCollapsedIcon size={18} className="text-spotify-muted group-hover:text-spotify-green transition-colors" />
          <ChevronRight size={13} className="text-spotify-muted group-hover:text-white transition-colors animate-pulse" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-bold tracking-wider text-spotify-muted group-hover:text-white uppercase mt-1">
            Library
          </span>
        </div>
      )}

      <input
        ref={m3uInputRef}
        type="file"
        accept=".m3u,.m3u8"
        className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const content = await f.text().catch(() => '');
          if (content) importM3uPlaylist(f.name, content);
        }}
      />
      <aside
        data-testid="Desktop_LeftSidebar_Id"
        style={{
          width: `${effectiveWidth}px`,
          ...(settings.hazyMode
            ? {
                backgroundColor: 'var(--hazy-panel-bg, rgba(14, 14, 20, 0.35))',
                backdropFilter: 'blur(var(--hazy-panel-blur, 20px)) saturate(175%)',
                WebkitBackdropFilter: 'blur(var(--hazy-panel-blur, 20px)) saturate(175%)',
              }
            : {}),
        }}
        className={`${
          isDynamicHover
            ? `absolute left-0 top-0 bottom-0 z-40 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isHovered
                  ? 'translate-x-0 opacity-100 pointer-events-auto'
                  : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'
              }`
            : 'flex flex-col h-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-xl'
        } ${
          settings.hazyMode
            ? 'border border-white/10 shadow-2xl'
            : settings.amoledMode
            ? 'bg-black border border-white/10'
            : 'bg-spotify-surface/95 backdrop-blur-2xl border border-white/[0.08]'
        } rounded-lg flex flex-col h-full`}
      >
        {/* Library Header */}
        <div className={`px-4 pt-3 pb-2 ${isCollapsed ? 'flex flex-col items-center gap-3 px-2' : ''}`}>
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                setIsCollapsed(prev => !prev);
                setIsExpandedWide(false);
              }}
              title={isCollapsed ? 'Expand Your Library' : 'Collapse Your Library'}
              className="flex items-center gap-3 text-spotify-muted hover:text-white transition-colors py-1 cursor-pointer group"
            >
              {isCollapsed ? <LibraryCollapsedIcon size={24} /> : <LibraryExpandedIcon size={24} />}
              {!isCollapsed && (
                <span className="font-bold text-[15px] tracking-tight text-spotify-muted group-hover:text-white transition-colors">
                  Your Library
                </span>
              )}
            </button>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <div ref={createMenuContainerRef} className="relative">
                  <button
                    onClick={() => setCreateMenuOpen(prev => !prev)}
                    title="Create playlist or folder"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#1f1f1f] transition-all cursor-pointer"
                  >
                    <Plus size={18} />
                  </button>

                  {createMenuOpen && (
                    <div className="absolute left-0 top-10 w-72 bg-[#282828] rounded-lg shadow-2xl border border-white/10 p-1.5 text-sm text-white z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => {
                          createPlaylist();
                          setCreateMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 rounded-md hover:bg-white/10 flex items-center gap-3 text-left cursor-pointer transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#3e3e3e]/80 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                          <CreatePlaylistMenuIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[14px] text-white">Playlist</p>
                          <p className="text-[12px] text-spotify-muted">Create a playlist with songs or episodes</p>
                        </div>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        onClick={() => {
                          createFolder();
                          setCreateMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 rounded-md hover:bg-white/10 flex items-center gap-3 text-left cursor-pointer transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#3e3e3e]/80 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                          <CreateFolderMenuIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[14px] text-white">Folder</p>
                          <p className="text-[12px] text-spotify-muted">Organize your playlists</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsExpandedWide(prev => !prev)}
                  title={isExpandedWide ? 'Collapse library' : 'Expand library'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#1f1f1f] transition-all cursor-pointer"
                >
                  <ArrowRight
                    size={16}
                    className={`transition-transform duration-200 ${isExpandedWide ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            )}
          </div>

          {isCollapsed && (
            <button
              onClick={() => createPlaylist()}
              title="Create a new playlist"
              className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-spotify-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus size={18} />
            </button>
          )}

          {/* Filter Chips */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  title="Clear filter"
                  className="w-7 h-7 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-white flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
              {(['playlists', 'artists', 'albums'] as const).map(f => {
                const label = f === 'playlists' ? 'Playlists' : f === 'artists' ? 'Artists' : 'Albums';
                const active = activeFilter === f;
                if (activeFilter !== 'all' && !active) return null;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(active ? 'all' : f)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#242424] text-white hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search & Sort */}
          {!isCollapsed && (
            <div className="flex items-center justify-between mt-3 text-xs text-spotify-muted relative">
              <div className="flex items-center">
                {searchOpen ? (
                  <div className="flex items-center bg-[#242424] rounded-md px-2 py-1.5 w-40">
                    <Search size={14} className="mr-1.5 text-spotify-muted shrink-0" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder="Search in Your Library"
                      className="bg-transparent text-white text-xs w-full focus:outline-none placeholder:text-spotify-muted"
                      autoFocus
                    />
                    {searchText && (
                      <button
                        onClick={() => setSearchText('')}
                        className="text-spotify-muted hover:text-white ml-1 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    title="Search in Your Library"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-muted hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                  >
                    <Search size={16} />
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setSortMenuOpen(prev => !prev)}
                  className="flex items-center gap-1.5 text-spotify-muted hover:text-white text-[13px] font-medium px-2 py-1 rounded transition-all cursor-pointer"
                >
                  <span>
                    {sortMode === 'recents'
                      ? 'Recents'
                      : sortMode === 'recently-added'
                      ? 'Recently added'
                      : sortMode === 'alphabetical'
                      ? 'Alphabetical'
                      : 'Creator'}
                  </span>
                  <List size={16} />
                </button>

                {sortMenuOpen && (
                  <div className="absolute right-0 top-8 w-52 bg-[#282828] rounded-md shadow-2xl border border-white/10 p-1.5 text-[13px] text-white z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 pt-1.5 pb-1 text-[11px] font-bold text-white/80">Sort by</div>
                    {[
                      { id: 'recents', label: 'Recents' },
                      { id: 'recently-added', label: 'Recently added' },
                      { id: 'alphabetical', label: 'Alphabetical' },
                      { id: 'creator', label: 'Creator' },
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSortMode(m.id as SortMode);
                          localStorage.setItem('sidebar_sort_mode', m.id);
                          setSortMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded hover:bg-white/10 flex items-center justify-between cursor-pointer transition-colors ${
                          sortMode === m.id ? 'text-spotify-green font-medium' : 'text-white'
                        }`}
                      >
                        <span>{m.label}</span>
                        {sortMode === m.id && <Check size={16} className="text-spotify-green stroke-[2.5]" />}
                      </button>
                    ))}

                    <div className="my-1.5 border-t border-white/10" />

                    <div className="px-3 pt-0.5 pb-1.5 text-[11px] font-bold text-white/70">View as</div>
                    <div className="bg-[#181818] rounded-lg p-1 grid grid-cols-4 gap-1 mx-1.5 mb-1">
                      {[
                        { id: 'compact', title: 'Compact list', icon: AlignJustify },
                        { id: 'list', title: 'List view', icon: List },
                        { id: 'grid', title: 'Compact grid', icon: Grid3X3 },
                        { id: 'large-grid', title: 'Grid view', icon: Grid2X2 },
                      ].map(v => {
                        const IconComponent = v.icon;
                        const isActive = sidebarViewMode === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSidebarViewMode(v.id as SidebarViewMode);
                              localStorage.setItem('sidebar_view_mode', v.id);
                            }}
                            title={v.title}
                            className={`flex items-center justify-center py-1.5 rounded transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-[#3e3e3e] text-spotify-green shadow-xs'
                                : 'text-spotify-muted hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <IconComponent size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Library Items Scroll List */}
        <div
          className={`flex-1 overflow-y-auto px-2 pb-4 ${
            !isCollapsed && (sidebarViewMode === 'grid' || sidebarViewMode === 'large-grid')
              ? sidebarViewMode === 'large-grid'
                ? 'grid grid-cols-2 gap-3 content-start'
                : 'grid grid-cols-2 lg:grid-cols-3 gap-2 content-start'
              : sidebarViewMode === 'compact'
              ? 'space-y-0.5'
              : 'space-y-1'
          }`}
        >
          {!isCollapsed &&
            (activeFilter === 'all' || activeFilter === 'playlists') &&
            folders.map(folder => {
              const isOpen = expandedFolders[folder.id] ?? true;
              const folderPls = playlists.filter(p => p.folderId === folder.id);
              const isDragOverThis = dragOverFolderId === folder.id;
              const isEditing = editingFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  className={`space-y-0.5 rounded-lg transition-colors ${
                    isDragOverThis ? 'bg-spotify-green/15 ring-2 ring-spotify-green' : ''
                  }`}
                  onDragOver={e => {
                    if (e.dataTransfer.types.includes('application/x-spotify-playlist-id')) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverFolderId(folder.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverFolderId === folder.id) setDragOverFolderId(null);
                  }}
                  onDrop={e => {
                    const plId = e.dataTransfer.getData('application/x-spotify-playlist-id');
                    setDragOverFolderId(null);
                    if (plId) {
                      e.preventDefault();
                      e.stopPropagation();
                      movePlaylistToFolder(plId, folder.id);
                    }
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFolderContextMenu({
                      id: folder.id,
                      name: folder.name,
                      x: Math.min(e.clientX, window.innerWidth - 220),
                      y: Math.min(e.clientY, window.innerHeight - 180),
                    });
                  }}
                >
                  <div
                    onClick={() =>
                      setExpandedFolders(prev => ({ ...prev, [folder.id]: !isOpen }))
                    }
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded bg-[#242424] flex items-center justify-center text-spotify-muted shrink-0 group-hover:text-white transition-colors">
                      <Folder size={22} className="text-spotify-muted group-hover:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingFolderName}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setEditingFolderName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (editingFolderName.trim()) {
                                renameFolder(folder.id, editingFolderName.trim());
                              }
                              setEditingFolderId(null);
                            } else if (e.key === 'Escape') {
                              setEditingFolderId(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingFolderName.trim()) {
                              renameFolder(folder.id, editingFolderName.trim());
                            }
                            setEditingFolderId(null);
                          }}
                          className="bg-[#121212] text-white text-[14px] font-semibold px-1.5 py-0.5 rounded border border-spotify-green focus:outline-none w-full"
                        />
                      ) : (
                        <>
                          <p className="text-[14px] font-semibold text-white truncate">{folder.name}</p>
                          <p className="text-[12px] text-spotify-muted">
                            Folder • {folderPls.length} {folderPls.length === 1 ? 'playlist' : 'playlists'}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          createPlaylist(undefined, folder.id);
                        }}
                        title="Create playlist in folder"
                        className="text-spotify-muted hover:text-white p-1 hover:bg-white/10 rounded cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditingFolderName(folder.name);
                        }}
                        title="Rename folder"
                        className="text-spotify-muted hover:text-white p-1 hover:bg-white/10 rounded cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        title="Delete folder"
                        className="text-spotify-muted hover:text-red-400 p-1 hover:bg-white/10 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {isOpen ? (
                      <ChevronDown size={15} className="text-spotify-muted shrink-0" />
                    ) : (
                      <ChevronRight size={15} className="text-spotify-muted shrink-0" />
                    )}
                  </div>

                  {isOpen &&
                    folderPls.map(pl => (
                      <div
                        key={pl.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('application/x-spotify-playlist-id', pl.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onContextMenu={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            id: pl.id,
                            isUserCreated: pl.isUserCreated,
                            pinned: pl.pinned,
                            x: Math.min(e.clientX, window.innerWidth - 200),
                            y: Math.min(e.clientY, window.innerHeight - 140),
                          });
                        }}
                        onClick={() => navigate({ name: 'playlist', id: pl.id })}
                        className={`flex items-center gap-2.5 pl-6 pr-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                          route.name === 'playlist' && route.id === pl.id
                            ? 'bg-[#242424]'
                            : 'hover:bg-[#1f1f1f]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded bg-[#282828] flex items-center justify-center overflow-hidden shrink-0">
                          {pl.coverUrl ? (
                            <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music size={14} className="text-spotify-muted" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-white truncate flex-1">{pl.title}</span>
                      </div>
                    ))}
                </div>
              );
            })}

          {entries.map(item => {
            const isSelected =
              (item.kind === 'playlist' &&
                ((item.isLikedSongs && route.name === 'liked') ||
                  (route.name === 'playlist' && route.id === item.id))) ||
              (item.kind === 'artist' && route.name === 'artist' && route.id === item.id) ||
              (item.kind === 'album' &&
                route.name === 'album' &&
                route.albumName.toLowerCase() === item.title.toLowerCase());
            const isThisPlaying = isPlaying && item.kind === 'playlist' && activePlaylistId === item.id;
            const canDropTrack = item.kind === 'playlist' && item.isUserCreated;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                draggable={item.kind === 'playlist' && Boolean(item.isUserCreated)}
                onDragStart={e => {
                  if (item.kind === 'playlist' && item.isUserCreated) {
                    e.dataTransfer.setData('application/x-spotify-playlist-id', item.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                onDragOver={e => {
                  if (!canDropTrack) return;
                  if (e.dataTransfer.types.includes('application/x-spotify-track-id')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setDragOverPlaylistId(item.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverPlaylistId === item.id) setDragOverPlaylistId(null);
                }}
                onDrop={e => {
                  if (!canDropTrack) return;
                  const trackId = e.dataTransfer.getData('application/x-spotify-track-id');
                  setDragOverPlaylistId(null);
                  if (trackId) {
                    e.preventDefault();
                    e.stopPropagation();
                    addTrackToPlaylist(item.id, trackId);
                  }
                }}
                onContextMenu={e => {
                  if (item.kind !== 'playlist') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    id: item.id,
                    isUserCreated: item.isUserCreated,
                    pinned: item.pinned,
                    x: Math.min(e.clientX, window.innerWidth - 200),
                    y: Math.min(e.clientY, window.innerHeight - 140),
                  });
                }}
                onClick={() => {
                  if (item.kind === 'artist') {
                    navigate({ name: 'artist', id: item.id });
                  } else if (item.kind === 'album') {
                    navigate({ name: 'album', albumName: item.title, artistName: item.owner });
                  } else if (item.isLikedSongs) {
                    navigate({ name: 'liked' });
                  } else {
                    navigate({ name: 'playlist', id: item.id });
                  }
                }}
                className={
                  !isCollapsed && (sidebarViewMode === 'grid' || sidebarViewMode === 'large-grid')
                    ? `flex flex-col p-2 rounded-lg cursor-pointer transition-colors group relative ${
                        dragOverPlaylistId === item.id
                          ? 'ring-2 ring-spotify-green bg-spotify-green/15'
                          : isSelected
                          ? 'bg-[#242424]'
                          : 'hover:bg-[#1f1f1f]'
                      }`
                    : `flex items-center ${
                        sidebarViewMode === 'compact' ? 'gap-2 px-2 py-1.5' : 'gap-3 p-2'
                      } rounded-md cursor-pointer transition-colors group ${
                        dragOverPlaylistId === item.id
                          ? 'ring-2 ring-spotify-green bg-spotify-green/15'
                          : isSelected
                          ? 'bg-[#242424]'
                          : 'hover:bg-[#1f1f1f]'
                      } ${isCollapsed ? 'justify-center px-1' : ''}`
                }
                title={isCollapsed ? `${item.title} (${item.subtitle})` : undefined}
              >
                <div
                  className={`relative shrink-0 ${
                    !isCollapsed && (sidebarViewMode === 'grid' || sidebarViewMode === 'large-grid')
                      ? 'aspect-square w-full rounded-md overflow-hidden mb-2'
                      : sidebarViewMode === 'compact'
                      ? 'w-7 h-7 rounded overflow-hidden'
                      : 'w-12 h-12 rounded'
                  }`}
                >
                  {item.isLikedSongs ? (
                    <div className="w-full h-full rounded bg-gradient-to-br from-[#450af5] via-[#6033e3] to-[#c4efd9] flex items-center justify-center shadow">
                      <Heart size={sidebarViewMode === 'compact' ? 14 : 20} className="text-white fill-white" />
                    </div>
                  ) : item.isLocalFiles ? (
                    <div className="w-full h-full rounded bg-[#006450] flex items-center justify-center shadow">
                      <FolderOpen size={sidebarViewMode === 'compact' ? 14 : 20} className="text-spotify-green" />
                    </div>
                  ) : item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className={`w-full h-full object-cover shadow ${
                        item.kind === 'artist' ? 'rounded-full' : 'rounded'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-[#282828] flex items-center justify-center text-spotify-muted ${
                        item.kind === 'artist' ? 'rounded-full' : 'rounded'
                      }`}
                    >
                      {item.kind === 'album' ? (
                        <Disc3 size={sidebarViewMode === 'compact' ? 14 : 20} />
                      ) : (
                        <Music size={sidebarViewMode === 'compact' ? 14 : 20} />
                      )}
                    </div>
                  )}

                  {!isCollapsed && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (item.kind === 'playlist') {
                          playPlaylist(item.id);
                        } else if (item.kind === 'artist') {
                          const art = artists.find(a => a.id === item.id);
                          const artTracks = art
                            ? art.trackIds
                                .map(tid => tracks.find(t => t.id === tid))
                                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                            : [];
                          if (artTracks[0]) playTrack(artTracks[0], artTracks, null);
                        } else {
                          const alb = albums.find(a => a.id === item.id);
                          const albTracks = alb
                            ? alb.trackIds
                                .map(tid => tracks.find(t => t.id === tid))
                                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                            : [];
                          if (albTracks[0]) playTrack(albTracks[0], albTracks, null);
                        }
                      }}
                      className="absolute inset-0 bg-black/55 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title={`Play ${item.title}`}
                    >
                      <Play16Icon size={18} className="text-white" />
                    </button>
                  )}
                </div>

                {!isCollapsed &&
                  (sidebarViewMode === 'compact' ? (
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <p
                        className={`text-[13px] font-medium truncate ${
                          isThisPlaying ? 'text-spotify-green' : 'text-white'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[11px] text-spotify-muted truncate shrink-0 max-w-[90px]">
                        {item.kind === 'artist' ? 'Artist' : item.owner}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-[14px] font-medium truncate ${
                            isThisPlaying ? 'text-spotify-green' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </p>
                        {isThisPlaying && <Volume2 size={15} className="text-spotify-green shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-spotify-muted truncate mt-0.5">
                        {item.pinned && (
                          <Pin size={12} className="text-spotify-green fill-spotify-green shrink-0 rotate-45" />
                        )}
                        <span className="truncate">{item.subtitle}</span>
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}

        </div>
      </aside>

      {/* Playlist Sidebar Right-Click Context Menu */}
      {contextMenu && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          className="fixed z-50 w-48 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1.5 text-[13px] text-white"
        >
          <button
            onClick={() => {
              togglePinPlaylist(contextMenu.id);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
          >
            <Pin size={14} className="text-spotify-muted" />
            <span>{contextMenu.pinned ? 'Unpin playlist' : 'Pin playlist'}</span>
          </button>
          {contextMenu.isUserCreated && folders.length > 0 && (
            <>
              <div className="my-1 border-t border-white/10" />
              <div className="px-3.5 py-1 text-[11px] font-bold text-spotify-muted">
                Move to folder
              </div>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    movePlaylistToFolder(contextMenu.id, f.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 truncate cursor-pointer"
                >
                  📁 {f.name}
                </button>
              ))}
              <button
                onClick={() => {
                  movePlaylistToFolder(contextMenu.id, undefined);
                  setContextMenu(null);
                }}
                className="w-full px-3.5 py-1.5 text-left hover:bg-white/10 text-spotify-muted cursor-pointer"
              >
                Remove from folder
              </button>
            </>
          )}
          {contextMenu.isUserCreated && (
            <button
              onClick={() => {
                deletePlaylist(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-white/10 text-red-400 flex items-center gap-2.5 cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete playlist</span>
            </button>
          )}
        </div>
      )}

      {/* Folder Context Menu */}
      {folderContextMenu && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{ left: `${folderContextMenu.x}px`, top: `${folderContextMenu.y}px` }}
          className="fixed z-50 w-52 bg-[#282828] rounded-md shadow-2xl border border-white/10 py-1.5 text-[13px] text-white animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => {
              createPlaylist(undefined, folderContextMenu.id);
              setFolderContextMenu(null);
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
          >
            <Plus size={14} className="text-spotify-muted" />
            <span>Create playlist in folder</span>
          </button>
          <button
            onClick={() => {
              setEditingFolderId(folderContextMenu.id);
              setEditingFolderName(folderContextMenu.name);
              setFolderContextMenu(null);
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
          >
            <Edit2 size={14} className="text-spotify-muted" />
            <span>Rename folder</span>
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={() => {
              deleteFolder(folderContextMenu.id);
              setFolderContextMenu(null);
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete folder</span>
          </button>
        </div>
      )}

      {/* Resize Drag Handle */}
      {!isDynamicHover && (
        <div
          data-testid="LayoutResizer__resize-bar"
          onMouseDown={() => {
            isResizingRef.current = true;
            document.body.style.cursor = 'col-resize';
          }}
          title="Drag to resize Your Library"
          className="w-2 h-full cursor-col-resize flex items-center justify-center group"
        >
          <div className="w-[1px] h-full bg-transparent group-hover:bg-white/40 transition-colors" />
        </div>
      )}
    </div>
  );
};
