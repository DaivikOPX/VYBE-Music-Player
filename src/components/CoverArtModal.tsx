import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, Check, Loader2, AlertCircle } from 'lucide-react';
import { fetchOnlineCoverArt, downloadImageAsDataUrl, CoverArtMatch } from '../utils/coverArtService';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types';

interface CoverArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  initialArtist?: string;
  initialAlbum?: string;
  albumName?: string;
}

export const CoverArtModal: React.FC<CoverArtModalProps> = ({
  isOpen,
  onClose,
  tracks,
  initialArtist = '',
  initialAlbum = '',
  albumName,
}) => {
  const { updateTrackMetadata, showToast } = usePlayer();

  const [artist, setArtist] = useState(initialArtist);
  const [album, setAlbum] = useState(initialAlbum || albumName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [match, setMatch] = useState<CoverArtMatch | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [writeToDisk, setWriteToDisk] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setArtist(initialArtist || tracks[0]?.artist || '');
      setAlbum(initialAlbum || albumName || tracks[0]?.album || '');
      setMatch(null);
      setErrorMsg(null);
      void handleSearch(initialArtist || tracks[0]?.artist || '', initialAlbum || albumName || tracks[0]?.album || '');
    }
  }, [isOpen, initialArtist, initialAlbum, albumName, tracks]);

  if (!isOpen) return null;

  const handleSearch = async (artName = artist, albName = album) => {
    if (!artName.trim() && !albName.trim()) {
      setErrorMsg('Please enter an artist or album name to search.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchOnlineCoverArt({
        artist: artName,
        album: albName,
        title: tracks.length === 1 ? tracks[0]?.title : undefined,
      });
      if (res) {
        setMatch(res);
      } else {
        setErrorMsg('No matching album artwork found online. Try adjusting the search terms.');
      }
    } catch {
      setErrorMsg('Failed to query online artwork database. Check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!match?.coverUrl || tracks.length === 0) return;
    setIsApplying(true);

    try {
      let dataUrl: string | null = null;
      if (window.electronAPI?.writeId3Tags && writeToDisk) {
        dataUrl = await downloadImageAsDataUrl(match.coverUrl);
      }

      const trackIds = tracks.map(t => t.id);
      updateTrackMetadata(trackIds, { coverUrl: match.coverUrl });

      // Physical ID3 file update on Windows desktop
      if (window.electronAPI?.writeId3Tags && dataUrl) {
        for (const tr of tracks) {
          const filePath = tr.sourceKey || tr.id.replace(/^electron-/, '');
          if (filePath && !filePath.startsWith('blob:') && !filePath.startsWith('http')) {
            try {
              await window.electronAPI.writeId3Tags(filePath, {
                coverDataUrl: dataUrl,
              });
            } catch (err) {
              console.warn('Could not write cover art to disk for file:', filePath, err);
            }
          }
        }
      }

      showToast(`Updated cover art for ${tracks.length} track(s)`);
      onClose();
    } catch (err) {
      console.error('Error applying cover art:', err);
      showToast('Error applying cover art');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#222222] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Find Cover Art Online</h3>
              <p className="text-xs text-spotify-muted">
                Search high-resolution artwork for {tracks.length} track(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-spotify-muted hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Search Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase mb-1">
                Artist
              </label>
              <input
                type="text"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Artist name..."
                className="w-full bg-[#181818] border border-white/10 focus:border-spotify-green rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase mb-1">
                Album or Song Title
              </label>
              <input
                type="text"
                value={album}
                onChange={e => setAlbum(e.target.value)}
                placeholder="Album or song name..."
                className="w-full bg-[#181818] border border-white/10 focus:border-spotify-green rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => void handleSearch()}
            disabled={isLoading}
            className="w-full py-2 bg-white/10 hover:bg-white/20 active:scale-[0.99] rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>{isLoading ? 'Searching Databases...' : 'Search Artwork'}</span>
          </button>

          {/* Result Preview */}
          {match && (
            <div className="bg-[#181818] border border-white/10 rounded-xl p-4 flex gap-4 items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-black shrink-0 shadow-lg border border-white/10">
                <img
                  src={match.coverUrl}
                  alt={match.albumName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-spotify-green bg-spotify-green/10 px-2 py-0.5 rounded-full border border-spotify-green/20">
                  {match.source === 'itunes' ? 'Apple Music / iTunes (600px)' : 'Cover Art Archive'}
                </span>
                <h4 className="font-bold text-sm text-white truncate">{match.albumName}</h4>
                <p className="text-xs text-spotify-muted truncate">{match.artistName}</p>
                {match.releaseYear && (
                  <p className="text-[11px] text-white/40">Release Year: {match.releaseYear}</p>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Desktop write to disk checkbox */}
          {window.electronAPI && match && (
            <label className="flex items-center gap-2.5 text-xs text-spotify-muted hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={writeToDisk}
                onChange={e => setWriteToDisk(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
              <span>Permanently embed cover into local audio file(s) ID3 tag on disk</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleApply()}
            disabled={!match || isApplying}
            className="px-5 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-all"
          >
            {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>{isApplying ? 'Applying...' : 'Apply Artwork'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
