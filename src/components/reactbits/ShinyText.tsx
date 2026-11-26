import React from 'react';

interface ShinyTextProps {
  text: string;
  className?: string;
}

/**
 * ReactBits ShinyText — metallic light sweep over subtle badge labels.
 */
export const ShinyText: React.FC<ShinyTextProps> = ({ text, className = '' }) => {
  return (
    <span
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(255,255,255,0.6) 40%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.6) 60%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      }}
      className={`text-transparent inline-block animate-rb-shine ${className}`}
    >
      {text}
    </span>
  );
};
