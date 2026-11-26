import React, { useEffect, useState } from 'react';

interface CountUpProps {
  to: number;
  durationMs?: number;
  className?: string;
}

/**
 * ReactBits CountUp — smooth ease-out counter animation.
 */
export const CountUp: React.FC<CountUpProps> = ({
  to,
  durationMs = 650,
  className = '',
}) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (to <= 0) {
      setVal(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);

  return <span className={`tabular-nums ${className}`}>{val}</span>;
};
