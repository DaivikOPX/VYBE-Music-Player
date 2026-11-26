import React, { useEffect, useRef } from 'react';

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  sparkRadius?: number;
  className?: string;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

/**
 * ReactBits ClickSpark — crisp radial spark burst on clicks/taps.
 */
export const ClickSpark: React.FC<ClickSparkProps> = ({
  children,
  sparkColor = '#1ed760',
  sparkCount = 8,
  sparkRadius = 18,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const box = containerRef.current;
      if (canvas && box) {
        const w = box.clientWidth;
        const h = box.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const duration = 380;
          sparksRef.current = sparksRef.current.filter(sp => {
            const elapsed = now - sp.startTime;
            if (elapsed >= duration) return false;
            const p = elapsed / duration;
            const eased = 1 - Math.pow(1 - p, 2);
            const dist = eased * sparkRadius;
            const len = (1 - eased) * 7;
            const x1 = sp.x + dist * Math.cos(sp.angle);
            const y1 = sp.y + dist * Math.sin(sp.angle);
            const x2 = sp.x + (dist + len) * Math.cos(sp.angle);
            const y2 = sp.y + (dist + len) * Math.sin(sp.angle);
            ctx.strokeStyle = sparkColor;
            ctx.globalAlpha = 1 - eased;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            return true;
          });
          ctx.globalAlpha = 1;
        }
      }
      if (sparksRef.current.length > 0) {
        raf = requestAnimationFrame(draw);
      }
    };

    const el = containerRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      for (let i = 0; i < sparkCount; i++) {
        sparksRef.current.push({
          x,
          y,
          angle: (2 * Math.PI * i) / sparkCount,
          startTime: now,
        });
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(raf);
    };
  }, [sparkColor, sparkCount, sparkRadius]);

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full z-30"
      />
      {children}
    </div>
  );
};
