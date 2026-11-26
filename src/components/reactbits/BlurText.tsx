import React, { useEffect, useState } from 'react';

interface BlurTextProps {
  text: string;
  className?: string;
  delayMs?: number;
}

/**
 * ReactBits BlurText — crisp word-by-word de-blur reveal for view headings.
 */
export const BlurText: React.FC<BlurTextProps> = ({
  text,
  className = '',
  delayMs = 45,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [text]);

  const words = text.split(' ');

  return (
    <span className={`inline-flex flex-wrap gap-x-[0.26em] ${className}`}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          style={{
            transitionDelay: `${idx * delayMs}ms`,
            filter: visible ? 'blur(0px)' : 'blur(8px)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0px)' : 'translateY(8px)',
          }}
          className="inline-block transition-all duration-500 ease-out"
        >
          {word}
        </span>
      ))}
    </span>
  );
};
