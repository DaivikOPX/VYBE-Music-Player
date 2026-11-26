import React, { useState, useRef, useEffect } from 'react';
import { Check, X, RefreshCw, Wand2 } from 'lucide-react';

interface PlaylistCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistTitle: string;
  onApplyCover: (dataUrl: string) => void;
}

const GRADIENTS = [
  { name: 'Neon Cyber', from: '#ff007f', to: '#7928ca', angle: '135deg' },
  { name: 'Deep Emerald', from: '#059669', to: '#10b981', angle: '120deg' },
  { name: 'Spotify Glow', from: '#1db954', to: '#191414', angle: '180deg' },
  { name: 'Midnight Blue', from: '#1e3a8a', to: '#3b82f6', angle: '145deg' },
  { name: 'Sunset Orange', from: '#ea580c', to: '#f59e0b', angle: '135deg' },
  { name: 'Purple Haze', from: '#581c87', to: '#c084fc', angle: '160deg' },
  { name: 'Obsidian Gold', from: '#171717', to: '#d97706', angle: '120deg' },
  { name: 'Rose Dream', from: '#e11d48', to: '#f43f5e', angle: '150deg' },
];

const STICKERS = ['🎵', '🔥', '✨', '🎧', '⚡', '🌙', '🌊', '🚀', '💿', '🎸', '🎹', '☕'];

export const PlaylistCoverModal: React.FC<PlaylistCoverModalProps> = ({
  isOpen,
  onClose,
  playlistTitle,
  onApplyCover,
}) => {
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [sticker, setSticker] = useState('🎵');
  const [customText, setCustomText] = useState(playlistTitle || 'MY VYBE');
  const [subtitle, setSubtitle] = useState('OFFLINE MIX');
  const [styleMode, setStyleMode] = useState<'minimal' | 'bold' | 'retro'>('bold');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (playlistTitle) setCustomText(playlistTitle);
  }, [playlistTitle]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 500;
    canvas.width = size;
    canvas.height = size;

    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, selectedGradient.from);
    grad.addColorStop(1, selectedGradient.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle texture noise / rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Decorative corners
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(24, 24, 16, 2);
    ctx.fillRect(24, 24, 2, 16);
    ctx.fillRect(size - 40, 24, 16, 2);
    ctx.fillRect(size - 26, 24, 2, 16);

    // Sticker / Icon in center or upper center
    ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker, size / 2, size * 0.38);

    // Main Title
    ctx.fillStyle = '#ffffff';
    if (styleMode === 'bold') {
      ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    } else if (styleMode === 'retro') {
      ctx.font = '700 34px "Courier New", monospace';
    } else {
      ctx.font = '300 32px system-ui, -apple-system, sans-serif';
    }

    const titleText = (customText || 'PLAYLIST').toUpperCase();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText(titleText.slice(0, 22), size / 2, size * 0.65);

    // Subtitle
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '600 15px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText((subtitle || 'VYBE EDITION').toUpperCase(), size / 2, size * 0.75);

    // Bottom brand tag
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.letterSpacing = '2px';
    ctx.fillText('VYBE • HIGH FIDELITY', size / 2, size - 32);
  };

  useEffect(() => {
    if (isOpen) {
      renderCanvas();
    }
  }, [isOpen, selectedGradient, sticker, customText, subtitle, styleMode]);

  if (!isOpen) return null;

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onApplyCover(dataUrl);
    onClose();
  };

  const handleRandomize = () => {
    const randGrad = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    const randSticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
    setSelectedGradient(randGrad);
    setSticker(randSticker);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl p-6 text-white space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-spotify-green/20 flex items-center justify-center text-spotify-green">
              <Wand2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">Cover Art Designer</h3>
              <p className="text-xs text-spotify-muted">Generate a custom gradient cover for this playlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-spotify-muted hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Canvas Preview */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl border border-white/15">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            </div>
            <button
              onClick={handleRandomize}
              className="flex items-center gap-2 text-xs font-semibold text-spotify-muted hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              <RefreshCw size={13} />
              Random Palette & Sticker
            </button>
          </div>

          {/* Controls */}
          <div className="space-y-4 text-xs">
            {/* Color Themes */}
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-2">
                Gradient Themes
              </label>
              <div className="grid grid-cols-4 gap-2">
                {GRADIENTS.map(g => (
                  <button
                    key={g.name}
                    onClick={() => setSelectedGradient(g)}
                    title={g.name}
                    style={{ background: `linear-gradient(${g.angle}, ${g.from}, ${g.to})` }}
                    className={`h-7 rounded-lg border cursor-pointer transition-transform ${
                      selectedGradient.name === g.name ? 'scale-105 border-white shadow-md' : 'border-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Sticker Picker */}
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-2">
                Center Emoji / Sticker
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STICKERS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSticker(s)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors ${
                      sticker === s ? 'bg-white/20 border border-white/40' : 'bg-[#282828] hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Inputs */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
                  Title Text
                </label>
                <input
                  type="text"
                  value={customText}
                  maxLength={24}
                  onChange={e => setCustomText(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#282828] border border-white/10 rounded-lg text-white focus:outline-none focus:border-spotify-green"
                  placeholder="PLAYLIST TITLE"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={subtitle}
                  maxLength={24}
                  onChange={e => setSubtitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#282828] border border-white/10 rounded-lg text-white focus:outline-none focus:border-spotify-green"
                  placeholder="SUBTITLE"
                />
              </div>
            </div>

            {/* Style Selector */}
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1.5">
                Typography Style
              </label>
              <div className="flex gap-2">
                {(['bold', 'minimal', 'retro'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => setStyleMode(style)}
                    className={`flex-1 py-1.5 rounded-md font-bold capitalize cursor-pointer border ${
                      styleMode === style
                        ? 'bg-spotify-green text-black border-spotify-green'
                        : 'bg-[#282828] text-white border-white/10 hover:bg-[#323232]'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-spotify-muted hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold cursor-pointer transition-transform hover:scale-102"
          >
            <Check size={14} />
            Set as Playlist Cover
          </button>
        </div>
      </div>
    </div>
  );
};
