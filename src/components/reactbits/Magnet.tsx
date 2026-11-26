import React, { useRef, useState } from 'react';

interface MagnetProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const Magnet: React.FC<MagnetProps> = ({
  children,
  className = '',
  strength = 0.2,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={e => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
        setPos({ x: dx, y: dy });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: pos.x === 0 && pos.y === 0 ? 'transform 350ms cubic-bezier(0.22,1,0.36,1)' : 'none',
      }}
      className={`inline-flex ${className}`}
    >
      {children}
    </div>
  );
};
