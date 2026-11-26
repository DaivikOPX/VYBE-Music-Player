import React, { useRef, useState } from 'react';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
  showGlare?: boolean;
  onClick?: () => void;
}

/**
 * ReactBits TiltedCard — 3D cursor-reactive tilt + soft specular glare.
 */
export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  rotateAmplitude = 10,
  scaleOnHover = 1.03,
  showGlare = true,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)');
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 2 * rotateAmplitude;
    const rotX = -(py - 0.5) * 2 * rotateAmplitude;
    setTransform(
      `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${scaleOnHover})`
    );
    setGlare({ x: px * 100, y: py * 100, opacity: 0.22 });
  };

  const handleLeave = () => {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)');
    setGlare(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{ transform, transformStyle: 'preserve-3d' }}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
      {showGlare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200 z-20"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.45), transparent 65%)`,
          }}
        />
      )}
    </div>
  );
};
