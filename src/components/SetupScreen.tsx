import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  Monitor,
  LayoutGrid,
  Zap,
  Check,
  X,
  Minus,
  Sparkles,
  Disc3,
  HardDrive,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Aurora, GradientText, ShinyText } from './reactbits';
import { SpotifyLogoIcon } from './SpotifyIcons';
import { SetupDefaults } from '../types';

type SetupPhase = 'config' | 'installing' | 'done' | 'error';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${Math.max(1, Math.round(mb))} MB`;
}

export const SetupScreen: React.FC = () => {
  const [phase, setPhase] = useState<SetupPhase>('config');
  const [defaults, setDefaults] = useState<SetupDefaults | null>(null);
  const [installDir, setInstallDir] = useState<string>('C:\\Users\\You\\AppData\\Local\\Programs\\VYBE');
  const [freeBytes, setFreeBytes] = useState<number>(0);
  const [isExistingInstall, setIsExistingInstall] = useState<boolean>(false);

  const [desktopShortcut, setDesktopShortcut] = useState<boolean>(true);
  const [startMenuShortcut, setStartMenuShortcut] = useState<boolean>(true);
  const [startWithWindows, setStartWithWindows] = useState<boolean>(false);

  const [progress, setProgress] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>('Preparing installation...');
  const [targetExe, setTargetExe] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const api = window.electronAPI;
    if (api?.setupGetDefaults) {
      api.setupGetDefaults().then((info) => {
        if (!mounted || !info) return;
        setDefaults(info);
        setInstallDir(info.installDir);
        setFreeBytes(info.freeBytes);
        setIsExistingInstall(info.isExistingInstall);
      }).catch(() => {});
    }

    const unsub = api?.onSetupProgress?.((ev) => {
      if (!mounted) return;
      setProgress(ev.percent);
      setStepLabel(ev.step);
    });

    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  const handleBrowse = async () => {
    const res = await window.electronAPI?.setupPickFolder?.(installDir);
    if (res && !res.cancelled && res.path) {
      setInstallDir(res.path);
      if (typeof res.freeBytes === 'number') setFreeBytes(res.freeBytes);
      setIsExistingInstall(Boolean(res.isExistingInstall));
    }
  };

  const handleStartInstall = async () => {
    setErrorMessage('');
    setProgress(4);
    setStepLabel('Starting installation...');
    setPhase('installing');

    const res = await window.electronAPI?.setupRunInstall?.({
      installDir,
      desktopShortcut,
      startMenuShortcut,
      startWithWindows
    });

    if (res?.success) {
      setTargetExe(res.targetExe || `${installDir}\\VYBE.exe`);
      setProgress(100);
      setPhase('done');
    } else {
      setErrorMessage(res?.error || 'Could not complete installation cleanly.');
      setPhase('error');
    }
  };

  const handleLaunch = async () => {
    if (window.electronAPI?.setupLaunchInstalled) {
      await window.electronAPI.setupLaunchInstalled(targetExe);
    } else {
      window.electronAPI?.close();
    }
  };

  const auroraColors: [string, string, string] =
    phase === 'done'
      ? ['#1ed760', '#10b981', '#06b6d4']
      : phase === 'error'
        ? ['#ef4444', '#f97316', '#9333ea']
        : ['#1ed760', '#06b6d4', '#6366f1'];

  return (
    <div
      className="relative w-screen h-screen bg-[#050508] text-white flex flex-col justify-between overflow-hidden select-none border border-white/10"
      style={{
        backgroundColor: '#050508',
        backgroundImage: 'radial-gradient(circle at 22% 28%, rgba(30,215,96,0.16) 0%, #050508 75%)'
      }}
    >
      <Aurora colorStops={auroraColors} className="opacity-55 transition-opacity duration-700" />

      {/* Frameless Draggable Header */}
      <header
        className="relative z-20 px-6 pt-4 pb-2 flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-spotify-green/20 border border-white/15 flex items-center justify-center backdrop-blur-xl">
            <SpotifyLogoIcon size={18} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <ShinyText text="VYBE SETUP" className="font-black text-xs tracking-[0.22em] uppercase" />
            {defaults?.isPreview && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-300 tracking-wide">
                DEV PREVIEW
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
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/30 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Cancel Setup"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Split Stage */}
      <main className="relative z-20 flex-1 px-8 py-4 grid grid-cols-12 gap-8 items-center">
        {/* Left Visual Showcase */}
        <div className="col-span-5 flex flex-col items-center text-center space-y-5">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-50 transition-all duration-700"
              style={{
                background: phase === 'done'
                  ? 'radial-gradient(circle, #1ed760, transparent 70%)'
                  : 'radial-gradient(circle, #10b981, #38bdf8 50%, transparent 75%)'
              }}
            />
            <div
              className={`relative w-40 h-40 rounded-full bg-gradient-to-br from-neutral-900 via-black to-neutral-800 border border-white/20 shadow-2xl flex items-center justify-center ${
                phase === 'installing' ? 'animate-[spin_1.6s_linear_infinite]' : 'animate-[spin_10s_linear_infinite]'
              }`}
            >
              <div className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-spotify-green via-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg">
                    {phase === 'done' ? (
                      <Check size={28} className="text-black stroke-[3]" />
                    ) : (
                      <Disc3 size={28} className="text-black/85" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-emerald-300">
              <Sparkles size={12} />
              <span>v{defaults?.appVersion || '1.0.0'} • Audio Studio</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Your Music,{' '}
              <GradientText colors={['#1ed760', '#a7f3d0', '#38bdf8', '#1ed760']} className="font-black">
                Reimagined.
              </GradientText>
            </h1>
            <p className="text-xs text-white/60 leading-relaxed max-w-[260px] mx-auto">
              Offline-first desktop audio studio. Plays all local audio formats natively with zero restrictions.
            </p>
          </div>
        </div>

        {/* Right Interactive Setup Panel */}
        <div className="col-span-7 flex flex-col justify-center">
          {phase === 'config' && (
            <div className="space-y-4">
              {/* Install Path Card */}
              <div className="p-4 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-2xl space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                    <HardDrive size={13} className="text-spotify-green" />
                    Install Location
                  </span>
                  <div className="flex items-center gap-2">
                    {isExistingInstall && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                        Update Mode (Library Safe)
                      </span>
                    )}
                    <span className="text-[11px] text-white/50 font-medium">
                      {formatBytes(defaults?.requiredBytes || 335 * 1024 * 1024)} needed
                      {freeBytes > 0 ? ` • ${formatBytes(freeBytes)} free` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white/90 truncate">
                    {installDir}
                  </div>
                  <button
                    onClick={handleBrowse}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <FolderOpen size={14} />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              {/* Clean Setup Toggles */}
              <div className="rounded-2xl bg-white/[0.05] border border-white/12 backdrop-blur-2xl divide-y divide-white/10 shadow-xl">
                <ToggleRow
                  icon={<Monitor size={16} className="text-emerald-400" />}
                  title="Create Desktop Shortcut"
                  desc="Quick launch icon directly on your desktop"
                  enabled={desktopShortcut}
                  onToggle={() => setDesktopShortcut((v) => !v)}
                />
                <ToggleRow
                  icon={<LayoutGrid size={16} className="text-cyan-400" />}
                  title="Add to Start Menu"
                  desc="Pin and search VYBE cleanly in Windows Start"
                  enabled={startMenuShortcut}
                  onToggle={() => setStartMenuShortcut((v) => !v)}
                />
                <ToggleRow
                  icon={<Zap size={16} className="text-indigo-400" />}
                  title="Start VYBE with Windows"
                  desc="Launch silently into your audio library on sign-in"
                  enabled={startWithWindows}
                  onToggle={() => setStartWithWindows((v) => !v)}
                />
              </div>

              {/* CTA Row */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => window.electronAPI?.close()}
                  className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-white/75 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartInstall}
                  className="px-7 py-3 rounded-full bg-gradient-to-r from-spotify-green via-emerald-400 to-cyan-400 text-black text-xs sm:text-sm font-black tracking-wide flex items-center gap-2 shadow-[0_0_28px_rgba(30,215,96,0.4)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <span>{isExistingInstall ? 'Update VYBE' : 'Install VYBE'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {phase === 'installing' && (
            <div className="p-6 rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-2xl space-y-6 shadow-2xl">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-spotify-green">
                    Installing Audio Studio
                  </p>
                  <h2 className="text-xl font-black mt-1 text-white">{stepLabel}</h2>
                </div>
                <span className="text-3xl font-black tabular-nums text-white">{progress}%</span>
              </div>

              <div className="w-full h-3 rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-spotify-green via-emerald-400 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_16px_rgba(30,215,96,0.6)]"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-white/65">
                <StepBadge done={progress >= 15} text="Extracting audio engine" />
                <StepBadge done={progress >= 78} text="Building program folder" />
                <StepBadge done={progress >= 88} text="Creating Windows shortcuts" />
                <StepBadge done={progress >= 96} text="Registering uninstaller" />
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="p-6 rounded-3xl bg-white/[0.07] border border-emerald-400/25 backdrop-blur-2xl space-y-5 shadow-2xl">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-300">
                  <Check size={12} /> Setup Finished
                </span>
                <h2 className="text-2xl font-black text-white">VYBE is ready on your PC.</h2>
                <p className="text-xs text-white/65 leading-relaxed">
                  Installed to <span className="font-mono text-white/90">{installDir}</span>. All audio formats work out of the box.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleLaunch}
                  className="px-7 py-3 rounded-full bg-white text-black text-xs sm:text-sm font-black flex items-center gap-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  <span>{defaults?.isPreview ? 'Finish Preview' : 'Launch VYBE'}</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => window.electronAPI?.close()}
                  className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="p-6 rounded-3xl bg-red-500/10 border border-red-400/30 backdrop-blur-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-red-300 font-bold text-sm">
                <AlertCircle size={18} />
                <span>Installation Interrupted</span>
              </div>
              <p className="text-xs text-white/75 leading-relaxed">{errorMessage}</p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setPhase('config')}
                  className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-black cursor-pointer"
                >
                  Back to Options
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-20 px-6 pb-3 flex items-center justify-between text-[11px] text-white/35">
        <span>VYBE Offline Audio Engine • Zero Telemetry</span>
        <span>Windows Per-User Clean Install</span>
      </footer>
    </div>
  );
};

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ icon, title, desc, enabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{title}</p>
        <p className="text-[11px] text-white/50 truncate">{desc}</p>
      </div>
    </div>
    <div
      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
        enabled ? 'bg-spotify-green justify-end' : 'bg-white/15 justify-start'
      }`}
    >
      <div className="w-5 h-5 rounded-full bg-white shadow-md" />
    </div>
  </button>
);

const StepBadge: React.FC<{ done: boolean; text: string }> = ({ done, text }) => (
  <div className={`flex items-center gap-2 transition-colors ${done ? 'text-white' : 'text-white/40'}`}>
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
        done ? 'bg-spotify-green border-spotify-green text-black' : 'border-white/25'
      }`}
    >
      {done && <Check size={10} className="stroke-[3]" />}
    </div>
    <span className="font-medium">{text}</span>
  </div>
);
