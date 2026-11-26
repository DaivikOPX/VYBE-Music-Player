import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Play,
  ListPlus,
  Search,
  X,
  ExternalLink,
  Music,
  FileAudio,
  Plus,
  RefreshCw,
  HardDrive,
  FolderTree as FolderTreeIcon,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types';
import { TrackRow } from './TrackRow';

interface FolderNode {
  id: string;
  name: string;
  fullPath: string;
  subfolders: Map<string, FolderNode>;
  tracks: Track[];
  totalTrackCount: number;
}

export const FolderTreeView: React.FC = () => {
  const {
    tracks,
    playTrack,
    addToQueue,
    pickNativeAudioFolder,
    pickNativeAudioFiles,
    rescanWatchedFolders,
    watchedFolders,
    isImporting,
    showToast,
    settings,
  } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Build the hierarchical folder tree from all tracks' physical sourceKey or synthetic path
  const { rootNodes, totalFoldersCount } = useMemo(() => {
    const roots = new Map<string, FolderNode>();
    let folderCount = 0;

    for (const track of tracks) {
      let rawPath = track.sourceKey || '';
      if (rawPath.startsWith('idb:music-files::')) {
        rawPath = rawPath.replace('idb:music-files::', '');
      }

      // If no disk path is available, group under "Indexed & Imported Music" / album
      if (!rawPath || (!rawPath.includes('/') && !rawPath.includes('\\'))) {
        rawPath = `Music Library/${track.album || 'Unknown Album'}/${track.title || 'Unknown Track'}`;
      }

      // Normalize slashes
      const normalized = rawPath.replace(/\\/g, '/');
      const segments = normalized.split('/').filter(Boolean);

      // The last segment is the filename
      const folderSegments = segments.slice(0, -1);
      if (folderSegments.length === 0) {
        folderSegments.push('Root Directory');
      }

      // Build or traverse the tree
      let currentMap = roots;
      let pathAccum = '';

      for (let i = 0; i < folderSegments.length; i++) {
        const seg = folderSegments[i];
        pathAccum = pathAccum ? `${pathAccum}/${seg}` : seg;

        if (!currentMap.has(seg)) {
          folderCount++;
          currentMap.set(seg, {
            id: pathAccum,
            name: seg,
            fullPath: pathAccum,
            subfolders: new Map(),
            tracks: [],
            totalTrackCount: 0,
          });
        }

        const node = currentMap.get(seg)!;
        node.totalTrackCount++;

        if (i === folderSegments.length - 1) {
          node.tracks.push(track);
        } else {
          currentMap = node.subfolders;
        }
      }
    }

    // Convert map to sorted array
    const sortedRoots = Array.from(roots.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { rootNodes: sortedRoots, totalFoldersCount: folderCount };
  }, [tracks]);

  // Recursively collect all tracks under a node
  const getAllTracksUnderNode = (node: FolderNode): Track[] => {
    const list = [...node.tracks];
    for (const sub of node.subfolders.values()) {
      list.push(...getAllTracksUnderNode(sub));
    }
    return list;
  };

  const handlePlayFolder = (node: FolderNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const folderTracks = getAllTracksUnderNode(node);
    if (folderTracks.length > 0) {
      playTrack(folderTracks[0], folderTracks, null);
      showToast(`Playing ${folderTracks.length} tracks from "${node.name}"`);
    } else {
      showToast('No tracks in this folder to play');
    }
  };

  const handleQueueFolder = (node: FolderNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const folderTracks = getAllTracksUnderNode(node);
    if (folderTracks.length > 0) {
      folderTracks.forEach(t => addToQueue(t));
      showToast(`Added ${folderTracks.length} tracks to queue`);
    }
  };

  const handleOpenInExplorer = (node: FolderNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.electronAPI?.showInExplorer) {
      // Restore Windows backslashes if on Windows
      const winPath = node.fullPath.replace(/\//g, '\\');
      window.electronAPI.showInExplorer(winPath);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    const allIds: Record<string, boolean> = {};
    const collect = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        allIds[n.id] = true;
        collect(Array.from(n.subfolders.values()));
      }
    };
    collect(rootNodes);
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Node renderer
  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isExpanded = Boolean(expandedNodes[node.id]) || Boolean(searchQuery.trim());
    const subfolderList = Array.from(node.subfolders.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Filter tracks by search query if any
    const filteredTracks = searchQuery.trim()
      ? node.tracks.filter(
          t =>
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.album.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : node.tracks;

    const hasVisibleContent =
      !searchQuery.trim() ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      filteredTracks.length > 0 ||
      subfolderList.length > 0;

    if (!hasVisibleContent) return null;

    return (
      <div key={node.id} className="select-none">
        {/* Folder Header Row */}
        <div
          onClick={() => toggleExpand(node.id)}
          className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-white"
          style={{ paddingLeft: `${Math.max(12, depth * 22 + 12)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={e => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="p-1 text-spotify-muted hover:text-white rounded"
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>

            {isExpanded ? (
              <FolderOpen size={18} className="text-spotify-green shrink-0" />
            ) : (
              <Folder size={18} className="text-amber-400 shrink-0" />
            )}

            <span className="font-semibold text-sm truncate text-white group-hover:text-white">
              {node.name}
            </span>

            <span className="text-[11px] font-medium text-white/50 bg-white/10 px-2 py-0.5 rounded-full shrink-0">
              {node.totalTrackCount} {node.totalTrackCount === 1 ? 'song' : 'songs'}
            </span>
          </div>

          {/* Folder Quick Actions */}
          <div
            className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => handlePlayFolder(node, e)}
              title={`Play folder "${node.name}"`}
              className="p-1.5 rounded-full bg-spotify-green text-black hover:scale-105 transition-transform cursor-pointer"
            >
              <Play size={13} className="ml-0.5 fill-black" />
            </button>

            <button
              onClick={e => handleQueueFolder(node, e)}
              title="Add all songs in folder to queue"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <ListPlus size={14} />
            </button>

            {window.electronAPI && (
              <button
                onClick={e => handleOpenInExplorer(node, e)}
                title="Open folder in File Explorer"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <ExternalLink size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Content: Subfolders and Child Tracks */}
        {isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {subfolderList.map(sub => renderFolderNode(sub, depth + 1))}

            {filteredTracks.map((tr, idx) => (
              <div
                key={tr.id}
                style={{ paddingLeft: `${Math.max(28, (depth + 1) * 22 + 28)}px` }}
                className="pr-2"
              >
                <TrackRow track={tr} index={idx} contextList={filteredTracks} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const baseBg = settings.amoledMode ? '#000000' : '#121212';

  return (
    <div
      className="min-h-full pb-32 text-white"
      style={{
        background: `linear-gradient(to bottom, #1e1b4b 0%, ${baseBg} 280px)`,
      }}
    >
      {/* Header Banner */}
      <div className="px-6 pt-10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-spotify-green uppercase tracking-wider mb-2">
            <FolderTreeIcon size={16} />
            <span>Local Music Hierarchy</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
            Folder Explorer
          </h1>
          <p className="text-sm text-spotify-muted">
            Browse and play your physical music collection organized exactly as it lives on your disk.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-white/70">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <HardDrive size={13} className="text-spotify-green" />
              <span>{rootNodes.length} Root Directories</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <Folder size={13} className="text-amber-400" />
              <span>{totalFoldersCount} Folders</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <Music size={13} className="text-blue-400" />
              <span>{tracks.length} Total Tracks</span>
            </span>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => void pickNativeAudioFolder()}
            disabled={isImporting}
            className="px-4 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black font-bold text-xs inline-flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} />
            <span>Import Folder</span>
          </button>

          <button
            onClick={() => void pickNativeAudioFiles()}
            disabled={isImporting}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileAudio size={15} />
            <span>Add Audio Files</span>
          </button>

          {watchedFolders.length > 0 && (
            <button
              onClick={() => void rescanWatchedFolders()}
              disabled={isImporting}
              title="Rescan watched folders on disk"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={isImporting ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Expand/Collapse Bar */}
      <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 bg-[#121212]/90 backdrop-blur-md z-20 border-b border-white/5">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-spotify-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search folders or songs..."
            className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white text-xs pl-9 pr-8 py-2 rounded-full outline-none focus:ring-1 focus:ring-spotify-green placeholder:text-spotify-muted transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-spotify-muted hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleExpandAll}
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="px-4 md:px-6 pt-4">
        {rootNodes.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <FolderTreeIcon size={56} className="mx-auto text-spotify-muted/50" />
            <h3 className="text-lg font-bold text-white">No Music Folders Loaded</h3>
            <p className="text-sm text-spotify-muted max-w-md mx-auto">
              Import a music folder or drag-and-drop audio files into VYBE to explore your tracks in a full directory tree.
            </p>
            <button
              onClick={() => void pickNativeAudioFolder()}
              className="px-5 py-2.5 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
            >
              <Plus size={16} />
              <span>Select Music Folder</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#181818]/60 border border-white/10 rounded-xl p-2 md:p-3 divide-y divide-white/5">
            {rootNodes.map(root => renderFolderNode(root, 0))}
          </div>
        )}
      </div>
    </div>
  );
};
