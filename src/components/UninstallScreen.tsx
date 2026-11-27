import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Trash2,
  ListMusic,
  Sliders,
  Sparkles,
  Download,
  RefreshCw,
  Check,
  X,
  Minus,
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import { Aurora, GradientText, ShinyText } from './reactbits';
import { SpotifyLogoIcon } from './SpotifyIcons';
import { UninstallInfo } from '../types';

type UninstallPhase = 'options' | 'removing' | 'done';

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export const UninstallScreen: React.FC = () => {
  const [phase, setPhase] = useState<UninstallPhase>('options');
  const [info, setInfo] = useState<UninstallInfo | null>(null);

  const [removeLibrary, setRemoveLibrary] = useState<boolean>(false);
  const [removeSettings, setRemoveSettings] = useState<boolean>(false);
  const [removeCache, setRemoveCache] = useState<boolean>(true);
  const [confirmArm, setConfirmArm] = useState<boolean>(false);

  const [backupNotice, setBackupNotice] = useState<string>('');
  const [cacheNotice, setCacheNotice] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>('Preparing uninstall...');

  useEffect(() => {
    let mounted = true;
    const api = window.electronAPI;
    api?.uninstallGetInfo?.().then((res) => {
      if (mounted && res) setInfo(res);
    }).catch(() => {});

    const unsub = api?.onUninstallProgress?.((ev) => {
      if (!mounted) return;
      setProgress(ev.percent);
      setStepLabel(ev.step);
    });

    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  const isDeepClean = removeLibrary && removeSettings && removeCache;
  const isAppOnly = !removeLibrary && !removeSettings && removeCache;

  const applyAppOnlyPreset = () => {
    setRemoveLibrary(false);
    setRemoveSettings(false);
    setRemoveCache(true);
    setConfirmArm(false);
  };

  const applyDeepCleanPreset = () => {
    setRemoveLibrary(true);
    setRemoveSettings(true);
    setRemoveCache(true);
    setConfirmArm(false);
  };

  const handleExportBackup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await window.electronAPI?.uninstallExportBackup?.();
    if (res?.success) {
      setBackupNotice('Backup saved!');
      setTimeout(() => setBackupNotice(''), 4000);
    }
  };

  const handleClearCacheInstead = async () => {
    const res = await window.electronAPI?.uninstallClearCacheOnly?.();
    if (res?.success) {
      const freed = formatSize(res.freedBytes || 0);
      setCacheNotice(`Playback & GPU cache cleared (${freed}). Your VYBE app & playlists remain safely installed!`);
    }
  };

  const handleRunUninstall = async () => {
    if (!confirmArm) {
      setConfirmArm(true);
      return;
    }
    setPhase('removing');
    setProgress(8);
    setStepLabel('Stopping VYBE services...');

    await window.electronAPI?.uninstallRun?.({
      removeLibrary,
      removeSettings,
      removeCache
    });
    setProgress(100);
    setPhase('done');
  };

  const handleCloseDone = async () => {
    if (window.electronAPI?.uninstallFinish) {
      await window.electronAPI.uninstallFinish();
    } else {
      window.electronAPI?.close();
    }
  };

  const auroraColors: [string, string, string] =
    phase === 'done'
      ? ['#64748b', '#334155', '#0f172a']
      : ['#f43f5e', '#fb923c', '#7c3aed'];

  return (
    <div
      className="relative w-screen h-screen bg-[#050508] text-white flex flex-col justify-between overflow-hidden select-none border border-white/10"
      style={{
        backgroundColor: '#050508',
        backgroundImage: 'radial-gradient(circle at 75% 20%, rgba(244,63,94,0.16) 0%, #050508 75%)'
      }}
    >
      <Aurora colorStops={auroraColors} className="opacity-45 transition-opacity duration-700" />

      {/* Draggable Header */}
      <header
        className="relative z-20 px-6 pt-4 pb-2 flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-400/25 flex items-center justify-center backdrop-blur-xl">
            <SpotifyLogoIcon size={18} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <ShinyText text="DELETE VYBE" className="font-black text-xs tracking-[0.22em] uppercase" />
            {info?.isPreview && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-300 tracking-wide">
                SAFE PREVIEW
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => (phase === 'done' ? void handleCloseDone() : window.electronAPI?.close())}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-20 flex-1 px-7 py-2 flex flex-col justify-center">
        {phase === 'options' && (
          <div className="space-y-4">
            {/* Title + Preset Switcher */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  Choose what to{' '}
                  <GradientText colors={['#fb7185', '#fb923c', '#fda4af', '#fb7185']} className="font-black">
                    remove or keep.
                  </GradientText>
                </h1>
                <p className="text-xs text-white/55 mt-0.5">
                  Location: <span className="font-mono text-white/80">{info?.installDir || 'AppData\\Local\\Programs\\VYBE'}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.06] border border-white/12 backdrop-blur-xl">
                <button
                  onClick={applyAppOnlyPreset}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    isAppOnly ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Uninstall App Only
                </button>
                <button
                  onClick={applyDeepCleanPreset}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    isDeepClean ? 'bg-rose-500 text-white shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Deep Clean All
                </button>
              </div>
            </div>

            {/* Safety Guarantee Banner */}
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/12 border border-emerald-400/25 flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-100/90 font-medium">
                <span className="font-bold text-emerald-300">Audio Files Protected:</span> Your actual{' '}
                <span className="font-mono text-white">.mp3, .flac, .wav</span> song files on disk are{' '}
                <span className="underline decoration-emerald-400/60">never</span> modified or deleted.
              </p>
            </div>

            {cacheNotice && (
              <div className="px-4 py-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-cyan-100 font-medium">
                  <Sparkles size={15} className="text-cyan-300 shrink-0" />
                  <span>{cacheNotice}</span>
                </div>
                <button
                  onClick={() => window.electronAPI?.close()}
                  className="px-3 py-1 rounded-full bg-cyan-400 text-black text-[11px] font-black cursor-pointer shrink-0"
                >
                  Keep VYBE & Exit
                </button>
              </div>
            )}

            {/* 2x2 Granular Storage Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* 1. Core App (Required) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/15 flex items-start justify-between gap-3 opacity-90">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/25 flex items-center justify-center shrink-0 mt-0.5">
                    <HardDrive size={15} className="text-rose-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      VYBE App Engine
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] uppercase font-black">
                        Required
                      </span>
                    </p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      Program files, shortcuts & registry keys
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-white/80 shrink-0">
                  {formatSize(info?.appCoreBytes || 335 * 1024 * 1024)}
                </span>
              </div>

              {/* 2. Library & Custom Covers + 1-Click Backup */}
              <div
                onClick={() => {
                  setRemoveLibrary((v) => !v);
                  setConfirmArm(false);
                }}
                className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  removeLibrary
                    ? 'bg-rose-500/12 border-rose-400/35'
                    : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/12'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/25 flex items-center justify-center shrink-0 mt-0.5">
                    <ListMusic size={15} className="text-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">Playlists & Custom Covers</p>
                    <p className="text-[11px] text-white/55 mt-0.5 truncate">
                      {info ? `${info.playlistCount} Playlists • ${info.likedCount} Liked` : 'Playlists, Liked & Sync offsets'}
                    </p>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-bold text-white transition-colors cursor-pointer"
                    >
                      <Download size={11} className="text-emerald-300" />
                      <span>{backupNotice || 'Export Backup (.json)'}</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-white/75">
                    {formatSize(info?.libraryBytes || 0)}
                  </span>
                  <CheckChip checked={removeLibrary} label={removeLibrary ? 'Delete' : 'Keep'} />
                </div>
              </div>

              {/* 3. EQ & Preferences */}
              <div
                onClick={() => {
                  setRemoveSettings((v) => !v);
                  setConfirmArm(false);
                }}
                className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  removeSettings
                    ? 'bg-rose-500/12 border-rose-400/35'
                    : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/12'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Sliders size={15} className="text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">EQ Presets & Settings</p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      6-Band EQ curves, themes & glass preferences
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-white/75">
                    {formatSize(info?.settingsBytes || 0)}
                  </span>
                  <CheckChip checked={removeSettings} label={removeSettings ? 'Delete' : 'Keep'} />
                </div>
              </div>

              {/* 4. Temp Cache */}
              <div
                onClick={() => {
                  setRemoveCache((v) => !v);
                  setConfirmArm(false);
                }}
                className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  removeCache
                    ? 'bg-rose-500/12 border-rose-400/35'
                    : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/12'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={15} className="text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">Temp Artwork & Lyrics Cache</p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      Cached album thumbnails & GPU shader cache
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-white/75">
                    {formatSize(info?.cacheBytes || 0)}
                  </span>
                  <CheckChip checked={removeCache} label={removeCache ? 'Delete' : 'Keep'} />
                </div>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={handleClearCacheInstead}
                className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/12 border border-white/12 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Fix Playback / Clear Cache Instead</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => window.electronAPI?.close()}
                  className="px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/15 border border-white/12 text-xs font-bold text-white/80 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunUninstall}
                  className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    confirmArm
                      ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_28px_rgba(239,68,68,0.5)]'
                      : 'bg-white text-black hover:bg-rose-50 shadow-xl'
                  }`}
                >
                  {confirmArm ? <AlertTriangle size={15} /> : <Trash2 size={15} />}
                  <span>{confirmArm ? 'Confirm Delete VYBE' : 'Delete VYBE'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'removing' && (
          <div className="max-w-lg mx-auto w-full p-7 rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-2xl space-y-6 shadow-2xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-rose-400">
                  Removing VYBE
                </p>
                <h2 className="text-xl font-black mt-1 text-white">{stepLabel}</h2>
              </div>
              <span className="text-3xl font-black tabular-nums">{progress}%</span>
            </div>

            <div className="w-full h-3 rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.max(6, progress)}%` }}
              />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="max-w-lg mx-auto w-full p-7 rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-2xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Check size={26} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white">VYBE has been removed.</h2>
            <p className="text-xs text-white/65 leading-relaxed">
              {!removeLibrary
                ? 'Your playlists, liked songs, custom covers, and local audio files remain safely intact on your PC.'
                : 'Selected VYBE application files and data have been cleaned up. Your personal music files were never touched.'}
            </p>
            <div className="pt-2">
              <button
                onClick={handleCloseDone}
                className="px-8 py-3 rounded-full bg-white text-black text-xs sm:text-sm font-black hover:scale-[1.03] active:scale-95 transition-all cursor-pointer shadow-xl"
              >
                {info?.isPreview ? 'Finish Preview' : 'Done & Close'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-20 px-6 pb-3 flex items-center justify-between text-[11px] text-white/35">
        <span>VYBE Uninstaller • Clean Removal</span>
        <span>Thanks for listening with VYBE</span>
      </footer>
    </div>
  );
};

const CheckChip: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) => (
  <span
    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-colors ${
      checked
        ? 'bg-rose-500/25 border-rose-400/50 text-rose-200'
        : 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
    }`}
  >
    {label}
  </span>
);
