import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

interface TheaterVisualizerProps {
  accentColor?: string;
}

export const TheaterVisualizer: React.FC<TheaterVisualizerProps> = ({ accentColor }) => {
  const { isPlaying, getFrequencyData, getWaveformData, settings } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef<number[]>(new Array(28).fill(0.08));
  const style = settings.visualizerStyle || 'bars';

  useEffect(() => {
    let raf = 0;
    const bins = new Uint8Array(64);
    const barCount = 28;
    const color = accentColor && accentColor !== '#282828' ? accentColor : '#1ed760';

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          if (style === 'waveform') {
            const hasWave = isPlaying && getWaveformData(bins);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const tNow = performance.now() / 1000;
            for (let i = 0; i < bins.length; i++) {
              const x = (i / (bins.length - 1)) * w;
              let v = 0.5;
              if (isPlaying) {
                v = hasWave
                  ? bins[i] / 255
                  : 0.5 + 0.25 * Math.sin(tNow * 6 + i * 0.45);
              }
              const y = v * (h - 8) + 4;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          } else {
            const hasData = isPlaying && getFrequencyData(bins);
            const gap = 6;
            const barW = Math.max(4, (w - gap * (barCount - 1)) / barCount);
            const tNow = performance.now() / 1000;

            for (let i = 0; i < barCount; i++) {
              let target = 0.06;
              if (isPlaying) {
                if (hasData) {
                  const raw = bins[Math.min(bins.length - 1, Math.floor((i / barCount) * 20))] / 255;
                  target = Math.max(0.08, raw);
                } else {
                  target = 0.15 + 0.35 * Math.abs(Math.sin(tNow * 3.2 + i * 0.45));
                }
              }
              const cur = smoothedRef.current[i] ?? 0.08;
              const next = cur + (target - cur) * 0.22;
              smoothedRef.current[i] = next;

              const barH = Math.max(4, next * (h - 4));
              const x = i * (barW + gap);
              const y = h - barH;

              ctx.fillStyle = color;
              ctx.globalAlpha = 0.35 + next * 0.65;
              if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, barW, barH, barW / 2);
                ctx.fill();
              } else {
                ctx.fillRect(x, y, barW, barH);
              }
            }
            ctx.globalAlpha = 1;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, getFrequencyData, getWaveformData, accentColor, style]);

  return (
    <div className="w-full max-w-3xl mx-auto pt-4 pointer-events-none">
      <canvas ref={canvasRef} width={560} height={64} className="w-full h-14 opacity-90" />
    </div>
  );
};
