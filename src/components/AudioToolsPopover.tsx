import React, { useState } from 'react';
import { Sliders, Repeat, Timer, Sparkles, RotateCcw, X, Droplets } from 'lucide-react';
import { usePlayer, EQ_BANDS, EQ_PRESETS } from '../context/PlayerContext';

interface AudioToolsPopoverProps {
  onClose: () => void;
  variant?: 'popover' | 'modal';
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS: { label: string; minutes: number | 'end-of-track' | null }[] = [
  { label: 'Off', minutes: null },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '60m', minutes: 60 },
  { label: 'Track End', minutes: 'end-of-track' },
];

const formatSec = (sec: number | null) => {
  if (sec === null || !Number.isFinite(sec) || sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatBandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

export const AudioToolsPopover: React.FC<AudioToolsPopoverProps> = ({
  onClose,
  variant = 'popover',
}) => {
  const {
    currentTrack,
    settings,
    updateAudioSettings,
    abLoop,
    sleepTimer,
    sleepRemainingSec,
    setEqPreset,
    setEqBandGain,
    saveCustomEqPreset,
    deleteCustomEqPreset,
    setCrossfadeSec,
    setPlaybackRate,
    setCompactMode,
    setAmoledMode,
    setHazyMode,
    setHazyBlur,
    setLoopA,
    setLoopB,
    clearAbLoop,
    startSleepTimer,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'playback' | 'eq' | 'display'>('playback');
  const [newPresetName, setNewPresetName] = useState('');

  const customPresetNames = Object.keys(settings.customEqPresets || {});
  const presetNames = [...Object.keys(EQ_PRESETS), ...customPresetNames];

  return (
    <div
      onClick={e => e.stopPropagation()}
      className={
        variant === 'modal'
          ? 'w-full max-w-sm bg-[#242424] rounded-2xl border border-white/10 shadow-2xl overflow-hidden text-white select-none animate-pop-in'
          : 'w-80 bg-[#242424] rounded-xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.75)] overflow-hidden text-white select-none animate-pop-in'
      }
    >
      {/* Header + Compact Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-spotify-green" />
          <span className="text-sm font-bold tracking-tight">Playback & Audio</span>
        </div>
        <button
          onClick={onClose}
          title="Close"
          className="p-1 rounded-full text-spotify-muted hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      <div className="px-3 pt-2 flex gap-1 border-b border-white/10">
        {[
          { id: 'playback', label: 'Playback' },
          { id: 'eq', label: 'Equalizer' },
          { id: 'display', label: 'Display' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-md border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'text-white border-spotify-green bg-white/5'
                : 'text-spotify-muted border-transparent hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto">
        {activeTab === 'playback' && (
          <>
            {/* A-B Loop */}
            <div className="bg-black/25 rounded-lg p-3 space-y-2.5 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Repeat size={13} className="text-spotify-green" />
                  <span>A–B Loop</span>
                </div>
                <span className="text-[11px] font-mono text-spotify-muted tabular-nums">
                  {abLoop.a !== null ? formatSec(abLoop.a) : '--:--'} →{' '}
                  {abLoop.b !== null ? formatSec(abLoop.b) : '--:--'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  disabled={!currentTrack}
                  onClick={setLoopA}
                  className={`py-1.5 rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    abLoop.a !== null
                      ? 'bg-spotify-green text-black'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Set A
                </button>
                <button
                  disabled={!currentTrack}
                  onClick={setLoopB}
                  className={`py-1.5 rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    abLoop.b !== null
                      ? 'bg-spotify-green text-black'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Set B
                </button>
                <button
                  disabled={abLoop.a === null && abLoop.b === null}
                  onClick={clearAbLoop}
                  className="py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 text-white/90 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <RotateCcw size={11} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Playback Speed</span>
                <span className="text-spotify-green font-bold tabular-nums">
                  {settings.playbackRate.toFixed(2).replace(/\.00$/, '')}x
                </span>
              </div>
              <div className="flex gap-1">
                {SPEED_OPTIONS.map(rate => {
                  const active = Math.abs(settings.playbackRate - rate) < 0.01;
                  return (
                    <button
                      key={rate}
                      onClick={() => setPlaybackRate(rate)}
                      className={`flex-1 h-7 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center leading-none ${
                        active
                          ? 'bg-spotify-green text-black'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  );
                })}
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={settings.playbackRate}
                onChange={e => setPlaybackRate(Number(e.target.value))}
                className="w-full accent-spotify-green h-1 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>

            {/* Crossfade */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Crossfade</span>
                <span className="text-spotify-muted tabular-nums">
                  {settings.crossfadeSec === 0 ? 'Off' : `${settings.crossfadeSec}s`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={settings.crossfadeSec}
                onChange={e => setCrossfadeSec(Number(e.target.value))}
                className="w-full accent-spotify-green h-1 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>

            {/* Sleep Timer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Timer size={13} className="text-spotify-muted" />
                  <span>Sleep Timer</span>
                </span>
                {sleepRemainingSec !== null && (
                  <span className="text-spotify-green font-mono font-bold tabular-nums">
                    {formatSec(sleepRemainingSec)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {SLEEP_OPTIONS.map(opt => {
                  const isActive =
                    (opt.minutes === null && sleepTimer === null) ||
                    (opt.minutes === 'end-of-track' && sleepTimer?.kind === 'end-of-track') ||
                    (typeof opt.minutes === 'number' &&
                      sleepTimer?.kind === 'until' &&
                      sleepRemainingSec !== null &&
                      Math.abs(sleepRemainingSec - opt.minutes * 60) < 60);

                  return (
                    <button
                      key={opt.label}
                      onClick={() => startSleepTimer(opt.minutes)}
                      className={`h-7 rounded-md font-bold transition-all cursor-pointer flex items-center justify-center text-center leading-none px-1 select-none ${
                        opt.label === 'Track End' ? 'text-[10px] tracking-tight' : 'text-[11px]'
                      } ${
                        isActive
                          ? 'bg-spotify-green text-black shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'eq' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Preset</span>
                <span className="text-[11px] text-spotify-green font-semibold">
                  {settings.eqPreset}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presetNames.map(name => {
                  const isCustom = customPresetNames.includes(name);
                  return (
                    <div key={name} className="inline-flex items-center">
                      <button
                        onClick={() => setEqPreset(name)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                          settings.eqPreset === name
                            ? 'bg-spotify-green text-black'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {name}
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => deleteCustomEqPreset(name)}
                          title={`Delete ${name}`}
                          className="ml-0.5 text-spotify-muted hover:text-red-400 text-[10px] px-1 cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!newPresetName.trim()) return;
                  saveCustomEqPreset(newPresetName);
                  setNewPresetName('');
                }}
                className="flex gap-1.5 mt-2.5"
              >
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="Save custom preset name..."
                  className="flex-1 bg-black/30 text-white text-[11px] px-2.5 py-1 rounded border border-white/10 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-white text-black text-[11px] font-bold cursor-pointer"
                >
                  Save
                </button>
              </form>
            </div>

            <div className="pt-2">
              <div className="grid grid-cols-6 gap-2 pt-2 pb-1">
                {EQ_BANDS.map((hz, idx) => {
                  const gain = settings.eqGains[idx] ?? 0;
                  return (
                    <div key={hz} className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-mono text-spotify-muted tabular-nums">
                        {gain > 0 ? `+${gain}` : gain}
                      </span>
                      <div className="h-24 flex items-center justify-center">
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={1}
                          value={gain}
                          onChange={e => setEqBandGain(idx, Number(e.target.value))}
                          style={{
                            writingMode: 'vertical-lr',
                            direction: 'rtl',
                          }}
                          className="h-24 w-4 accent-spotify-green cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/80">
                        {formatBandLabel(hz)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'display' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-black/25 space-y-2 border border-white/5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-start gap-2">
                  <Droplets size={14} className="text-spotify-green mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Transparent Theme</p>
                    <p className="text-[11px] text-spotify-muted">Translucent acrylic glass & ambient art</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.hazyMode)}
                  onChange={e => setHazyMode(e.target.checked)}
                  className="w-4 h-4 accent-spotify-green cursor-pointer"
                />
              </label>

              {settings.hazyMode && (
                <div className="pt-2 border-t border-white/10 space-y-2 animate-view-enter">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white">Blur & Transparency</span>
                    <span className="text-spotify-green font-bold tabular-nums">
                      {(settings.hazyBlur ?? 45) === 0
                        ? '0% • Complete Transparent'
                        : `${settings.hazyBlur ?? 45}% • ${
                            (settings.hazyBlur ?? 45) < 35
                              ? 'Crystal Glass'
                              : (settings.hazyBlur ?? 45) < 70
                              ? 'Balanced Frost'
                              : 'Full Blur'
                          }`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.hazyBlur ?? 45}
                    onChange={e => setHazyBlur(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-spotify-green"
                  />
                  <div className="flex justify-between text-[10px] text-spotify-muted font-medium pt-0.5">
                    <span>0% (Transparent)</span>
                    <span>50%</span>
                    <span>100% (Full Blur)</span>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {[
                      { label: '0% Clear', val: 0 },
                      { label: '25%', val: 25 },
                      { label: '50%', val: 50 },
                      { label: '75%', val: 75 },
                      { label: '100% Full', val: 100 },
                    ].map(p => {
                      const active = (settings.hazyBlur ?? 45) === p.val;
                      return (
                        <button
                          key={p.label}
                          onClick={() => setHazyBlur(p.val)}
                          className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-spotify-green text-black'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-black/25 hover:bg-black/35 cursor-pointer">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-spotify-green mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Dynamic Artwork Mood Tint</p>
                  <p className="text-[11px] text-spotify-muted">Match player accent to cover art</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.dynamicAccentColor !== false}
                onChange={e => updateAudioSettings({ dynamicAccentColor: e.target.checked })}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-black/25 hover:bg-black/35 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-white">Compact Track List</p>
                <p className="text-[11px] text-spotify-muted">Tighter rows to fit more songs</p>
              </div>
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={e => setCompactMode(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-black/25 hover:bg-black/35 cursor-pointer">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-spotify-green mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">AMOLED Pure Black</p>
                  <p className="text-[11px] text-spotify-muted">True black surfaces for OLED screens</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.amoledMode}
                onChange={e => setAmoledMode(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
