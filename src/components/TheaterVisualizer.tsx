import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

interface TheaterVisualizerProps {
  accentColor?: string;
}

export const TheaterVisualizer: React.FC<TheaterVisualizerProps> = ({ accentColor }) => {
  const { isPlaying, getFrequencyData, getWaveformData, settings, activeAccentColor } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef<number[]>(new Array(36).fill(0.08));
  const style = settings.visualizerStyle || 'bars';

  useEffect(() => {
    let raf = 0;
    const bins = new Uint8Array(64);
    const barCount = 36;
    const baseHex =
      settings.dynamicAccentColor !== false
        ? activeAccentColor
        : accentColor && accentColor !== '#282828'
        ? accentColor
        : '#1ed760';

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth || 640;
        const cssH = canvas.clientHeight || 72;
        if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
          canvas.width = Math.round(cssW * dpr);
          canvas.height = Math.round(cssH * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const w = cssW;
          const h = cssH;
          ctx.clearRect(0, 0, w, h);
          const tNow = performance.now() / 1000;

          if (style === 'fluid') {
            const hasFreq = isPlaying && getFrequencyData(bins);
            let bassEnergy = 0;
            let midEnergy = 0;
            if (isPlaying) {
              if (hasFreq) {
                for (let i = 0; i < 8; i++) bassEnergy += bins[i];
                for (let i = 8; i < 24; i++) midEnergy += bins[i];
                bassEnergy = bassEnergy / (8 * 255);
                midEnergy = midEnergy / (16 * 255);
              } else {
                bassEnergy = 0.28 + 0.18 * Math.sin(tNow * 3.1);
                midEnergy = 0.24 + 0.14 * Math.cos(tNow * 2.4);
              }
            } else {
              bassEnergy = 0.04;
              midEnergy = 0.03;
            }

            const layers = [
              { freq: 0.018, speed: 2.2, amp: 10 + bassEnergy * 24, alpha: 0.22, fill: true },
              { freq: 0.026, speed: -1.7, amp: 8 + midEnergy * 20, alpha: 0.45, fill: false },
              { freq: 0.012, speed: 1.3, amp: 6 + (bassEnergy + midEnergy) * 14, alpha: 0.85, fill: false },
            ];

            for (const layer of layers) {
              ctx.beginPath();
              const midY = h * 0.56;
              for (let x = 0; x <= w; x += 6) {
                const env = Math.sin((x / w) * Math.PI); // taper edges smoothly to zero
                const wave =
                  Math.sin(x * layer.freq + tNow * layer.speed) *
                  Math.cos(x * layer.freq * 0.45 - tNow * 1.1) *
                  layer.amp *
                  env;
                const y = midY + wave;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }

              ctx.strokeStyle = baseHex;
              ctx.globalAlpha = layer.alpha;
              ctx.lineWidth = layer.fill ? 1.5 : 2.5;
              ctx.shadowBlur = layer.fill ? 0 : 12;
              ctx.shadowColor = baseHex;
              ctx.stroke();

              if (layer.fill) {
                ctx.lineTo(w, h);
                ctx.lineTo(0, h);
                ctx.closePath();
                const grad = ctx.createLinearGradient(0, midY - 25, 0, h);
                grad.addColorStop(0, baseHex);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fill();
              }
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          } else if (style === 'waveform') {
            const hasWave = isPlaying && getWaveformData(bins);
            ctx.strokeStyle = baseHex;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = isPlaying ? 10 : 0;
            ctx.shadowColor = baseHex;
            ctx.beginPath();
            for (let i = 0; i < bins.length; i++) {
              const x = (i / (bins.length - 1)) * w;
              let v = 0.5;
              if (isPlaying) {
                v = hasWave
                  ? bins[i] / 255
                  : 0.5 + 0.25 * Math.sin(tNow * 6 + i * 0.45);
              }
              const y = v * (h - 10) + 5;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            const hasData = isPlaying && getFrequencyData(bins);
            const gap = 5;
            const barW = Math.max(4, (w - gap * (barCount - 1)) / barCount);

            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.25, baseHex);
            grad.addColorStop(1, `${baseHex}55`);

            for (let i = 0; i < barCount; i++) {
              let target = 0.06;
              if (isPlaying) {
                if (hasData) {
                  const raw = bins[Math.min(bins.length - 1, Math.floor((i / barCount) * 24))] / 255;
                  target = Math.max(0.08, raw);
                } else {
                  target = 0.14 + 0.36 * Math.abs(Math.sin(tNow * 3.2 + i * 0.45));
                }
              }
              const cur = smoothedRef.current[i] ?? 0.08;
              const next = cur + (target - cur) * 0.24;
              smoothedRef.current[i] = next;

              const barH = Math.max(4, next * (h - 6));
              const x = i * (barW + gap);
              const y = h - barH;

              ctx.fillStyle = grad;
              ctx.globalAlpha = 0.38 + next * 0.62;
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
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, getFrequencyData, getWaveformData, accentColor, activeAccentColor, settings.dynamicAccentColor, style]);

  return (
    <div className="w-full max-w-3xl mx-auto pt-4 pointer-events-none">
      <canvas ref={canvasRef} width={640} height={72} className="w-full h-16 opacity-95" />
    </div>
  );
};
