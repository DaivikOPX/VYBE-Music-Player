import React, { useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import { TrackRow } from './TrackRow';
import { usePlayer } from '../context/PlayerContext';

interface VirtualizedTrackListProps {
  tracks: Track[];
  contextList: Track[];
  playlistId?: string | null;
  canRemoveFromPlaylist?: boolean;
  draggableReorder?: boolean;
  onReorderDrop?: (fromIdx: number, toIdx: number) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (trackId: string) => void;
}

const OVERSCAN = 6;
const THRESHOLD = 50; // Only virtualize if track count exceeds 50

export const VirtualizedTrackList: React.FC<VirtualizedTrackListProps> = ({
  tracks,
  contextList,
  playlistId = null,
  canRemoveFromPlaylist = false,
  draggableReorder = false,
  onReorderDrop,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
}) => {
  const { settings } = usePlayer();
  const rowHeight = settings.compactMode ? 42 : 56;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [containerOffsetTop, setContainerOffsetTop] = useState(0);

  // Directly render small lists without virtualization overhead
  const shouldVirtualize = tracks.length > THRESHOLD;

  useEffect(() => {
    if (!shouldVirtualize) return;

    const el = containerRef.current;
    if (!el) return;

    // Find the nearest scrollable parent
    const scrollParent = el.closest('.overflow-y-auto') as HTMLElement | null;
    const target = scrollParent || window;

    const updateMeasurements = () => {
      if (scrollParent) {
        setScrollTop(scrollParent.scrollTop);
        setViewportHeight(scrollParent.clientHeight);
        const rect = el.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        setContainerOffsetTop(rect.top - parentRect.top + scrollParent.scrollTop);
      } else {
        setScrollTop(window.scrollY);
        setViewportHeight(window.innerHeight);
        const rect = el.getBoundingClientRect();
        setContainerOffsetTop(rect.top + window.scrollY);
      }
    };

    updateMeasurements();

    const onScroll = () => {
      if (scrollParent) {
        setScrollTop(scrollParent.scrollTop);
      } else {
        setScrollTop(window.scrollY);
      }
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateMeasurements);

    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [shouldVirtualize, tracks.length]);

  if (!shouldVirtualize) {
    return (
      <div className="space-y-0.5">
        {tracks.map((track, idx) => (
          <TrackRow
            key={track.id}
            track={track}
            index={idx}
            contextList={contextList}
            playlistId={playlistId}
            canRemoveFromPlaylist={canRemoveFromPlaylist}
            draggableReorder={draggableReorder}
            onReorderDrop={onReorderDrop}
            selectable={selectable}
            selected={selectedIds.includes(track.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    );
  }

  // Calculate virtual window
  const relativeScroll = Math.max(0, scrollTop - containerOffsetTop);
  const startIndex = Math.max(0, Math.floor(relativeScroll / rowHeight) - OVERSCAN);
  const endIndex = Math.min(
    tracks.length,
    Math.ceil((relativeScroll + viewportHeight) / rowHeight) + OVERSCAN
  );

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = (tracks.length - endIndex) * rowHeight;
  const visibleTracks = tracks.slice(startIndex, endIndex);

  return (
    <div ref={containerRef} className="relative w-full">
      {topSpacerHeight > 0 && <div style={{ height: `${topSpacerHeight}px` }} />}
      <div className="space-y-0.5">
        {visibleTracks.map((track, idx) => {
          const actualIndex = startIndex + idx;
          return (
            <TrackRow
              key={track.id}
              track={track}
              index={actualIndex}
              contextList={contextList}
              playlistId={playlistId}
              canRemoveFromPlaylist={canRemoveFromPlaylist}
              draggableReorder={draggableReorder}
              onReorderDrop={onReorderDrop}
              selectable={selectable}
              selected={selectedIds.includes(track.id)}
              onToggleSelect={onToggleSelect}
            />
          );
        })}
      </div>
      {bottomSpacerHeight > 0 && <div style={{ height: `${bottomSpacerHeight}px` }} />}
    </div>
  );
};
