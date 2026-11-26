import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  colors = ['#1ed760', '#a7f3d0', '#38bdf8', '#1ed760'],
  animationSpeed = 6,
}) => {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '300% 100%',
        animation: `rb-gradient ${animationSpeed}s ease infinite`,
      }}
    >
      {children}
    </span>
  );
};
