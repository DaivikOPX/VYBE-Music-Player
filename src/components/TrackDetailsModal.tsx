import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Trash2,
  Check,
  Music,
  Info,
  HardDrive,
} from 'lucide-react';
import { Track } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface TrackDetailsModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export const TrackDetailsModal: React.FC<TrackDetailsModalProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const { updateTrackMetadata, renameTrackFile, showToast } = usePlayer();
  const [draftTitle, setDraftTitle] = useState(track.title);
  const [draftArtist, setDraftArtist] = useState(track.artist);
  const [draftAlbum, setDraftAlbum] = useState(track.album);
  const [draftGenre, setDraftGenre] = useState(track.genre || '');
  const [draftYear, setDraftYear] = useState(track.year ? String(track.year) : '');
  const [draftTrackNumber, setDraftTrackNumber] = useState(track.trackNumber ? String(track.trackNumber) : '');
  const [draftCover, setDraftCover] = useState(track.coverUrl || '');
  const [draftExplicit, setDraftExplicit] = useState(Boolean(track.explicit));
  const [isRenamingOnDisk, setIsRenamingOnDisk] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 500;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setDraftCover(dataUrl);
          showToast('Cover photo staged. Click Save to apply.');
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    const newTitle = draftTitle.trim() || track.title;
    const patch = {
      title: newTitle,
      artist: draftArtist.trim() || track.artist,
      album: draftAlbum.trim() || track.album,
      genre: draftGenre.trim() || undefined,
      year: draftYear.trim() ? Number(draftYear) || undefined : undefined,
      trackNumber: draftTrackNumber.trim() ? Number(draftTrackNumber) || undefined : undefined,
      coverUrl: draftCover || undefined,
      explicit: draftExplicit,
    };

    // If title changed and user wants disk rename
    if (newTitle !== track.title && isRenamingOnDisk) {
      await renameTrackFile(track.id, newTitle);
    }

    updateTrackMetadata([track.id], patch);
    onClose();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return '-:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 w-full max-w-xl text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-spotify-green/20 flex items-center justify-center text-spotify-green">
              <Info size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">Song Details & Cover Art</h3>
              <p className="text-xs text-spotify-muted">Edit metadata, upload custom photo, and rename file on disk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-spotify-muted hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Section: Cover Photo & Renaming */}
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {/* Cover Photo Area */}
          <div className="relative group shrink-0">
            <div className="w-36 h-36 rounded-xl overflow-hidden bg-[#282828] border border-white/15 flex items-center justify-center shadow-lg">
              {draftCover ? (
                <img src={draftCover} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <Music size={42} className="text-spotify-muted" />
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload song cover or photo"
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 rounded-xl cursor-pointer text-white"
            >
              <Camera size={22} />
              <span className="text-[11px] font-bold">Change Photo</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {draftCover && (
              <button
                onClick={() => setDraftCover('')}
                className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
              >
                <Trash2 size={12} /> Remove photo
              </button>
            )}
          </div>

          {/* Core Info & Rename */}
          <div className="flex-1 w-full space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
                Song Title / File Name
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="Song Title"
                className="w-full bg-[#282828] px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-spotify-green text-sm font-semibold"
              />
            </div>

            {/* Rename on Disk Checkbox */}
            {track.sourceKey && !track.sourceKey.startsWith('idb:') && (
              <label className="flex items-center gap-2 text-xs text-spotify-muted hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRenamingOnDisk}
                  onChange={e => setIsRenamingOnDisk(e.target.checked)}
                  className="rounded accent-spotify-green"
                />
                <span>Sync rename with local storage file on hard drive</span>
              </label>
            )}

            {/* Explicit Badge Checkbox */}
            <label className="flex items-center gap-2 text-xs text-spotify-muted hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draftExplicit}
                onChange={e => setDraftExplicit(e.target.checked)}
                className="rounded accent-spotify-green"
              />
              <span className="flex items-center gap-1.5">
                <span className="bg-[#b3b3b3] text-black text-[9px] font-bold rounded-[2px] w-3.5 h-3.5 inline-flex items-center justify-center leading-none">
                  E
                </span>
                <span>Mark as Explicit content</span>
              </span>
            </label>

            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
                Artist
              </label>
              <input
                type="text"
                value={draftArtist}
                onChange={e => setDraftArtist(e.target.value)}
                placeholder="Artist name"
                className="w-full bg-[#282828] px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-spotify-green text-xs"
              />
            </div>
          </div>
        </div>

        {/* Album & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-white/5">
          <div>
            <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
              Album
            </label>
            <input
              type="text"
              value={draftAlbum}
              onChange={e => setDraftAlbum(e.target.value)}
              placeholder="Album title"
              className="w-full bg-[#282828] px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-spotify-green"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
              Genre
            </label>
            <input
              type="text"
              value={draftGenre}
              onChange={e => setDraftGenre(e.target.value)}
              placeholder="e.g. Pop, Rock, Electronic"
              className="w-full bg-[#282828] px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-spotify-green"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
              Release Year
            </label>
            <input
              type="number"
              value={draftYear}
              onChange={e => setDraftYear(e.target.value)}
              placeholder="e.g. 2024"
              className="w-full bg-[#282828] px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-spotify-green"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
              Track Number
            </label>
            <input
              type="number"
              value={draftTrackNumber}
              onChange={e => setDraftTrackNumber(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-[#282828] px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-spotify-green"
            />
          </div>
        </div>

        {/* Audio File Tech Specs (Read-Only) */}
        <div className="p-3 rounded-xl bg-[#141414] border border-white/5 space-y-1.5 text-[11px] text-spotify-muted">
          <div className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
            <HardDrive size={13} className="text-spotify-green" />
            <span>Audio File Properties</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>Format / Codec: <span className="text-white font-medium">{track.codec || 'MPEG Audio'}</span></div>
            <div>Bitrate: <span className="text-white font-medium">{track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'Unknown'}</span></div>
            <div>Sample Rate: <span className="text-white font-medium">{track.sampleRate ? `${track.sampleRate} Hz` : '44,100 Hz'}</span></div>
            <div>Duration: <span className="text-white font-medium">{formatDuration(track.duration)}</span></div>
            <div>File Size: <span className="text-white font-medium">{formatFileSize(track.fileSize)}</span></div>
            <div>Plays: <span className="text-white font-medium">{track.playCount || 0} times</span></div>
          </div>
          {track.sourceKey && (
            <div className="pt-1.5 text-[10px] truncate text-white/50 border-t border-white/5">
              Source: <span className="text-white/80">{track.sourceKey}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold cursor-pointer transition-transform hover:scale-102"
          >
            <Check size={14} />
            Save Details & Photo
          </button>
        </div>
      </div>
    </div>
  );
};
