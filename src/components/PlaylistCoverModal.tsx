import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, RefreshCw, Wand2, Image as ImageIcon, Trash2 } from 'lucide-react';

interface PlaylistCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistTitle: string;
  onApplyCover: (dataUrl: string) => void;
}

const GRADIENTS = [
  { name: 'Neon Cyber', from: '#ff007f', to: '#7928ca', angle: '135deg' },
  { name: 'Deep Emerald', from: '#059669', to: '#10b981', angle: '120deg' },
  { name: 'Spotify Glow', from: '#1db954', to: '#121212', angle: '180deg' },
  { name: 'Midnight Ocean', from: '#1e3a8a', to: '#3b82f6', angle: '145deg' },
  { name: 'Sunset Flame', from: '#ea580c', to: '#f59e0b', angle: '135deg' },
  { name: 'Purple Haze', from: '#581c87', to: '#c084fc', angle: '160deg' },
  { name: 'Obsidian Gold', from: '#181818', to: '#d97706', angle: '120deg' },
  { name: 'Rose Quartz', from: '#e11d48', to: '#f43f5e', angle: '150deg' },
  { name: 'Northern Lights', from: '#064e3b', to: '#06b6d4', angle: '140deg' },
  { name: 'Synthwave Retro', from: '#831843', to: '#38bdf8', angle: '135deg' },
  { name: 'Velvet Cherry', from: '#4c0519', to: '#e11d48', angle: '160deg' },
  { name: 'Electric Lime', from: '#14532d', to: '#84cc16', angle: '130deg' },
];

const STICKERS = [
  '🎵', '🔥', '✨', '🎧', '⚡', '🌙', '🌊', '🚀',
  '💿', '🎸', '🎹', '☕', '💖', '💎', '👾', '🌴',
  '🪐', '🛸', '🍿', '🏆', '🦁', '👑', '🔮', '🖤'
];

export const PlaylistCoverModal: React.FC<PlaylistCoverModalProps> = ({
  isOpen,
  onClose,
  playlistTitle,
  onApplyCover,
}) => {
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [sticker, setSticker] = useState('🎵');
  const [showSticker, setShowSticker] = useState(true);
  const [customText, setCustomText] = useState(playlistTitle || 'MY VYBE');
  const [subtitle, setSubtitle] = useState('OFFLINE MIX');
  const [styleMode, setStyleMode] = useState<'bold' | 'minimal' | 'retro' | 'editorial'>('bold');
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (playlistTitle) {
      setCustomText(playlistTitle);
    }
  }, [playlistTitle]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    // Draw background (either custom image or gradient)
    if (bgImage) {
      // Draw image scaled & centered (cover)
      const imgAspect = bgImage.width / bgImage.height;
      let drawW = size;
      let drawH = size;
      let offX = 0;
      let offY = 0;
      if (imgAspect > 1) {
        drawW = size * imgAspect;
        offX = -(drawW - size) / 2;
      } else {
        drawH = size / imgAspect;
        offY = -(drawH - size) / 2;
      }
      ctx.drawImage(bgImage, offX, offY, drawW, drawH);

      // Dark gradient overlay so typography stays readable
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, size);
      overlayGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      overlayGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, size, size);
    } else {
      // Linear gradient background
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, selectedGradient.from);
      grad.addColorStop(1, selectedGradient.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Subtle texture noise / rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 210, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 260, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, size - 32, size - 32);

    // Decorative corners
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(24, 24, 20, 3);
    ctx.fillRect(24, 24, 3, 20);
    ctx.fillRect(size - 44, 24, 20, 3);
    ctx.fillRect(size - 27, 24, 3, 20);
    ctx.fillRect(24, size - 27, 20, 3);
    ctx.fillRect(24, size - 44, 3, 20);
    ctx.fillRect(size - 44, size - 27, 20, 3);
    ctx.fillRect(size - 27, size - 44, 3, 20);

    // Center Sticker / Emoji
    if (showSticker && sticker) {
      ctx.save();
      ctx.font = '110px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.fillText(sticker, size / 2, size * 0.38);
      ctx.restore();
    }

    // Main Title Typography
    ctx.save();
    ctx.fillStyle = '#ffffff';
    if (styleMode === 'bold') {
      ctx.font = '900 40px system-ui, -apple-system, sans-serif';
    } else if (styleMode === 'retro') {
      ctx.font = '700 36px "Courier New", monospace';
    } else if (styleMode === 'editorial') {
      ctx.font = 'italic 700 42px "Times New Roman", serif';
    } else {
      ctx.font = '300 36px system-ui, -apple-system, sans-serif';
    }

    const titleText = (customText || 'PLAYLIST').toUpperCase();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 16;
    const titleY = showSticker ? size * 0.65 : size * 0.5;
    ctx.fillText(titleText.slice(0, 24), size / 2, titleY);
    ctx.restore();

    // Subtitle Typography
    if (subtitle) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      try {
        if ('letterSpacing' in ctx) {
          (ctx as unknown as { letterSpacing: string }).letterSpacing = '3px';
        }
      } catch {
        // ignore
      }
      const subY = showSticker ? size * 0.76 : size * 0.61;
      ctx.fillText(subtitle.toUpperCase(), size / 2, subY);
      ctx.restore();
    }

    // Bottom brand tag
    ctx.save();
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      if ('letterSpacing' in ctx) {
        (ctx as unknown as { letterSpacing: string }).letterSpacing = '2px';
      }
    } catch {
      // ignore
    }
    ctx.fillText('VYBE • HIGH FIDELITY AUDIO', size / 2, size - 36);
    ctx.restore();
  };

  // Ensure canvas paints cleanly on mount and whenever parameters change
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      renderCanvas();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, selectedGradient, sticker, showSticker, customText, subtitle, styleMode, bgImage]);

  if (!isOpen) return null;

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onApplyCover(dataUrl);
    onClose();
  };

  const handleRandomize = () => {
    const randGrad = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    const randSticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
    const modes: Array<'bold' | 'minimal' | 'retro' | 'editorial'> = ['bold', 'minimal', 'retro', 'editorial'];
    const randMode = modes[Math.floor(Math.random() * modes.length)];

    setSelectedGradient(randGrad);
    setSticker(randSticker);
    setStyleMode(randMode);
    setShowSticker(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      if (typeof event.target?.result === 'string') {
        const img = new Image();
        img.onload = () => {
          setBgImage(img);
        };
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const modalContent = (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-[#1c1c1e] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 text-white space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-spotify-green/20 flex items-center justify-center text-spotify-green shadow-inner">
              <Wand2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Cover Art Studio</h3>
              <p className="text-xs text-spotify-muted">Design a unique gradient or photo cover for this playlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-full hover:bg-white/10 text-spotify-muted hover:text-white cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-center">
          {/* Canvas Live Preview */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-[#121212]">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRandomize}
                className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
              >
                <RefreshCw size={12} />
                <span>Surprise Me</span>
              </button>
              {bgImage ? (
                <button
                  type="button"
                  onClick={() => setBgImage(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Remove Photo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                >
                  <ImageIcon size={12} />
                  <span>Add Photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-3.5 text-xs">
            {/* Color Palettes */}
            {!bgImage && (
              <div>
                <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1.5">
                  Color Themes
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {GRADIENTS.map(g => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setSelectedGradient(g)}
                      title={g.name}
                      style={{ background: `linear-gradient(${g.angle}, ${g.from}, ${g.to})` }}
                      className={`h-7 rounded-md border cursor-pointer transition-all ${
                        selectedGradient.name === g.name
                          ? 'scale-110 border-white ring-2 ring-white/50 shadow-md z-10'
                          : 'border-white/20 opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sticker / Emoji Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-spotify-muted uppercase tracking-wider">
                  Center Icon / Sticker
                </label>
                <button
                  type="button"
                  onClick={() => setShowSticker(prev => !prev)}
                  className="text-[11px] text-spotify-green hover:underline cursor-pointer font-medium"
                >
                  {showSticker ? 'Hide Icon' : 'Show Icon'}
                </button>
              </div>
              {showSticker && (
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {STICKERS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSticker(s)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm cursor-pointer transition-colors ${
                        sticker === s
                          ? 'bg-spotify-green/20 border border-spotify-green text-base'
                          : 'bg-[#282828] hover:bg-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text Inputs */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1">
                  Playlist Title
                </label>
                <input
                  type="text"
                  value={customText}
                  maxLength={28}
                  onChange={e => setCustomText(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#262626] border border-white/15 rounded-lg text-white text-xs focus:outline-none focus:border-spotify-green"
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
                  className="w-full px-3 py-1.5 bg-[#262626] border border-white/15 rounded-lg text-white text-xs focus:outline-none focus:border-spotify-green"
                  placeholder="OFFLINE MIX"
                />
              </div>
            </div>

            {/* Typography Selector */}
            <div>
              <label className="block text-[11px] font-bold text-spotify-muted uppercase tracking-wider mb-1.5">
                Typography Style
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['bold', 'minimal', 'retro', 'editorial'] as const).map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setStyleMode(style)}
                    className={`py-1.5 rounded-md font-bold text-[11px] capitalize cursor-pointer border transition-colors ${
                      styleMode === style
                        ? 'bg-spotify-green text-black border-spotify-green'
                        : 'bg-[#262626] text-white/80 border-white/10 hover:bg-[#323232] hover:text-white'
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
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-spotify-muted hover:text-white cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold cursor-pointer transition-transform hover:scale-105 shadow-lg"
          >
            <Check size={14} />
            <span>Apply to Playlist</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
