import React from 'react';

interface StarBorderProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  speed?: string;
  onClick?: () => void;
  title?: string;
}

export const StarBorder: React.FC<StarBorderProps> = ({
  children,
  className = '',
  color = '#1ed760',
  speed = '5s',
  onClick,
  title,
}) => {
  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative inline-block overflow-hidden rounded-full p-[1.5px] ${className}`}
    >
      <div
        className="animate-star-bottom pointer-events-none absolute -bottom-2 -right-3/4 h-1/2 w-[300%] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 15%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="animate-star-top pointer-events-none absolute -left-3/4 -top-2 h-1/2 w-[300%] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 15%)`,
          animationDuration: speed,
        }}
      />
      <div className="relative z-10 rounded-full">{children}</div>
    </div>
  );
};
