import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Disc,
  Sliders,
  Mic2,
  Sparkles,
  BarChart3,
  FolderOpen,
  Headphones,
  Palette,
  Keyboard,
  ShieldCheck,
  Check,
  Music2,
  Waves,
  X
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Aurora, ShinyText, GradientText, StarBorder } from './reactbits';
import { SpotifyLogoIcon } from './SpotifyIcons';

interface SlideSpec {
  id: string;
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  colorStops: [string, string, string];
  accent: string;
  bullets: { icon: React.ReactNode; label: string; desc: string }[];
}

const SLIDES: SlideSpec[] = [
  {
    id: 'welcome',
    badge: 'WELCOME TO VYBE',
    title: 'Your Music,',
    highlight: 'Reimagined.',
    subtitle:
      'An offline-first, high-fidelity desktop music studio built for audiophiles. Zero ads, zero tracking, pure atmosphere.',
    colorStops: ['#1ed760', '#0ea5e9', '#08080c'],
    accent: '#1ed760',
    bullets: [
      {
        icon: <ShieldCheck size={16} className="text-spotify-green" />,
        label: '100% Private & Local',
        desc: 'Your library stays on your device — always.'
      },
      {
        icon: <Sparkles size={16} className="text-sky-400" />,
        label: 'Studio Aesthetics',
        desc: 'Fluid glassmorphism, vinyl physics & dynamic color.'
      }
    ]
  },
  {
    id: 'library',
    badge: '01 / LOSSLESS LIBRARY',
    title: 'Every Format.',
    highlight: 'Instant Launch.',
    subtitle:
      'Drop in FLAC, WAV, MP3, M4A, AAC, OGG, or OPUS files. Watched folders auto-sync in the background while cached libraries restore in under 10ms.',
    colorStops: ['#06b6d4', '#3b82f6', '#08080c'],
    accent: '#06b6d4',
    bullets: [
      {
        icon: <Disc size={16} className="text-cyan-400" />,
        label: 'Hi-Res Format Badges',
        desc: 'Displays exact bitrate, sample rate & codec.'
      },
      {
        icon: <FolderOpen size={16} className="text-blue-400" />,
        label: 'Watched Folders & Drag-Drop',
        desc: 'Point once — new songs appear automatically.'
      }
    ]
  },
  {
    id: 'audio-lab',
    badge: '02 / STUDIO AUDIO LAB',
    title: 'Sculpt Your',
    highlight: 'Signature Sound.',
    subtitle:
      'Dial in a real-time 6-band Web Audio equalizer with curated presets, preamp boost, volume normalization, and silky 0–12s crossfades.',
    colorStops: ['#a855f7', '#6366f1', '#08080c'],
    accent: '#a855f7',
    bullets: [
      {
        icon: <Sliders size={16} className="text-purple-400" />,
        label: '6-Band EQ + Custom Presets',
        desc: '60Hz sub-bass to 16kHz sparkle with zero latency.'
      },
      {
        icon: <Waves size={16} className="text-indigo-400" />,
        label: 'Gapless & Crossfade',
        desc: 'Dual-deck engine blends tracks seamlessly.'
      }
    ]
  },
  {
    id: 'theater',
    badge: '03 / THEATER MODE',
    title: 'Cinema For',
    highlight: 'Your Ears.',
    subtitle:
      'Press F anytime to enter Fullscreen Theater Mode. Spin a realistic Vinyl Turntable, tilt 3D album art, and watch 5 live bass-reactive visualizers.',
    colorStops: ['#f59e0b', '#ef4444', '#08080c'],
    accent: '#f59e0b',
    bullets: [
      {
        icon: <Disc size={16} className="text-amber-400" />,
        label: 'Vinyl, 3D Art & Visualizers',
        desc: 'Bars, Waveform, Fluid, Radial & Particles.'
      },
      {
        icon: <Headphones size={16} className="text-rose-400" />,
        label: 'Bass-Reactive Glow',
        desc: 'Lighting pulses organically with your beat.'
      }
    ]
  },
  {
    id: 'lyrics',
    badge: '04 / SYNCED LYRICS',
    title: 'Feel Every',
    highlight: 'Single Word.',
    subtitle:
      'Automatic LRCLIB & local .lrc synced lyrics with spring-damped scrolling, live ±0.5s sync tuning, and album-extracted Aurora backgrounds.',
    colorStops: ['#ec4899', '#8b5cf6', '#08080c'],
    accent: '#ec4899',
    bullets: [
      {
        icon: <Mic2 size={16} className="text-pink-400" />,
        label: 'Multi-Script Typography',
        desc: 'Crisp Latin & Devanagari fonts bundled offline.'
      },
      {
        icon: <Palette size={16} className="text-violet-400" />,
        label: 'Dynamic Cover Moods',
        desc: 'Colors shift automatically for every album.'
      }
    ]
  },
  {
    id: 'smart-stats',
    badge: '05 / PLAYLISTS & STATS',
    title: 'Curate, Design',
    highlight: '& Track.',
    subtitle:
      'Organize with nested folders and Smart Rules, paint custom playlist covers in the Cover Designer, and explore your personal Listening Stats.',
    colorStops: ['#10b981', '#14b8a6', '#08080c'],
    accent: '#10b981',
    bullets: [
      {
        icon: <BarChart3 size={16} className="text-emerald-400" />,
        label: 'Listening Wrapped & Heatmaps',
        desc: 'Top tracks, peak hours & session streaks.'
      },
      {
        icon: <Sparkles size={16} className="text-teal-400" />,
        label: 'Custom Cover Studio',
        desc: 'Craft bespoke gradients, icons & titles.'
      }
    ]
  },
  {
    id: 'themes-power',
    badge: '06 / THEMES & CONTROLS',
    title: 'Tailored To',
    highlight: 'Your Vibe.',
    subtitle:
      'Switch between Hazy Acrylic Glass, True AMOLED Black, or Dynamic Album Tinting. Master playback with A–B Loops, Sleep Timer & Shortcuts (?).',
    colorStops: ['#38bdf8', '#818cf8', '#08080c'],
    accent: '#38bdf8',
    bullets: [
      {
        icon: <Palette size={16} className="text-sky-400" />,
        label: 'Hazy Glass & AMOLED',
        desc: 'Adjustable frosted blur or pure pitch black.'
      },
      {
        icon: <Keyboard size={16} className="text-indigo-400" />,
        label: 'Global Media Keys & Tray',
        desc: 'Control music from anywhere on your PC.'
      }
    ]
  },
  {
    id: 'thank-you',
    badge: 'ALL SET • READY TO PLAY',
    title: 'Thank You For',
    highlight: 'Choosing VYBE.',
    subtitle:
      'Your personal music sanctuary is ready. Add a music folder now or jump straight in — you can always replay this tour from Settings.',
    colorStops: ['#1ed760', '#a855f7', '#08080c'],
    accent: '#1ed760',
    bullets: [
      {
        icon: <Check size={16} className="text-spotify-green" />,
        label: 'Everything Persists Automatically',
        desc: 'Your song, position & settings stay saved.'
      },
      {
        icon: <Music2 size={16} className="text-purple-400" />,
        label: 'Press ? Anytime',
        desc: 'Discover keyboard shortcuts & pro tips.'
      }
    ]
  }
];

export const WelcomeTourModal: React.FC = () => {
  const { isWelcomeOpen, completeWelcomeTour, pickNativeAudioFolder, pickNativeAudioFiles, fileInputRef } =
    usePlayer();
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (isWelcomeOpen) {
      setStep(0);
      setAnimKey(k => k + 1);
    }
  }, [isWelcomeOpen]);

  const goTo = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(SLIDES.length - 1, next)));
    setAnimKey(k => k + 1);
  }, []);

  const handleNext = useCallback(() => {
    if (step < SLIDES.length - 1) {
      goTo(step + 1);
    } else {
      completeWelcomeTour();
    }
  }, [step, goTo, completeWelcomeTour]);

  const handlePrev = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  useEffect(() => {
    if (!isWelcomeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        completeWelcomeTour();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isWelcomeOpen, handleNext, handlePrev, completeWelcomeTour]);

  if (!isWelcomeOpen) return null;

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-between p-5 sm:p-8 md:p-10 select-none overflow-hidden animate-in fade-in duration-500"
      style={{
        background: `radial-gradient(circle at 38% 32%, ${slide.accent}35 0%, #08080c 78%)`,
        transition: 'background 700ms ease'
      }}
    >
      {/* Theater-Mode Animated Aurora Backdrop */}
      <Aurora colorStops={slide.colorStops} className="opacity-55 pointer-events-none transition-opacity duration-700" />

      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-xl shadow-lg">
            <SpotifyLogoIcon size={22} className="text-white" />
          </div>
          <div>
            <ShinyText text="VYBE STUDIO" className="font-extrabold text-xs tracking-[0.2em] uppercase" />
            <p className="text-[11px] text-white/50">First-Time Experience</p>
          </div>
        </div>

        <button
          onClick={completeWelcomeTour}
          className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-xl"
        >
          <span>Skip Tour</span>
          <X size={14} />
        </button>
      </div>

      {/* Main Glassmorphic Stage */}
      <div className="relative z-20 flex-1 flex items-center justify-center my-4">
        <div
          key={animKey}
          className="max-w-5xl w-full rounded-3xl bg-black/45 backdrop-blur-3xl border border-white/15 p-6 sm:p-10 md:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.85)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in zoom-in-95 duration-400"
        >
          {/* Left: Visual Showcase (Theater-Mode Inspired) */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <SlideVisual slideId={slide.id} accent={slide.accent} />
          </div>

          {/* Right: Editorial Copy & Feature Highlights */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: slide.accent }}
              />
              <ShinyText text={slide.badge} className="text-[11px] font-extrabold tracking-widest uppercase" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-white">
              {slide.title}{' '}
              <GradientText
                colors={[slide.accent, '#ffffff', slide.colorStops[1], slide.accent]}
                animationSpeed={6}
                className="font-black"
              >
                {slide.highlight}
              </GradientText>
            </h1>

            <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-xl">
              {slide.subtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {slide.bullets.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md flex items-start gap-3 hover:bg-white/[0.08] transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {b.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{b.label}</p>
                    <p className="text-[11px] text-white/60 leading-snug mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {isLast && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (window.electronAPI) {
                      await pickNativeAudioFolder();
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <FolderOpen size={15} className="text-spotify-green" />
                  <span>Add Music Folder</span>
                </button>
                {window.electronAPI && (
                  <button
                    onClick={() => void pickNativeAudioFiles()}
                    className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    Pick Individual Songs
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Progress Dots */}
      <div className="relative z-20 max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={isFirst}
          className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
            isFirst
              ? 'opacity-0 pointer-events-none'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer active:scale-95'
          }`}
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        {/* Progress Indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              title={`Slide ${i + 1}`}
              className="h-2 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: i === step ? '28px' : '8px',
                backgroundColor: i === step ? slide.accent : 'rgba(255,255,255,0.22)'
              }}
            />
          ))}
        </div>

        {isLast ? (
          <StarBorder color={slide.accent} speed="4s" className="rounded-full">
            <button
              onClick={completeWelcomeTour}
              className="px-7 py-2.5 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs sm:text-sm font-black tracking-wide flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(30,215,96,0.45)]"
            >
              <span>Enter VYBE</span>
              <ArrowRight size={16} />
            </button>
          </StarBorder>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-white/90 text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <span>{isFirst ? "Let's Explore" : 'Next'}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/* Bespoke Theater-Mode-styled animated visual per slide */
const SlideVisual: React.FC<{ slideId: string; accent: string }> = ({ slideId, accent }) => {
  if (slideId === 'welcome' || slideId === 'thank-you') {
    return (
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-45 animate-pulse"
          style={{ background: accent }}
        />
        <div
          className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-white/20 shadow-2xl flex items-center justify-center animate-[spin_14s_linear_infinite]"
          style={{
            background:
              'repeating-radial-gradient(circle at center, #111 0px, #111 4px, #1c1c22 5px, #111 6px)'
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner border-4 border-black/80"
            style={{ background: `linear-gradient(135deg, ${accent}, #6366f1)` }}
          >
            <SpotifyLogoIcon size={34} className="text-white drop-shadow" />
          </div>
        </div>
      </div>
    );
  }

  if (slideId === 'library') {
    const badges = [
      { ext: 'FLAC', meta: '24-bit / 96kHz', color: '#06b6d4' },
      { ext: 'WAV', meta: 'Uncompressed', color: '#3b82f6' },
      { ext: 'MP3', meta: '320 kbps CBR', color: '#10b981' },
      { ext: 'OPUS', meta: 'Lossless Stream', color: '#8b5cf6' }
    ];
    return (
      <div className="w-full max-w-[270px] space-y-2.5">
        {badges.map((b, i) => (
          <div
            key={b.ext}
            className="p-3 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-xl flex items-center justify-between shadow-lg"
            style={{ transform: `translateX(${i % 2 === 0 ? '-6px' : '6px'})` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-1 rounded-lg text-[11px] font-black text-black"
                style={{ backgroundColor: b.color }}
              >
                {b.ext}
              </span>
              <span className="text-xs font-bold text-white">{b.meta}</span>
            </div>
            <Check size={14} className="text-white/70" />
          </div>
        ))}
      </div>
    );
  }

  if (slideId === 'audio-lab') {
    const bars = [55, 82, 45, 70, 90, 65];
    const freqs = ['60', '230', '910', '3.6k', '8k', '16k'];
    return (
      <div className="w-full max-w-[270px] p-5 rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">6-Band Studio EQ</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-400/30">
            +4.5 dB
          </span>
        </div>
        <div className="flex items-end justify-between h-32 gap-2 px-1">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-white/10 rounded-full h-full relative overflow-hidden flex items-end">
                <div
                  className="w-full rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top, ${accent}, #ec4899)`,
                    animationDelay: `${i * 150}ms`
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-white/60">{freqs[i]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slideId === 'theater') {
    return (
      <div className="relative w-60 h-52 rounded-3xl bg-gradient-to-br from-amber-500/20 via-black/60 to-rose-500/20 border border-white/20 p-4 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        <div className="w-28 h-28 rounded-full border-4 border-white/15 bg-black flex items-center justify-center animate-[spin_6s_linear_infinite] shadow-[0_0_40px_rgba(245,158,11,0.4)]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 border-2 border-black" />
        </div>
        <div className="flex items-end gap-1 mt-4 h-6">
          {[40, 85, 60, 100, 75, 90, 50, 80, 65].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-amber-400 animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (slideId === 'lyrics') {
    return (
      <div className="w-full max-w-[270px] p-5 rounded-3xl bg-gradient-to-b from-pink-500/35 via-purple-900/30 to-black/70 border border-white/20 shadow-2xl space-y-3 text-left">
        <p className="text-sm font-bold text-white/35 blur-[0.5px]">मीठे मीठे हाँ...</p>
        <p
          className="text-xl sm:text-2xl font-black text-white leading-snug"
          style={{ textShadow: '0 0 22px rgba(255,255,255,0.75), 0 0 40px #ec4899' }}
        >
          जुबा है फीकी शाम से
        </p>
        <p className="text-sm font-bold text-white/40 blur-[0.4px]">हुई ना तुझसे बात भी</p>
      </div>
    );
  }

  if (slideId === 'smart-stats') {
    return (
      <div className="w-full max-w-[270px] p-5 rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-xl shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">Listening Stats</span>
          <BarChart3 size={16} className="text-emerald-400" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
            <p className="text-lg font-black text-white">42.5h</p>
            <p className="text-[10px] text-white/55">Time Played</p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
            <p className="text-lg font-black text-emerald-400">128</p>
            <p className="text-[10px] text-white/55">Tracks Loved</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/25 text-[11px] font-bold text-white text-center">
          Custom Cover Designer Included ✨
        </div>
      </div>
    );
  }

  // themes-power
  return (
    <div className="w-full max-w-[270px] space-y-2.5">
      {[
        { name: 'Hazy Acrylic Glass', desc: 'Frosted translucent blur', dot: '#38bdf8' },
        { name: 'True AMOLED Black', desc: 'Pure #000000 contrast', dot: '#ffffff' },
        { name: 'Dynamic Album Glow', desc: 'Adapts to every cover', dot: '#a855f7' }
      ].map(t => (
        <div
          key={t.name}
          className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-xl flex items-center gap-3 shadow-lg"
        >
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.dot }} />
          <div>
            <p className="text-xs font-bold text-white">{t.name}</p>
            <p className="text-[10px] text-white/55">{t.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
