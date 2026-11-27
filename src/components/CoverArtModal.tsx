import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Sparkles, Check, Loader2, AlertCircle, Music, Disc, Calendar, Tag } from 'lucide-react';
import {
  searchOnlineCoverArt,
  downloadImageAsDataUrl,
  isGenericArtist,
  isGenericAlbum,
  CoverArtMatch
} from '../utils/coverArtService';
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

  const isSingleTrack = tracks.length === 1;
  const firstTrack = tracks[0];

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<CoverArtMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<CoverArtMatch | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [writeToDisk, setWriteToDisk] = useState(true);
  const [enrichMetadata, setEnrichMetadata] = useState(true);

  // Initialize clean fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      const rawArtist = initialArtist || firstTrack?.artist || '';
      const rawAlbum = initialAlbum || albumName || firstTrack?.album || '';
      const rawTitle = isSingleTrack ? firstTrack?.title || '' : '';

      const cleanArt = isGenericArtist(rawArtist) ? '' : rawArtist;
      const cleanAlb = isGenericAlbum(rawAlbum) ? '' : rawAlbum;
      const cleanTit = rawTitle;

      setArtist(cleanArt);
      setAlbum(cleanAlb);
      setTitle(cleanTit);
      setCandidates([]);
      setSelectedMatch(null);
      setErrorMsg(null);

      void executeSearch(cleanArt, cleanAlb, cleanTit);
    }
  }, [isOpen, initialArtist, initialAlbum, albumName, tracks, isSingleTrack, firstTrack]);

  const executeSearch = useCallback(
    async (artName: string, albName: string, titName: string) => {
      const queryArt = artName.trim();
      const queryAlb = albName.trim();
      const queryTit = titName.trim();

      if (!queryArt && !queryAlb && !queryTit) {
        setErrorMsg('Please enter a song title, artist, or album name to search.');
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const results = await searchOnlineCoverArt({
          artist: queryArt,
          album: queryAlb,
          title: queryTit,
        });

        if (results && results.length > 0) {
          setCandidates(results);
          setSelectedMatch(results[0]);
        } else {
          setCandidates([]);
          setSelectedMatch(null);
          setErrorMsg(
            'No high-confidence artwork found online for these terms. Try adjusting the artist name or song title.'
          );
        }
      } catch (err) {
        console.error('Online cover art search error:', err);
        setErrorMsg('Failed to query online artwork databases. Please check your internet connection.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!selectedMatch?.coverUrl || tracks.length === 0) return;
    setIsApplying(true);

    try {
      let dataUrl: string | null = null;
      if (window.electronAPI?.writeId3Tags && writeToDisk) {
        dataUrl = await downloadImageAsDataUrl(selectedMatch.coverUrl);
      }

      const trackIds = tracks.map(t => t.id);
      const patch: Partial<Pick<Track, 'title' | 'artist' | 'album' | 'genre' | 'year' | 'trackNumber' | 'coverUrl'>> = {
        coverUrl: selectedMatch.coverUrl,
      };

      if (enrichMetadata) {
        if (selectedMatch.artistName) patch.artist = selectedMatch.artistName;
        if (selectedMatch.albumName) patch.album = selectedMatch.albumName;
        if (selectedMatch.releaseYear) patch.year = selectedMatch.releaseYear;
        if (selectedMatch.genre) patch.genre = selectedMatch.genre;
        if (selectedMatch.trackTitle && isSingleTrack) patch.title = selectedMatch.trackTitle;
        if (selectedMatch.trackNumber && isSingleTrack) patch.trackNumber = selectedMatch.trackNumber;
      }

      updateTrackMetadata(trackIds, patch);

      // Embed physical ID3 tags on Windows desktop
      if (window.electronAPI?.writeId3Tags && writeToDisk) {
        for (const tr of tracks) {
          const filePath = tr.sourceKey || tr.id.replace(/^electron-/, '');
          if (filePath && !filePath.startsWith('blob:') && !filePath.startsWith('http')) {
            try {
              await window.electronAPI.writeId3Tags(filePath, {
                ...patch,
                coverUrl: selectedMatch.coverUrl,
                coverDataUrl: dataUrl || selectedMatch.coverUrl,
              });
            } catch (err) {
              console.warn('Could not write ID3 tags/artwork to disk for file:', filePath, err);
            }
          }
        }
      }

      showToast(`Updated details & artwork for ${tracks.length} track(s)`);
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#252525]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center shadow-inner">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Find Cover Art & Metadata</h3>
              <p className="text-xs text-spotify-muted">
                Search verified HD artwork (1000x1000) for {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-spotify-muted hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Search Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isSingleTrack && (
              <div>
                <label className="block text-[10px] font-bold text-spotify-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Music size={12} className="text-spotify-green" /> Song Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void executeSearch(artist, album, title)}
                  placeholder="Song title..."
                  className="w-full bg-[#141414] border border-white/10 focus:border-spotify-green rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-spotify-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Music size={12} className="text-spotify-green" /> Artist Name
              </label>
              <input
                type="text"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void executeSearch(artist, album, title)}
                placeholder="Artist name..."
                className="w-full bg-[#141414] border border-white/10 focus:border-spotify-green rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-spotify-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Disc size={12} className="text-spotify-green" /> Album Name
              </label>
              <input
                type="text"
                value={album}
                onChange={e => setAlbum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void executeSearch(artist, album, title)}
                placeholder="Album name..."
                className="w-full bg-[#141414] border border-white/10 focus:border-spotify-green rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            onClick={() => void executeSearch(artist, album, title)}
            disabled={isLoading}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 active:scale-[0.99] rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin text-spotify-green" /> : <Search size={15} />}
            <span>{isLoading ? 'Searching Apple Music & MusicBrainz...' : 'Search Databases'}</span>
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Candidate Results Grid */}
          {candidates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-spotify-muted">
                  Matching Releases ({candidates.length})
                </span>
                <span className="text-[11px] text-spotify-muted">Click a cover to select</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedMatch?.coverUrl === cand.coverUrl && selectedMatch?.albumName === cand.albumName;
                  return (
                    <div
                      key={`${cand.coverUrl}-${idx}`}
                      onClick={() => setSelectedMatch(cand)}
                      className={`group relative bg-[#141414] p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-spotify-green bg-spotify-green/10 shadow-lg shadow-spotify-green/10'
                          : 'border-white/5 hover:border-white/20 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black/40 mb-2.5 shadow-md">
                        <img
                          src={cand.coverUrl}
                          alt={cand.albumName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-150">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className="bg-black/80 backdrop-blur-sm text-[9px] font-bold px-1.5 py-0.5 rounded text-white/90">
                            {cand.score}% match
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate" title={cand.trackTitle || cand.albumName}>
                          {cand.trackTitle || cand.albumName}
                        </p>
                        <p className="text-[11px] text-spotify-muted truncate mt-0.5" title={cand.artistName}>
                          {cand.artistName}
                        </p>
                        <p className="text-[10px] text-white/40 truncate mt-0.5" title={cand.albumName}>
                          {cand.albumName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-white/30 mt-1">
                          {cand.genre && <span>{cand.genre}</span>}
                          {cand.genre && cand.releaseYear && <span>•</span>}
                          {cand.releaseYear && <span>{cand.releaseYear}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Candidate Metadata Review Pane */}
          {selectedMatch && (
            <div className="bg-[#141414] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-black shrink-0 shadow-lg border border-white/10">
                <img
                  src={selectedMatch.coverUrl}
                  alt={selectedMatch.albumName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-spotify-green bg-spotify-green/10 px-2 py-0.5 rounded-full border border-spotify-green/20">
                    {selectedMatch.source === 'itunes' ? 'Apple Music / iTunes (1000px HD)' : 'Cover Art Archive'}
                  </span>
                  <span className="text-[11px] font-bold text-spotify-green">
                    {selectedMatch.score}% Confidence Match
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white truncate">
                  {selectedMatch.trackTitle || selectedMatch.albumName}
                </h4>
                <p className="text-xs text-spotify-muted truncate">
                  {selectedMatch.artistName} — {selectedMatch.albumName}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/50 pt-0.5">
                  {selectedMatch.genre && (
                    <span className="flex items-center gap-1">
                      <Tag size={11} /> {selectedMatch.genre}
                    </span>
                  )}
                  {selectedMatch.releaseYear && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {selectedMatch.releaseYear}
                    </span>
                  )}
                  {selectedMatch.trackNumber && (
                    <span className="flex items-center gap-1">
                      <Disc size={11} /> Track {selectedMatch.trackNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enrichment & Disk Options */}
          {selectedMatch && (
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-xs text-spotify-muted hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enrichMetadata}
                  onChange={e => setEnrichMetadata(e.target.checked)}
                  className="w-4 h-4 accent-spotify-green cursor-pointer rounded"
                />
                <span>Also enrich missing track details (Artist, Album, Year, Genre, Track #)</span>
              </label>

              {/* Desktop write to disk checkbox */}
              {window.electronAPI && (
                <label className="flex items-center gap-2.5 text-xs text-spotify-muted hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={writeToDisk}
                    onChange={e => setWriteToDisk(e.target.checked)}
                    className="w-4 h-4 accent-spotify-green cursor-pointer rounded"
                  />
                  <span>Permanently embed cover artwork & ID3 tags into local audio file(s) on disk</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#181818] border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-spotify-muted hover:text-white cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleApply()}
            disabled={!selectedMatch || isApplying}
            className="px-6 py-2.5 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            {isApplying ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
            <span>
              {isApplying
                ? 'Applying Details...'
                : `Save & Apply to ${tracks.length} ${tracks.length === 1 ? 'Track' : 'Tracks'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
