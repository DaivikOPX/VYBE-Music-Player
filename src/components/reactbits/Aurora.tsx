import React from 'react';

interface AuroraProps {
  colorStops?: [string, string, string];
  className?: string;
}

/**
 * ReactBits Aurora — lightweight GPU-composited Northern Lights ambient backdrop.
 */
export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ['#1ed760', '#1e3a8a', '#6d28d9'],
  className = '',
}) => {
  const [c1, c2, c3] = colorStops;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div
        className="absolute -top-1/3 -left-1/4 w-[75%] h-[85%] rounded-full blur-[90px] opacity-35 animate-rb-aurora-1"
        style={{ background: `radial-gradient(circle, ${c1}, transparent 70%)` }}
      />
      <div
        className="absolute -top-1/4 -right-1/4 w-[70%] h-[80%] rounded-full blur-[100px] opacity-30 animate-rb-aurora-2"
        style={{ background: `radial-gradient(circle, ${c2}, ${c3} 45%, transparent 75%)` }}
      />
    </div>
  );
};
