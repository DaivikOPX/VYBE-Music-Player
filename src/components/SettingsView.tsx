import React, { useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Keyboard,
  Sliders,
  Sparkles,
  Volume2,
  User,
  FileAudio,
  Search,
  Laptop,
  HardDrive,
  Mic2,
  FolderTree,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePlayer, EQ_BANDS, EQ_PRESETS } from '../context/PlayerContext';
import { SpotlightCard, BlurText } from './reactbits';
import { CoverArtModal } from './CoverArtModal';

const ACCENT_SWATCHES = [
  { name: 'Spotify Green', color: '#1db954' },
  { name: 'Ocean Blue', color: '#2e77d0' },
  { name: 'Royal Purple', color: '#6b21a8' },
  { name: 'Crimson', color: '#be123c' },
  { name: 'Slate', color: '#334155' },
];

const formatBandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

interface SpotifySwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}

const SpotifySwitch: React.FC<SpotifySwitchProps> = ({ checked, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
      checked ? 'bg-spotify-green' : 'bg-[#535353] hover:bg-[#6a6a6a]'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    settings,
    updateAudioSettings,
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
    watchedFolders,
    pickNativeAudioFolder,
    pickNativeAudioFiles,
    rescanWatchedFolders,
    removeWatchedFolder,
    audioOutputDevices,
    activeDeviceId,
    selectAudioOutputDevice,
    tracks,
    playlists,
    albums,
    artists,
    exportLibraryBackup,
    importLibraryBackup,
    clearListeningHistory,
    setIsShortcutsOpen,
    navigate,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [storageInfo, setStorageInfo] = useState<{ usedMb: string; quotaMb: string } | null>(null);
  const [isBatchCoverModalOpen, setIsBatchCoverModalOpen] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const missingCoverTracks = tracks.filter(t => !t.coverUrl);

  useEffect(() => {
    navigator.storage?.estimate?.().then(est => {
      if (est.usage !== undefined && est.quota !== undefined) {
        setStorageInfo({
          usedMb: (est.usage / (1024 * 1024)).toFixed(1),
          quotaMb: (est.quota / (1024 * 1024)).toFixed(0),
        });
      }
    }).catch(() => {});
  }, [tracks.length]);

  const q = query.trim().toLowerCase();
  const matches = (cat: string, ...terms: string[]) => {
    if (activeCategory !== 'all' && activeCategory !== cat) return false;
    if (!q) return true;
    return terms.some(t => t.toLowerCase().includes(q));
  };

  const CATEGORIES = [
    { id: 'all', label: 'All Settings' },
    { id: 'playback', label: 'Playback & EQ' },
    { id: 'display', label: 'Display & Visuals' },
    { id: 'lyrics', label: 'Lyrics & Syncing' },
    { id: 'startup', label: 'Startup & Window' },
    { id: 'library', label: 'Local Library' },
    { id: 'storage', label: 'Storage & Backup' },
  ] as const;

  const platformName = window.electronAPI
    ? 'Windows Desktop App'
    : Capacitor.isNativePlatform()
    ? 'Android Mobile App'
    : 'Web Browser / PWA';

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text().catch(() => '');
    if (text) importLibraryBackup(text);
  };

  return (
    <div className="min-h-full px-4 md:px-10 py-8 pb-36">
      <input
        ref={backupInputRef}
        type="file"
        accept="application/json,.json"
        onChange={e => void handleImportBackup(e)}
        className="hidden"
      />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              <BlurText text="Settings" />
            </h1>
            <p className="text-xs text-spotify-muted mt-1">{platformName} • v1.0.0</p>
          </div>

          <div className="flex items-center bg-[#242424] focus-within:ring-1 focus-within:ring-white/40 rounded-full px-3.5 py-2 w-full sm:w-64 relative">
            <Search size={15} className="text-spotify-muted mr-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                if (e.target.value) setActiveCategory('all');
              }}
              placeholder="Search all settings..."
              className="bg-transparent text-xs text-white placeholder:text-spotify-muted focus:outline-none w-full pr-5"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 text-spotify-muted hover:text-white text-xs cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id && !query;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-spotify-green text-black shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Account / Profile Quick Card */}
        {matches('all', 'account', 'profile', 'avatar', 'name', 'bio', 'display name') && (
          <SpotlightCard className="bg-[#181818] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[#282828] overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-spotify-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-spotify-green">
                    Offline Profile
                  </p>
                  <h2 className="text-lg font-bold text-white truncate">{profile.displayName}</h2>
                  {profile.bio && (
                    <p className="text-xs text-spotify-muted truncate">{profile.bio}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate({ name: 'profile' })}
                className="px-4 py-2 rounded-full border border-white/25 hover:border-white text-xs font-bold text-white shrink-0 cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </SpotlightCard>
        )}

        {/* Startup & Desktop Window */}
        {matches('startup', 'startup', 'resume', 'tray', 'window', 'minimize', 'close', 'boot', 'windows', 'notifications', 'toast', 'shortcuts', 'global', 'media') && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Laptop size={17} className="text-spotify-green" />
              <span>Startup & Window</span>
            </h2>

            <div className="bg-[#181818] border border-white/10 rounded-xl divide-y divide-white/10">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Resume last track on startup</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Restore your previous song and position when reopening
                  </p>
                </div>
                <SpotifySwitch
                  checked={settings.resumeOnStartup !== false}
                  onChange={v => updateAudioSettings({ resumeOnStartup: v })}
                  ariaLabel="Resume last track on startup"
                />
              </div>

              {window.electronAPI && (
                <>
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Close button minimizes to Tray</p>
                      <p className="text-xs text-spotify-muted mt-0.5">
                        Keep playing in Windows System Tray when clicking X
                      </p>
                    </div>
                    <SpotifySwitch
                      checked={Boolean(settings.closeToTray)}
                      onChange={v => updateAudioSettings({ closeToTray: v })}
                      ariaLabel="Close button minimizes to tray"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Start on Windows boot</p>
                      <p className="text-xs text-spotify-muted mt-0.5">
                        Launch VYBE automatically when you sign in
                      </p>
                    </div>
                    <SpotifySwitch
                      checked={Boolean(settings.startOnBoot)}
                      onChange={v => updateAudioSettings({ startOnBoot: v })}
                      ariaLabel="Start on Windows boot"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Global media shortcuts</p>
                      <p className="text-xs text-spotify-muted mt-0.5">
                        Control Play/Pause/Next/Prev even when minimized
                      </p>
                    </div>
                    <SpotifySwitch
                      checked={settings.globalShortcuts !== false}
                      onChange={v => updateAudioSettings({ globalShortcuts: v })}
                      ariaLabel="Global media shortcuts"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Track change notifications</p>
                      <p className="text-xs text-spotify-muted mt-0.5">
                        Show a subtle Windows toast when playback switches songs
                      </p>
                    </div>
                    <SpotifySwitch
                      checked={Boolean(settings.desktopNotifications)}
                      onChange={v => updateAudioSettings({ desktopNotifications: v })}
                      ariaLabel="Track change notifications"
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Playback & Audio */}
        {matches('playback', 'playback', 'audio', 'output', 'speaker', 'device', 'crossfade', 'gapless', 'speed', 'rate', 'tempo', 'pitch', 'equalizer', 'eq', 'preamp', 'gain', 'volume', 'loudness', 'normalize', 'mono', 'balance', 'private', 'session', 'bands', 'preset', 'hz', 'decibel', 'db') && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders size={17} className="text-spotify-green" />
              <span>Playback & Equalizer</span>
            </h2>

            <div className="bg-[#181818] border border-white/10 rounded-xl divide-y divide-white/10">
              {audioOutputDevices.length > 0 && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Volume2 size={15} className="text-spotify-muted" />
                      <span>Audio Output Device</span>
                    </p>
                    <p className="text-xs text-spotify-muted mt-0.5">
                      Route audio to speakers, Bluetooth, or monitor
                    </p>
                  </div>
                  <select
                    value={activeDeviceId === 'dev-local' ? 'default' : activeDeviceId}
                    onChange={e => {
                      const dev = audioOutputDevices.find(d => d.deviceId === e.target.value);
                      void selectAudioOutputDevice(e.target.value, dev?.label);
                    }}
                    className="bg-[#242424] text-white text-xs font-medium px-3 py-2 rounded-md border border-white/10 focus:outline-none max-w-xs"
                  >
                    {audioOutputDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pre-Amp Gain */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Pre-amp Gain</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Adjust overall loudness boost ({(settings.preampDb ?? 0) > 0 ? `+${settings.preampDb}` : settings.preampDb ?? 0} dB)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    step={0.5}
                    value={settings.preampDb ?? 0}
                    onChange={e => updateAudioSettings({ preampDb: Number(e.target.value) })}
                    className="w-40 accent-spotify-green cursor-pointer"
                  />
                  {(settings.preampDb ?? 0) !== 0 && (
                    <button
                      onClick={() => updateAudioSettings({ preampDb: 0 })}
                      className="text-xs font-bold text-spotify-green hover:underline cursor-pointer"
                    >
                      0 dB
                    </button>
                  )}
                </div>
              </div>

              {/* Crossfade */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Crossfade songs</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Smooth blend between tracks ({settings.crossfadeSec === 0 ? 'Off' : `${settings.crossfadeSec}s`})
                  </p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={settings.crossfadeSec}
                  onChange={e => setCrossfadeSec(Number(e.target.value))}
                  className="w-44 accent-spotify-green cursor-pointer"
                />
              </div>

              {/* Playback Speed */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Playback speed</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Pitch-preserved rate ({settings.playbackRate.toFixed(2).replace(/\.00$/, '')}x)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={settings.playbackRate}
                    onChange={e => setPlaybackRate(Number(e.target.value))}
                    className="w-40 accent-spotify-green cursor-pointer"
                  />
                  {Math.abs(settings.playbackRate - 1) > 0.01 && (
                    <button
                      onClick={() => setPlaybackRate(1)}
                      className="text-xs font-bold text-spotify-green hover:underline cursor-pointer"
                    >
                      1x
                    </button>
                  )}
                </div>
              </div>

              {/* Gapless Playback */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Gapless playback</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Pre-buffers the next song before track end for zero silence
                    {settings.crossfadeSec > 0 ? ' (paused while Crossfade is active)' : ''}
                  </p>
                </div>
                <SpotifySwitch
                  checked={settings.gaplessPlayback !== false}
                  onChange={v => updateAudioSettings({ gaplessPlayback: v })}
                  ariaLabel="Gapless playback"
                />
              </div>

              {/* Normalize Volume (Spotify Quiet / Normal / Loud) */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Normalize volume</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Set the same volume level for all tracks
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['off', 'quiet', 'normal', 'loud'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => updateAudioSettings({ normalizeVolume: lvl })}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize cursor-pointer transition-colors ${
                        (settings.normalizeVolume || 'off') === lvl
                          ? 'bg-spotify-green text-black'
                          : 'bg-[#242424] hover:bg-[#2f2f2f] text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mono Audio */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Mono audio</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Makes left and right speakers play the exact same audio
                  </p>
                </div>
                <SpotifySwitch
                  checked={Boolean(settings.monoAudio)}
                  onChange={v => updateAudioSettings({ monoAudio: v })}
                  ariaLabel="Mono audio"
                />
              </div>

              {/* Audio Balance (Left / Right) */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Audio balance</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Left / Right channel balance ({(settings.audioBalance ?? 0) === 0 ? 'Center' : (settings.audioBalance ?? 0) < 0 ? `L ${Math.round(Math.abs(settings.audioBalance ?? 0) * 100)}%` : `R ${Math.round((settings.audioBalance ?? 0) * 100)}%`})
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-spotify-muted">L</span>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={settings.audioBalance ?? 0}
                    onChange={e => updateAudioSettings({ audioBalance: Number(e.target.value) })}
                    className="w-36 accent-spotify-green cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-spotify-muted">R</span>
                  {(settings.audioBalance ?? 0) !== 0 && (
                    <button
                      onClick={() => updateAudioSettings({ audioBalance: 0 })}
                      className="text-xs font-bold text-spotify-green hover:underline cursor-pointer"
                    >
                      Center
                    </button>
                  )}
                </div>
              </div>

              {/* Private Session */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Private session</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Pause recording to Recently Played & Most Played
                  </p>
                </div>
                <SpotifySwitch
                  checked={Boolean(settings.privateSession)}
                  onChange={v => updateAudioSettings({ privateSession: v })}
                  ariaLabel="Private session"
                />
              </div>

              {/* Equalizer */}
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">6-Band Equalizer</p>
                    <p className="text-xs text-spotify-muted mt-0.5">Preset: {settings.eqPreset}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(EQ_PRESETS).map(name => (
                      <button
                        key={name}
                        onClick={() => setEqPreset(name)}
                        className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                          settings.eqPreset === name
                            ? 'bg-spotify-green text-black'
                            : 'bg-[#242424] hover:bg-[#2f2f2f] text-white'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                    {Object.keys(settings.customEqPresets || {}).map(name => (
                      <div key={name} className="inline-flex items-center">
                        <button
                          onClick={() => setEqPreset(name)}
                          className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                            settings.eqPreset === name
                              ? 'bg-spotify-green text-black'
                              : 'bg-[#242424] hover:bg-[#2f2f2f] text-white'
                          }`}
                        >
                          {name}
                        </button>
                        <button
                          onClick={() => deleteCustomEqPreset(name)}
                          title={`Delete ${name}`}
                          className="ml-0.5 text-spotify-muted hover:text-red-400 text-xs px-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!newPresetName.trim()) return;
                    saveCustomEqPreset(newPresetName);
                    setNewPresetName('');
                  }}
                  className="flex gap-2 max-w-sm"
                >
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    placeholder="Save current EQ as preset..."
                    className="flex-1 bg-[#242424] text-white text-xs px-3 py-1.5 rounded-md border border-white/10 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold cursor-pointer"
                  >
                    Save Preset
                  </button>
                </form>

                <div className="grid grid-cols-6 gap-2 pt-2 bg-black/25 rounded-lg p-4">
                  {EQ_BANDS.map((hz, idx) => {
                    const gain = settings.eqGains[idx] ?? 0;
                    return (
                      <div key={hz} className="flex flex-col items-center gap-2">
                        <span className="text-[11px] font-mono text-spotify-muted tabular-nums">
                          {gain > 0 ? `+${gain}` : gain} dB
                        </span>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={1}
                          value={gain}
                          onChange={e => setEqBandGain(idx, Number(e.target.value))}
                          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                          className="h-24 w-4 accent-spotify-green cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white/80">{formatBandLabel(hz)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Synced Lyrics Engine */}
        {matches('lyrics', 'lyrics', 'lyric', 'lrc', 'lrclib', 'online', 'local', 'karaoke', 'sync', 'synced', 'text', 'words') && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mic2 size={17} className="text-spotify-green" />
              <span>Lyrics & Syncing</span>
            </h2>

            <div className="bg-[#181818] border border-white/10 rounded-xl divide-y divide-white/10">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Lyrics Source</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Online auto-fetches duration-matched synced lyrics via LRCLIB and saves them offline; Local uses only .lrc/.txt or embedded tags
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#242424] p-1 rounded-full border border-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateAudioSettings({ lyricsSource: 'online' })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      (settings.lyricsSource || 'online') === 'online'
                        ? 'bg-spotify-green text-black shadow-md'
                        : 'text-spotify-muted hover:text-white'
                    }`}
                  >
                    Online (LRCLIB + Local)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAudioSettings({ lyricsSource: 'local' })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      settings.lyricsSource === 'local'
                        ? 'bg-spotify-green text-black shadow-md'
                        : 'text-spotify-muted hover:text-white'
                    }`}
                  >
                    Local Only (.lrc)
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Display & Visuals */}
        {matches('display', 'display', 'visual', 'ui', 'theme', 'dark', 'amoled', 'black', 'hazy', 'transparent', 'transparency', 'glass', 'blur', 'frost', 'acrylic', 'zoom', 'scale', 'dense', 'spacious', 'size', 'dpi', 'compact', 'spacing', 'sidebar', 'dock', 'hover', 'badge', 'codec', 'flac', 'mp3', 'visualizer', 'spectrum', 'bars', 'waveform', 'fluid', 'grid', 'list', 'view', 'motion', 'animation', 'aurora', 'color', 'accent', 'tint', 'mood', 'profile', 'swatch') && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={17} className="text-spotify-green" />
              <span>Display & Visual Effects</span>
            </h2>

            {/* Spotify Desktop Zoom Level Setting */}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-white">Zoom level</h3>
                <p className="text-sm text-spotify-muted mt-1">
                  Adjusting the zoom level can help you make the most of Spotify and adapt it to your preferences or needs.
                </p>
                <div className="text-sm text-spotify-muted mt-2 flex flex-wrap items-center gap-1.5">
                  <span>You can also change the zoom level by pressing</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white font-mono text-xs shadow-sm">
                    Ctrl
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white font-mono text-xs shadow-sm">
                    -
                  </kbd>
                  <span>or</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white font-mono text-xs shadow-sm">
                    Ctrl
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white font-mono text-xs shadow-sm">
                    +
                  </kbd>
                  <span>.</span>
                </div>
              </div>

              {/* Zoom Setting Card */}
              {(() => {
                const curZoom = settings.zoomLevel || 100;
                const activeDensity = curZoom <= 80 ? 'dense' : curZoom <= 110 ? 'default' : 'spacious';
                const ZOOM_LEVELS = [70, 80, 90, 100, 110, 120, 130];

                return (
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-6 sm:p-8 space-y-7">
                    {/* 3 Density Tier Illustrations */}
                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                      {/* Dense */}
                      <button
                        type="button"
                        onClick={() => updateAudioSettings({ zoomLevel: 70 })}
                        title="Dense view (70% - 80%)"
                        className="group flex flex-col items-center cursor-pointer focus:outline-none"
                      >
                        <div
                          className={`w-24 h-16 rounded-[6px] border p-1.5 flex flex-col gap-1 transition-all ${
                            activeDensity === 'dense'
                              ? 'border-2 border-spotify-green shadow-lg shadow-spotify-green/20 bg-[#121212]'
                              : 'border-white/20 bg-[#121212] group-hover:border-white/40'
                          }`}
                        >
                          <div className="grid grid-cols-4 gap-1">
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'dense' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'dense' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'dense' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'dense' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                          </div>
                          <div className="grid grid-cols-4 gap-1 flex-1">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-[2px] ${
                                  activeDensity === 'dense' ? 'bg-spotify-green' : 'bg-[#333333]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold mt-2.5 transition-colors ${
                            activeDensity === 'dense' ? 'text-white' : 'text-white/80'
                          }`}
                        >
                          Dense
                        </span>
                      </button>

                      {/* Default */}
                      <button
                        type="button"
                        onClick={() => updateAudioSettings({ zoomLevel: 100 })}
                        title="Default view (90% - 110%)"
                        className="group flex flex-col items-center cursor-pointer focus:outline-none"
                      >
                        <div
                          className={`w-24 h-16 rounded-[6px] border p-1.5 flex flex-col gap-1.5 transition-all ${
                            activeDensity === 'default'
                              ? 'border-2 border-spotify-green shadow-lg shadow-spotify-green/20 bg-[#121212]'
                              : 'border-white/20 bg-[#121212] group-hover:border-white/40'
                          }`}
                        >
                          <div className="grid grid-cols-4 gap-1">
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'default' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'default' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'default' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            <div className={`h-1.5 rounded-[2px] ${activeDensity === 'default' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                          </div>
                          <div className="grid grid-cols-3 gap-1 flex-1">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-[2px] ${
                                  activeDensity === 'default' ? 'bg-spotify-green' : 'bg-[#333333]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold mt-2.5 transition-colors ${
                            activeDensity === 'default' ? 'text-white' : 'text-white/80'
                          }`}
                        >
                          Default
                        </span>
                      </button>

                      {/* Spacious */}
                      <button
                        type="button"
                        onClick={() => updateAudioSettings({ zoomLevel: 130 })}
                        title="Spacious view (120% - 130%)"
                        className="group flex flex-col items-center cursor-pointer focus:outline-none"
                      >
                        <div
                          className={`w-24 h-16 rounded-[6px] border p-1.5 flex flex-col gap-1.5 transition-all ${
                            activeDensity === 'spacious'
                              ? 'border-2 border-spotify-green shadow-lg shadow-spotify-green/20 bg-[#121212]'
                              : 'border-white/20 bg-[#121212] group-hover:border-white/40'
                          }`}
                        >
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-1">
                              <div className={`h-1.5 rounded-[2px] ${activeDensity === 'spacious' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                              <div className={`h-1.5 rounded-[2px] ${activeDensity === 'spacious' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            </div>
                            <div className="space-y-1">
                              <div className={`h-1.5 rounded-[2px] ${activeDensity === 'spacious' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                              <div className={`h-1.5 rounded-[2px] ${activeDensity === 'spacious' ? 'bg-spotify-green' : 'bg-[#404040]'}`} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 flex-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-[2px] ${
                                  activeDensity === 'spacious' ? 'bg-spotify-green' : 'bg-[#333333]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold mt-2.5 transition-colors ${
                            activeDensity === 'spacious' ? 'text-white' : 'text-white/80'
                          }`}
                        >
                          Spacious
                        </span>
                      </button>
                    </div>

                    {/* Stepped Slider Track with 7 Nodes */}
                    <div className="relative pt-6 pb-2 px-1 sm:px-4">
                      {/* Horizontal track line */}
                      <div className="absolute top-[36px] left-6 right-6 sm:left-9 sm:right-9 h-[2px] bg-[#333333] -translate-y-1/2 pointer-events-none" />

                      {/* 7 step points */}
                      <div className="relative flex justify-between items-center">
                        {ZOOM_LEVELS.map(level => {
                          const isSelected = curZoom === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => updateAudioSettings({ zoomLevel: level })}
                              title={`Set zoom level to ${level}%`}
                              className="group flex flex-col items-center cursor-pointer select-none focus:outline-none"
                            >
                              <div className="w-6 h-6 flex items-center justify-center relative">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full border-2 border-spotify-green bg-[#181818] flex items-center justify-center shadow-md shadow-spotify-green/30 transition-all scale-110">
                                    <div className="w-2 h-2 rounded-full bg-spotify-green" />
                                  </div>
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 bg-[#181818] group-hover:border-white group-hover:scale-125 transition-all" />
                                )}
                              </div>
                              <span
                                className={`text-xs mt-2 transition-colors tabular-nums ${
                                  isSelected ? 'font-bold text-white' : 'text-spotify-muted group-hover:text-white/80'
                                }`}
                              >
                                {level}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => updateAudioSettings({ zoomLevel: 100 })}
                        disabled={curZoom === 100}
                        className={`px-5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          curZoom === 100
                            ? 'border-white/10 text-white/30 cursor-not-allowed'
                            : 'border-white/20 text-white hover:border-white hover:scale-105 active:scale-95'
                        }`}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-[#181818] border border-white/10 rounded-xl divide-y divide-white/10">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Transparent Theme</p>
                    <p className="text-xs text-spotify-muted mt-0.5">
                      Translucent frosted acrylic glass panels with dynamic ambient Gaussian-blurred album art backdrop
                    </p>
                  </div>
                  <SpotifySwitch
                    checked={Boolean(settings.hazyMode)}
                    onChange={setHazyMode}
                    ariaLabel="Transparent Theme"
                  />
                </div>

                {settings.hazyMode && (
                  <div className="pt-3 border-t border-white/5 space-y-2.5 animate-view-enter bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Custom Blur & Transparency</p>
                        <p className="text-[11px] text-spotify-muted">
                          Adjust from crystal-clear 100% transparency (0px blur) to heavy frosted glass
                        </p>
                      </div>
                      <span className="text-xs font-bold text-spotify-green bg-spotify-green/10 border border-spotify-green/20 px-2 py-0.5 rounded-full tabular-nums">
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
                      className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-spotify-green"
                    />

                    <div className="flex justify-between text-[11px] text-spotify-muted font-medium">
                      <span>0% (Complete Transparent)</span>
                      <span>50% (Standard)</span>
                      <span>100% (Maximum Frost)</span>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      {[
                        { label: '0% Clear', val: 0 },
                        { label: '25% Subtle', val: 25 },
                        { label: '45% Default', val: 45 },
                        { label: '70% Rich', val: 70 },
                        { label: '100% Full', val: 100 },
                      ].map(p => {
                        const active = (settings.hazyBlur ?? 45) === p.val;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setHazyBlur(p.val)}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-spotify-green text-black shadow-sm'
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

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Dynamic Artwork Mood Tint</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Dynamically extracts the vibrant mood hue from current album artwork to tint controls, sliders & visualizers (or keep classic green when off)
                  </p>
                </div>
                <SpotifySwitch
                  checked={settings.dynamicAccentColor !== false}
                  onChange={v => updateAudioSettings({ dynamicAccentColor: v })}
                  ariaLabel="Dynamic Artwork Mood Tint"
                />
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">AMOLED Pure Black</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Deep true-black surfaces for OLED displays
                  </p>
                </div>
                <SpotifySwitch
                  checked={settings.amoledMode}
                  onChange={setAmoledMode}
                  ariaLabel="AMOLED Pure Black"
                />
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Sidebar Layout & Behavior</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Choose between a permanently docked sidebar or dynamic hover reveal
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#242424] p-1 rounded-full border border-white/5">
                  <button
                    type="button"
                    onClick={() => updateAudioSettings({ sidebarMode: 'pinned' })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      (settings.sidebarMode || 'pinned') === 'pinned'
                        ? 'bg-spotify-green text-black shadow-md'
                        : 'text-spotify-muted hover:text-white'
                    }`}
                  >
                    Pinned (Docked)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAudioSettings({ sidebarMode: 'hover' })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      settings.sidebarMode === 'hover'
                        ? 'bg-spotify-green text-black shadow-md'
                        : 'text-spotify-muted hover:text-white'
                    }`}
                  >
                    Dynamic (Hover Reveal)
                  </button>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Compact Track List</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Fit more songs on screen with tighter spacing
                  </p>
                </div>
                <SpotifySwitch
                  checked={settings.compactMode}
                  onChange={setCompactMode}
                  ariaLabel="Compact Track List"
                />
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Show Codec Badges</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Show subtle FLAC / MP3 / M4A tags next to song titles
                  </p>
                </div>
                <SpotifySwitch
                  checked={Boolean(settings.showFormatBadges)}
                  onChange={v => updateAudioSettings({ showFormatBadges: v })}
                  ariaLabel="Show Codec Badges"
                />
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Theater Audio Visualizer</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Live frequency spectrum, waveform, or fluid reactive glow ribbons in fullscreen mode
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['bars', 'waveform', 'fluid'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => updateAudioSettings({ visualizerStyle: st })}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize cursor-pointer ${
                        (settings.visualizerStyle || 'bars') === st
                          ? 'bg-spotify-green text-black'
                          : 'bg-[#242424] text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <SpotifySwitch
                    checked={settings.showVisualizer !== false}
                    onChange={v => updateAudioSettings({ showVisualizer: v })}
                    ariaLabel="Theater Audio Visualizer"
                  />
                </div>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Home & Library View Layout</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Switch between card Grid and compact List shelves
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['grid', 'list'] as const).map(vm => (
                    <button
                      key={vm}
                      onClick={() => updateAudioSettings({ viewMode: vm })}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize cursor-pointer ${
                        (settings.viewMode || 'grid') === vm
                          ? 'bg-spotify-green text-black'
                          : 'bg-[#242424] text-white'
                      }`}
                    >
                      {vm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Motion & Aurora Effects</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Turn off for ultra-snappy minimal motion or battery saving
                  </p>
                </div>
                <SpotifySwitch
                  checked={settings.animationsEnabled !== false}
                  onChange={v => updateAudioSettings({ animationsEnabled: v })}
                  ariaLabel="Motion & Aurora Effects"
                />
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Profile Banner Color</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Header color accent on your Profile view
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  {ACCENT_SWATCHES.map(sw => (
                    <button
                      key={sw.color}
                      title={sw.name}
                      onClick={() => updateProfile({ accentColor: sw.color })}
                      style={{ backgroundColor: sw.color }}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                        profile.accentColor === sw.color
                          ? 'ring-2 ring-white scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Local Files & Watched Folders */}
        {matches('library', 'library', 'local', 'music', 'folder', 'folders', 'scan', 'rescan', 'watch', 'watched', 'import', 'files', 'file', 'add', 'directory', 'path') && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderOpen size={17} className="text-spotify-green" />
                <span>Local Library & Folders</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void pickNativeAudioFiles()}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileAudio size={14} />
                  <span>Add Files</span>
                </button>
                <button
                  onClick={() => void pickNativeAudioFolder()}
                  className="px-3.5 py-1.5 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen size={14} />
                  <span>Add Folder</span>
                </button>
              </div>
            </div>

            <div className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              {watchedFolders.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-spotify-muted">
                      {watchedFolders.length} watched folder(s)
                    </p>
                    <button
                      onClick={() => void rescanWatchedFolders()}
                      className="text-xs font-bold text-spotify-green hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      <span>Rescan all</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {watchedFolders.map(folder => (
                      <div
                        key={folder}
                        className="flex items-center justify-between gap-3 bg-black/25 px-3 py-2.5 rounded-lg"
                      >
                        <span className="text-xs text-white truncate font-mono">{folder}</span>
                        <button
                          onClick={() => removeWatchedFolder(folder)}
                          title="Remove folder from watch list"
                          className="text-spotify-muted hover:text-red-400 p-1 cursor-pointer shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-spotify-muted">
                  No watched folders added yet. Add a folder to automatically keep your music synced.
                </p>
              )}
            </div>

            {/* Folder Hierarchy Explorer Card */}
            <div className="bg-[#181818] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FolderTree size={16} className="text-spotify-green" />
                  <p className="text-sm font-semibold text-white">Folder Tree Explorer</p>
                </div>
                <p className="text-xs text-spotify-muted">
                  Browse, explore, and play your physical music files organized in their disk directory structure.
                </p>
              </div>
              <button
                onClick={() => navigate({ name: 'folder-tree' })}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Open Explorer
              </button>
            </div>

            {/* Missing Album Artwork Scanner Card */}
            <div className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-400" />
                    <p className="text-sm font-semibold text-white">Album Artwork Scanner</p>
                  </div>
                  <p className="text-xs text-spotify-muted">
                    Automatically searches public Apple Music / iTunes and MusicBrainz databases to fetch high-res 600x600 covers and embed them into ID3 tags.
                  </p>
                </div>
                {missingCoverTracks.length > 0 && (
                  <button
                    onClick={() => setIsBatchCoverModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-black text-xs font-bold shrink-0 transition-transform hover:scale-105 cursor-pointer"
                  >
                    Fetch Missing Covers ({missingCoverTracks.length})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1 text-xs">
                {missingCoverTracks.length === 0 ? (
                  <span className="text-spotify-green font-medium">
                    ✓ All {tracks.length} tracks in your library have album artwork loaded.
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    ⚠️ {missingCoverTracks.length} of {tracks.length} track(s) are missing album artwork.
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Storage, Backup & Shortcuts */}
        {matches('storage', 'storage', 'backup', 'export', 'import', 'restore', 'history', 'clear', 'reset', 'cache', 'quota', 'shortcut', 'shortcuts', 'keyboard', 'keys', 'about', 'summary') && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HardDrive size={17} className="text-spotify-green" />
              <span>Storage, Backups & Shortcuts</span>
            </h2>

            <div className="bg-[#181818] border border-white/10 rounded-xl divide-y divide-white/10">
              <div className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white text-sm">Offline Library Summary</span>
                  {storageInfo && (
                    <span className="text-spotify-muted font-mono">
                      {storageInfo.usedMb} MB used on browser/device cache
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/90">
                    {tracks.length} Songs
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/90">
                    {albums.length} Albums
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/90">
                    {artists.length} Artists
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/90">
                    {playlists.length} Playlists
                  </span>
                </div>
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Backup & Restore</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Save or restore playlists, likes, profile, and settings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportLibraryBackup}
                    className="px-4 py-2 rounded-full border border-white/20 hover:border-white text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => backupInputRef.current?.click()}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>Import</span>
                  </button>
                </div>
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Clear Listening History</p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    Reset Recently Played & Most Played counts without deleting songs
                  </p>
                </div>
                {confirmClearHistory ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        clearListeningHistory();
                        setConfirmClearHistory(false);
                      }}
                      className="px-4 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmClearHistory(false)}
                      className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearHistory(true)}
                    className="px-4 py-2 rounded-full border border-white/20 hover:border-red-400 hover:text-red-400 text-xs font-bold text-white cursor-pointer self-start sm:self-auto"
                  >
                    Clear History
                  </button>
                )}
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Keyboard size={16} className="text-spotify-green" />
                    <p className="text-sm font-semibold text-white">Keyboard Shortcuts</p>
                  </div>
                  <p className="text-xs text-spotify-muted">
                    Quickly control playback, search, and navigation from anywhere. Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">?</kbd> anytime.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded-md font-mono">
                      Space: Play/Pause
                    </span>
                    <span className="text-[11px] bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded-md font-mono">
                      Ctrl + →: Next
                    </span>
                    <span className="text-[11px] bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded-md font-mono">
                      Ctrl + K: Search
                    </span>
                    <span className="text-[11px] bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded-md font-mono">
                      Ctrl + ,: Settings
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsShortcutsOpen(true)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-white/90 text-black text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-104 shrink-0"
                >
                  <Keyboard size={14} />
                  <span>View All Shortcuts</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Empty Search Fallback */}
        {query && ![
          matches('startup', 'startup', 'resume', 'tray', 'window', 'minimize', 'close', 'boot', 'windows', 'notifications', 'toast', 'shortcuts', 'global', 'media'),
          matches('playback', 'playback', 'audio', 'output', 'speaker', 'device', 'crossfade', 'gapless', 'speed', 'rate', 'tempo', 'pitch', 'equalizer', 'eq', 'preamp', 'gain', 'volume', 'loudness', 'normalize', 'mono', 'balance', 'private', 'session', 'bands', 'preset', 'hz', 'decibel', 'db'),
          matches('lyrics', 'lyrics', 'lyric', 'lrc', 'lrclib', 'online', 'local', 'karaoke', 'sync', 'synced', 'text', 'words'),
          matches('display', 'display', 'visual', 'ui', 'theme', 'dark', 'amoled', 'black', 'hazy', 'transparent', 'transparency', 'glass', 'blur', 'frost', 'acrylic', 'zoom', 'scale', 'dense', 'spacious', 'size', 'dpi', 'compact', 'spacing', 'sidebar', 'dock', 'hover', 'badge', 'codec', 'flac', 'mp3', 'visualizer', 'spectrum', 'bars', 'waveform', 'fluid', 'grid', 'list', 'view', 'motion', 'animation', 'aurora', 'color', 'accent', 'tint', 'mood', 'profile', 'swatch'),
          matches('library', 'library', 'local', 'music', 'folder', 'folders', 'scan', 'rescan', 'watch', 'watched', 'import', 'files', 'file', 'add', 'directory', 'path'),
          matches('storage', 'storage', 'backup', 'export', 'import', 'restore', 'history', 'clear', 'reset', 'cache', 'quota', 'shortcut', 'shortcuts', 'keyboard', 'keys', 'about', 'summary')
        ].some(Boolean) && (
          <div className="text-center py-12 space-y-3 bg-[#181818] border border-white/10 rounded-xl p-8">
            <p className="text-base font-bold text-white">No settings found matching "{query}"</p>
            <p className="text-xs text-spotify-muted">Try searching for keywords like sound, zoom, lyrics, theme, or shortcuts</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveCategory('all');
              }}
              className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:scale-104 cursor-pointer transition-all"
            >
              Show All Settings
            </button>
          </div>
        )}
      </div>

      <CoverArtModal
        isOpen={isBatchCoverModalOpen}
        onClose={() => setIsBatchCoverModalOpen(false)}
        tracks={missingCoverTracks}
      />
    </div>
  );
};
