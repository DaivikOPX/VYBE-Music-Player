import React from 'react';

interface FluidAuroraProps {
  colorStops?: [string, string, string, string?];
  className?: string;
  opacity?: number;
}

/**
 * ReactBits FluidAurora — Multi-chromatic GPU-composited liquid mesh background
 * Creates the signature Apple Music Sing / Spotify fluid ambient aurora effect.
 */
export const FluidAurora: React.FC<FluidAuroraProps> = ({
  colorStops = ['#1ed760', '#1e3a8a', '#9333ea', '#ec4899'],
  className = '',
  opacity = 0.45,
}) => {
  const [c1, c2, c3, c4 = '#0f172a'] = colorStops;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Orb 1 - Top Left Primary Anchor */}
      <div
        className="absolute -top-[25%] -left-[20%] w-[90%] h-[95%] rounded-full blur-[110px] animate-rb-aurora-1"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${c1} 0%, transparent 70%)`,
        }}
      />

      {/* Orb 2 - Top Right Harmonic Ambient */}
      <div
        className="absolute -top-[15%] -right-[25%] w-[85%] h-[90%] rounded-full blur-[120px] animate-rb-aurora-2"
        style={{
          background: `radial-gradient(circle at 60% 30%, ${c2} 0%, ${c3} 45%, transparent 75%)`,
        }}
      />

      {/* Orb 3 - Center Bottom Liquid Drift */}
      <div
        className="absolute bottom-[-20%] left-[15%] w-[80%] h-[85%] rounded-full blur-[130px] animate-rb-aurora-3"
        style={{
          background: `radial-gradient(circle at 50% 60%, ${c3} 0%, ${c4} 50%, transparent 80%)`,
        }}
      />

      {/* Ambient Vignette & Grain Filter */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none" />
    </div>
  );
};
