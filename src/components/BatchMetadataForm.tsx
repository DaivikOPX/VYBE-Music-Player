import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';

interface BatchMetadataFormProps {
  selectedIds: string[];
  onComplete: () => void;
}

/**
 * Reusable batch ID3 / library metadata editor for multi-selected track lists.
 */
export const BatchMetadataForm: React.FC<BatchMetadataFormProps> = ({
  selectedIds,
  onComplete,
}) => {
  const { updateTrackMetadata } = usePlayer();
  const [bulkArtist, setBulkArtist] = useState('');
  const [bulkAlbum, setBulkAlbum] = useState('');
  const [bulkGenre, setBulkGenre] = useState('');
  const [bulkYear, setBulkYear] = useState('');

  const handleApply = () => {
    const patch: Record<string, unknown> = {};
    if (bulkArtist.trim()) patch.artist = bulkArtist.trim();
    if (bulkAlbum.trim()) patch.album = bulkAlbum.trim();
    if (bulkGenre.trim()) patch.genre = bulkGenre.trim();
    if (bulkYear.trim() && Number(bulkYear)) patch.year = Number(bulkYear);
    if (Object.keys(patch).length > 0) {
      updateTrackMetadata(selectedIds, patch as Parameters<typeof updateTrackMetadata>[1]);
    }
    setBulkArtist('');
    setBulkAlbum('');
    setBulkGenre('');
    setBulkYear('');
    onComplete();
  };

  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-bold text-spotify-muted uppercase tracking-wider">
        Batch Metadata Editor (Writes tags to library &amp; disk)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <input
          type="text"
          value={bulkArtist}
          onChange={e => setBulkArtist(e.target.value)}
          placeholder="Set Artist..."
          className="bg-[#242424] text-white px-2.5 py-1.5 rounded border border-white/10 focus:outline-none"
        />
        <input
          type="text"
          value={bulkAlbum}
          onChange={e => setBulkAlbum(e.target.value)}
          placeholder="Set Album..."
          className="bg-[#242424] text-white px-2.5 py-1.5 rounded border border-white/10 focus:outline-none"
        />
        <input
          type="text"
          value={bulkGenre}
          onChange={e => setBulkGenre(e.target.value)}
          placeholder="Set Genre..."
          className="bg-[#242424] text-white px-2.5 py-1.5 rounded border border-white/10 focus:outline-none"
        />
        <input
          type="number"
          value={bulkYear}
          onChange={e => setBulkYear(e.target.value)}
          placeholder="Set Year..."
          className="bg-[#242424] text-white px-2.5 py-1.5 rounded border border-white/10 focus:outline-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={handleApply}
          className="px-4 py-1.5 rounded-full bg-spotify-green text-black text-xs font-bold cursor-pointer hover:scale-102 transition-transform"
        >
          Apply Metadata to {selectedIds.length} Tracks
        </button>
      </div>
    </div>
  );
};
