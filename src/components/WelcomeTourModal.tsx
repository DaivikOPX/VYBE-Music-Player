import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  X,
  Volume2
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
      'An offline-first, high-fidelity desktop music studio built for audiophiles. Zero subscriptions, zero tracking, pure atmosphere.',
    colorStops: ['#1ed760', '#0ea5e9', '#08080c'],
    accent: '#1ed760',
    bullets: [
      {
        icon: <ShieldCheck size={18} className="text-spotify-green" />,
        label: '100% Private & Local',
        desc: 'Your files and playlists stay on your device forever.'
      },
      {
        icon: <Sparkles size={18} className="text-sky-400" />,
        label: 'Studio Acrylic Aesthetics',
        desc: 'Liquid glass, vinyl turntable physics & adaptive colors.'
      }
    ]
  },
  {
    id: 'library',
    badge: '01 / LOSSLESS LIBRARY',
    title: 'Every Format.',
    highlight: 'Instant Launch.',
    subtitle:
      'Drop in FLAC, WAV, MP3, M4A, AAC, OGG, or OPUS files. Watched folders auto-sync in the background while your cached library restores in under 10ms.',
    colorStops: ['#06b6d4', '#3b82f6', '#08080c'],
    accent: '#06b6d4',
    bullets: [
      {
        icon: <Disc size={18} className="text-cyan-400" />,
        label: 'Hi-Res Format Badges',
        desc: 'Live readout of bitrate, sample rate, bit depth & codec.'
      },
      {
        icon: <FolderOpen size={18} className="text-blue-400" />,
        label: 'Watched Folders & Drag-Drop',
        desc: 'Point once — new songs appear automatically in library.'
      }
    ]
  },
  {
    id: 'audio-lab',
    badge: '02 / STUDIO AUDIO LAB',
    title: 'Sculpt Your',
    highlight: 'Signature Sound.',
    subtitle:
      'Dial in a real-time 6-band Web Audio equalizer with curated presets, preamp gain boost, volume normalization, and silky 0–12s crossfading.',
    colorStops: ['#a855f7', '#6366f1', '#08080c'],
    accent: '#a855f7',
    bullets: [
      {
        icon: <Sliders size={18} className="text-purple-400" />,
        label: '6-Band Studio EQ',
        desc: 'Sub-bass 60Hz to treble 16kHz with live preamp gain.'
      },
      {
        icon: <Waves size={18} className="text-indigo-400" />,
        label: 'Gapless & Seamless Crossfade',
        desc: 'Dual-deck hardware engine eliminates dead silence.'
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
        icon: <Disc size={18} className="text-amber-400" />,
        label: 'Vinyl, 3D Art & Visualizers',
        desc: 'Bars, Waveform, Fluid, Radial & Particles modes.'
      },
      {
        icon: <Headphones size={18} className="text-rose-400" />,
        label: 'Bass-Reactive Lighting',
        desc: 'Ambient lighting pulses dynamically with the music kick.'
      }
    ]
  },
  {
    id: 'lyrics',
    badge: '04 / SYNCED LYRICS',
    title: 'Feel Every',
    highlight: 'Single Word.',
    subtitle:
      'Automatic LRCLIB & local .lrc synced lyrics with spring-damped scrolling, live ±0.5s sync calibration, and album-extracted Aurora backgrounds.',
    colorStops: ['#ec4899', '#8b5cf6', '#08080c'],
    accent: '#ec4899',
    bullets: [
      {
        icon: <Mic2 size={18} className="text-pink-400" />,
        label: 'Multi-Script Typography',
        desc: 'Crisp Latin & Devanagari Hindi fonts bundled offline.'
      },
      {
        icon: <Palette size={18} className="text-violet-400" />,
        label: 'Dynamic Spotify Backgrounds',
        desc: 'Vibrant cover gradients transition for every song.'
      }
    ]
  },
  {
    id: 'smart-stats',
    badge: '05 / PLAYLISTS & STATS',
    title: 'Curate, Design',
    highlight: '& Track.',
    subtitle:
      'Organize with nested folders and Smart Rules, paint bespoke playlist artwork in the Cover Designer, and explore your personal Listening Stats.',
    colorStops: ['#10b981', '#14b8a6', '#08080c'],
    accent: '#10b981',
    bullets: [
      {
        icon: <BarChart3 size={18} className="text-emerald-400" />,
        label: 'Listening Wrapped & Heatmaps',
        desc: 'Track top artists, listening streaks & peak listening hours.'
      },
      {
        icon: <Sparkles size={18} className="text-teal-400" />,
        label: 'Custom Cover Studio',
        desc: 'Craft gradients, icons, and typography for every playlist.'
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
        icon: <Palette size={18} className="text-sky-400" />,
        label: 'Hazy Glass & AMOLED Modes',
        desc: 'Fine-tune frosted acrylic blur or pure #000000 pitch black.'
      },
      {
        icon: <Keyboard size={18} className="text-indigo-400" />,
        label: 'Global Media Keys & Tray',
        desc: 'Control playback from anywhere without switching windows.'
      }
    ]
  },
  {
    id: 'thank-you',
    badge: 'ALL SET • READY TO PLAY',
    title: 'Thank You For',
    highlight: 'Choosing VYBE.',
    subtitle:
      'Your personal music sanctuary is ready. Add a music folder now or jump straight into the player — you can replay this tour anytime from Settings.',
    colorStops: ['#1ed760', '#a855f7', '#08080c'],
    accent: '#1ed760',
    bullets: [
      {
        icon: <Check size={18} className="text-spotify-green" />,
        label: 'Auto-Persistence Active',
        desc: 'Song, queue, volume & settings stay saved forever.'
      },
      {
        icon: <Music2 size={18} className="text-purple-400" />,
        label: 'Press ? Anytime',
        desc: 'Discover pro shortcuts, gestures, and audio tools.'
      }
    ]
  }
];

export const WelcomeTourModal: React.FC = () => {
  const {
    isWelcomeOpen,
    completeWelcomeTour,
    pickNativeAudioFolder,
    pickNativeAudioFiles,
    fileInputRef
  } = usePlayer();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isWelcomeOpen) {
      setCurrentIndex(0);
    }
  }, [isWelcomeOpen]);

  const goTo = useCallback((next: number) => {
    setCurrentIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      completeWelcomeTour();
    }
  }, [currentIndex, goTo, completeWelcomeTour]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

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

  // Touch & swipe gestures for touchscreens & mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) handleNext();
    if (diff < -50) handlePrev();
    setTouchStart(null);
  };

  if (!isWelcomeOpen) return null;

  const currentSlide = SLIDES[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[9999] w-screen h-screen bg-[#050508] flex flex-col justify-between select-none overflow-hidden"
      style={{
        backgroundColor: '#050508',
        backgroundImage: `radial-gradient(circle at 45% 30%, ${currentSlide.accent}30 0%, #060609 82%)`,
        transition: 'background-image 850ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Immersive Theater-Mode Animated Aurora Backdrop */}
      <Aurora
        colorStops={currentSlide.colorStops}
        className="opacity-50 pointer-events-none transition-opacity duration-1000"
      />

      {/* Floating Glassmorphic Top Nav */}
      <header className="relative z-30 w-full px-6 md:px-12 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-2xl shadow-xl transition-colors duration-700"
            style={{ backgroundColor: `${currentSlide.accent}25` }}
          >
            <SpotifyLogoIcon size={24} className="text-white" />
          </div>
          <div>
            <ShinyText text="VYBE AUDIO STUDIO" className="font-black text-xs sm:text-sm tracking-[0.22em] uppercase text-white" />
            <p className="text-[11px] text-white/50 hidden sm:block">First-Time Setup Experience</p>
          </div>
        </div>

        <button
          onClick={completeWelcomeTour}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white/80 hover:text-white transition-all cursor-pointer flex items-center gap-2 backdrop-blur-2xl active:scale-95 shadow-lg"
        >
          <span>Skip Tour</span>
          <X size={15} />
        </button>
      </header>

      {/* TRUE FULL-SCREEN SMOOTH HORIZONTAL CAROUSEL TRACK */}
      <div className="relative z-20 flex-1 w-full overflow-hidden flex items-center">
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(-${currentIndex * 100}%, 0, 0)`,
            transition: 'transform 750ms cubic-bezier(0.2, 0.9, 0.2, 1)'
          }}
        >
          {SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={slide.id}
                className="w-full h-full flex-shrink-0 flex items-center justify-center px-6 md:px-16 lg:px-24 py-4"
                style={{
                  opacity: isActive ? 1 : 0.25,
                  transform: isActive ? 'scale(1)' : 'scale(0.96)',
                  transition: 'opacity 750ms ease, transform 750ms cubic-bezier(0.2, 0.9, 0.2, 1)'
                }}
              >
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                  {/* Left Column: Visual Showcase */}
                  <div className="lg:col-span-5 flex items-center justify-center order-2 lg:order-1">
                    <SlideVisual slideId={slide.id} accent={slide.accent} />
                  </div>

                  {/* Right Column: Editorial Typography & Features */}
                  <div className="lg:col-span-7 space-y-6 text-left order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl shadow-lg">
                      <span
                        className="w-2.5 h-2.5 rounded-full animate-ping"
                        style={{ backgroundColor: slide.accent }}
                      />
                      <ShinyText text={slide.badge} className="text-xs font-black tracking-widest uppercase" />
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-white">
                      {slide.title}{' '}
                      <GradientText
                        colors={[slide.accent, '#ffffff', slide.colorStops[1], slide.accent]}
                        animationSpeed={6}
                        className="font-black"
                      >
                        {slide.highlight}
                      </GradientText>
                    </h1>

                    <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl font-medium">
                      {slide.subtitle}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      {slide.bullets.map((b, bIdx) => (
                        <div
                          key={bIdx}
                          className="p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 backdrop-blur-2xl flex items-start gap-3.5 transition-all shadow-xl"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border border-white/15 shadow-inner"
                            style={{ backgroundColor: `${slide.accent}20` }}
                          >
                            {b.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white">{b.label}</p>
                            <p className="text-xs text-white/65 leading-snug mt-1">{b.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {idx === SLIDES.length - 1 && (
                      <div className="flex flex-wrap items-center gap-3.5 pt-3 animate-in fade-in duration-500">
                        <button
                          onClick={async () => {
                            if (window.electronAPI) {
                              await pickNativeAudioFolder();
                            } else {
                              fileInputRef.current?.click();
                            }
                          }}
                          className="px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer flex items-center gap-2.5 active:scale-95 shadow-xl backdrop-blur-xl"
                        >
                          <FolderOpen size={16} className="text-spotify-green" />
                          <span>Add Music Folder</span>
                        </button>
                        {window.electronAPI && (
                          <button
                            onClick={() => void pickNativeAudioFiles()}
                            className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs sm:text-sm font-bold text-white/80 hover:text-white transition-all cursor-pointer"
                          >
                            Pick Individual Songs
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Glassmorphic Bottom Navigation Bar */}
      <footer className="relative z-30 w-full px-6 md:px-12 pb-6 pt-3 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={isFirst}
          className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all backdrop-blur-2xl ${
            isFirst
              ? 'opacity-0 pointer-events-none'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer active:scale-95 shadow-lg'
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Progress Pills (Clickable with liquid stretch) */}
        <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-2xl px-4 py-2 rounded-full border border-white/15 shadow-xl">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              title={s.badge}
              className="h-2 rounded-full transition-all duration-500 cursor-pointer"
              style={{
                width: i === currentIndex ? '32px' : '8px',
                backgroundColor: i === currentIndex ? currentSlide.accent : 'rgba(255,255,255,0.25)',
                boxShadow: i === currentIndex ? `0 0 14px ${currentSlide.accent}` : 'none'
              }}
            />
          ))}
        </div>

        {isLast ? (
          <StarBorder color={currentSlide.accent} speed="3.5s" className="rounded-full">
            <button
              onClick={completeWelcomeTour}
              className="px-8 py-3 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs sm:text-sm font-black tracking-wide flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(30,215,96,0.55)]"
            >
              <span>Enter VYBE</span>
              <ArrowRight size={17} />
            </button>
          </StarBorder>
        ) : (
          <button
            onClick={handleNext}
            className="px-7 py-3 rounded-full bg-white text-black hover:bg-white/95 text-xs sm:text-sm font-black flex items-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-2xl"
          >
            <span>{isFirst ? "Let's Explore" : 'Next'}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </footer>
    </div>
  );
};

/* Bespoke Theater-Mode visual showcase per slide */
const SlideVisual: React.FC<{ slideId: string; accent: string }> = ({ slideId, accent }) => {
  if (slideId === 'welcome' || slideId === 'thank-you') {
    return (
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-[90px] opacity-45 animate-pulse"
          style={{ background: accent }}
        />
        <div
          className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full border border-white/20 shadow-[0_20px_70px_rgba(0,0,0,0.8)] flex items-center justify-center animate-[spin_12s_linear_infinite]"
          style={{
            background:
              'repeating-radial-gradient(circle at center, #0d0d10 0px, #0d0d10 4px, #1a1a24 5px, #0d0d10 6px)'
          }}
        >
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-2xl border-4 border-black/85"
            style={{ background: `linear-gradient(135deg, ${accent}, #6366f1)` }}
          >
            <SpotifyLogoIcon size={44} className="text-white drop-shadow-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (slideId === 'library') {
    const badges = [
      { ext: 'FLAC', meta: '24-bit / 96kHz Lossless', color: '#06b6d4' },
      { ext: 'WAV', meta: '32-bit Float Uncompressed', color: '#3b82f6' },
      { ext: 'MP3', meta: '320 kbps Crisp Audio', color: '#10b981' },
      { ext: 'OPUS', meta: 'Next-Gen Low Latency', color: '#8b5cf6' }
    ];
    return (
      <div className="w-full max-w-[340px] space-y-3">
        {badges.map((b, i) => (
          <div
            key={b.ext}
            className="p-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-2xl flex items-center justify-between shadow-2xl transition-all"
            style={{ transform: `translateX(${i % 2 === 0 ? '-10px' : '10px'})` }}
          >
            <div className="flex items-center gap-3.5">
              <span
                className="px-3 py-1.5 rounded-xl text-xs font-black text-black shadow-md"
                style={{ backgroundColor: b.color }}
              >
                {b.ext}
              </span>
              <span className="text-sm font-bold text-white">{b.meta}</span>
            </div>
            <Check size={16} className="text-white/80" />
          </div>
        ))}
      </div>
    );
  }

  if (slideId === 'audio-lab') {
    const bars = [58, 88, 48, 76, 96, 68];
    const freqs = ['60Hz', '230Hz', '910Hz', '3.6kHz', '8kHz', '16kHz'];
    return (
      <div className="w-full max-w-[340px] p-6 rounded-3xl bg-white/[0.08] border border-white/20 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-purple-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">6-Band Studio EQ</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/35">
            +4.5 dB Boost
          </span>
        </div>
        <div className="flex items-end justify-between h-40 gap-3 px-1">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2.5 h-full justify-end">
              <div className="w-full bg-white/10 rounded-full h-full relative overflow-hidden flex items-end">
                <div
                  className="w-full rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top, ${accent}, #ec4899)`,
                    animationDelay: `${i * 120}ms`
                  }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-white/70">{freqs[i]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slideId === 'theater') {
    return (
      <div className="relative w-72 h-64 sm:w-80 sm:h-72 rounded-3xl bg-gradient-to-br from-amber-500/25 via-black/70 to-rose-500/25 border border-white/25 p-6 flex flex-col items-center justify-center shadow-2xl overflow-hidden backdrop-blur-2xl">
        <div className="w-36 h-36 rounded-full border-4 border-white/20 bg-black flex items-center justify-center animate-[spin_5s_linear_infinite] shadow-[0_0_50px_rgba(245,158,11,0.5)]">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 border-2 border-black flex items-center justify-center">
            <Volume2 size={20} className="text-black" />
          </div>
        </div>
        <div className="flex items-end gap-1.5 mt-5 h-8">
          {[40, 85, 60, 100, 75, 90, 50, 80, 65, 95, 70].map((h, i) => (
            <div
              key={i}
              className="w-2 rounded-full bg-amber-400 animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (slideId === 'lyrics') {
    return (
      <div className="w-full max-w-[340px] p-6 rounded-3xl bg-gradient-to-b from-pink-500/35 via-purple-900/35 to-black/80 border border-white/25 shadow-2xl space-y-4 text-left backdrop-blur-2xl">
        <p className="text-base font-bold text-white/40 blur-[0.6px]">Lost in the midnight glow...</p>
        <p
          className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight"
          style={{ textShadow: '0 0 25px rgba(255,255,255,0.85), 0 0 50px #ec4899' }}
        >
          Every beat feels like home
        </p>
        <p className="text-base font-bold text-white/50 blur-[0.4px]">Dancing through the stereo</p>
      </div>
    );
  }

  if (slideId === 'smart-stats') {
    return (
      <div className="w-full max-w-[340px] p-6 rounded-3xl bg-white/[0.08] border border-white/20 backdrop-blur-2xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Listening Wrapped</span>
          <BarChart3 size={18} className="text-emerald-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10">
            <p className="text-2xl font-black text-white">42.5h</p>
            <p className="text-xs text-white/60">Time Played</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10">
            <p className="text-2xl font-black text-emerald-400">128</p>
            <p className="text-xs text-white/60">Tracks Loved</p>
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-400/30 text-xs font-bold text-white text-center shadow-lg">
          Custom Cover Designer Studio Included ✨
        </div>
      </div>
    );
  }

  // themes-power
  return (
    <div className="w-full max-w-[340px] space-y-3">
      {[
        { name: 'Hazy Acrylic Glass', desc: 'Frosted translucent blur depth', dot: '#38bdf8' },
        { name: 'True AMOLED Black', desc: '100% #000000 high-contrast', dot: '#ffffff' },
        { name: 'Dynamic Album Glow', desc: 'Aurora shifts to album art', dot: '#a855f7' }
      ].map(t => (
        <div
          key={t.name}
          className="p-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-2xl flex items-center gap-3.5 shadow-xl transition-all"
        >
          <span className="w-4 h-4 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: t.dot }} />
          <div>
            <p className="text-sm font-bold text-white">{t.name}</p>
            <p className="text-xs text-white/60">{t.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
