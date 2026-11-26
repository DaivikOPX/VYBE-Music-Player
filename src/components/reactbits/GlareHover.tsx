import React, { useState } from 'react';

interface GlareHoverProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glareColor?: string;
}

/**
 * ReactBits GlareHover — diagonal specular sheen sweep on hover.
 */
export const GlareHover: React.FC<GlareHoverProps> = ({
  children,
  className = '',
  glareColor = 'rgba(255, 255, 255, 0.18)',
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={e => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      className={`relative overflow-hidden ${className}`}
      {...rest}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-transform duration-700 ease-out z-20"
        style={{
          background: `linear-gradient(120deg, transparent 25%, ${glareColor} 50%, transparent 75%)`,
          transform: hovered ? 'translateX(120%)' : 'translateX(-120%)',
        }}
      />
      {children}
    </div>
  );
};
