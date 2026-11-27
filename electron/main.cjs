const { app, BrowserWindow, ipcMain, dialog, protocol, shell, Tray, Menu, nativeImage, globalShortcut, Notification, session } = require('electron');

app.name = 'VYBE';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.vybe.musicplayer');
}
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

// Prevent unhandled main-process exceptions from crashing the desktop app
process.on('uncaughtException', (err) => {
  console.error('Desktop uncaughtException:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Desktop unhandledRejection:', err);
});

// Pure-JS 32x32 PNG generator for crisp Windows Tray & Taskbar Thumbar icons
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createIconImage(size, drawPixel) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', zlib.deflateSync(raw)),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
  return nativeImage.createFromBuffer(png);
}

let cachedIcons = null;
function getDesktopIcons() {
  if (cachedIcons) return cachedIcons;
  const trayIcon = createIconImage(32, (x, y, s) => {
    const dx = x - s / 2 + 0.5;
    const dy = y - s / 2 + 0.5;
    const dist = Math.hypot(dx, dy);
    if (dist <= 14) {
      if (Math.abs(dy + 3) < 1.6 && Math.abs(dx) < 7) return [12, 12, 14, 255];
      if (Math.abs(dy - 1.5) < 1.5 && Math.abs(dx) < 5.5) return [12, 12, 14, 255];
      if (Math.abs(dy - 5.5) < 1.4 && Math.abs(dx) < 4) return [12, 12, 14, 255];
      return [30, 215, 96, 255];
    }
    return [0, 0, 0, 0];
  });
  const playIcon = createIconImage(24, (x, y) => {
    if (x >= 7 && x <= 18 && Math.abs(y - 11.5) <= (18 - x) * 0.58) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  });
  const pauseIcon = createIconImage(24, (x, y) => {
    if (y >= 5 && y <= 18 && ((x >= 6 && x <= 9) || (x >= 14 && x <= 17))) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  });
  const prevIcon = createIconImage(24, (x, y) => {
    if (y >= 6 && y <= 17 && x >= 5 && x <= 7) return [255, 255, 255, 255];
    if (x >= 9 && x <= 18 && Math.abs(y - 11.5) <= (x - 9) * 0.62) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  });
  const nextIcon = createIconImage(24, (x, y) => {
    if (y >= 6 && y <= 17 && x >= 16 && x <= 18) return [255, 255, 255, 255];
    if (x >= 5 && x <= 14 && Math.abs(y - 11.5) <= (14 - x) * 0.62) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  });
  cachedIcons = { trayIcon, playIcon, pauseIcon, prevIcon, nextIcon };
  return cachedIcons;
}

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.webm', '.aiff', '.aif']);
const MIME_BY_EXT = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff'
};

const ART_MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

// Track only files explicitly opened or scanned from user-authorized folders
const allowedAudioPaths = new Map();
let musicMetadataPromise = null;

function getMusicMetadata() {
  if (!musicMetadataPromise) {
    musicMetadataPromise = import('music-metadata');
  }
  return musicMetadataPromise;
}

function getStateFilePath() {
  return path.join(app.getPath('userData'), 'spotify-clone-library.json');
}

function getBackupStateFilePath() {
  return path.join(app.getPath('userData'), 'spotify-clone-library.backup.json');
}

function getTempStateFilePath() {
  return path.join(app.getPath('userData'), 'spotify-clone-library.tmp');
}

function getArtCacheDir() {
  const dir = path.join(app.getPath('userData'), 'art-cache');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function parseLrcRaw(raw) {
  if (!raw || !raw.trim()) return [];
  const re = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const matches = Array.from(line.matchAll(re));
    if (matches.length === 0) continue;
    const text = line.replace(re, '').trim();
    if (!text) continue;
    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const fracStr = m[3] || '0';
      const frac = fracStr.length === 3 ? parseInt(fracStr, 10) / 1000 : parseInt(fracStr, 10) / 100;
      out.push({ time: mins * 60 + secs + frac, text });
    }
  }
  if (out.length > 0) {
    out.sort((a, b) => a.time - b.time);
    return out;
  }
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(text => ({ time: -1, text }));
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-audio',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: true }
  },
  {
    scheme: 'local-art',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true }
  }
]);

async function parseAudioFileMeta(filePath) {
  const normalizedPath = path.resolve(filePath);
  const hash = crypto.createHash('sha256').update(normalizedPath).digest('hex').slice(0, 24);
  const id = `electron-${hash}`;
  allowedAudioPaths.set(hash, normalizedPath);

  const fileName = path.basename(normalizedPath);
  const ext = path.extname(fileName);
  const base = fileName.slice(0, fileName.length - ext.length).trim();

  // Strip leading track number patterns like '01 - ', '01. ', '01 ', '1-02 ', 'A1. '
  const trackNumRe = /^\s*(?:cd\s*\d+[\s.-]*)?(?:\d{1,2}[-_])?\d{1,3}[\s._-]+/i;
  const withoutTrackNum = base.replace(trackNumRe, '').trim();

  let title = withoutTrackNum || base || fileName;
  let artist = 'Unknown Artist';

  const dashInClean = withoutTrackNum.indexOf(' - ');
  const dashInBase = base.indexOf(' - ');

  if (dashInClean > 0) {
    const p1 = withoutTrackNum.slice(0, dashInClean).trim();
    const p2 = withoutTrackNum.slice(dashInClean + 3).trim();
    if (!/^\d+$/.test(p1) && !/^(?:track|audio|sound)\s*\d*$/i.test(p1)) {
      artist = p1;
      title = p2 || withoutTrackNum;
    }
  } else if (dashInBase > 0) {
    const p1 = base.slice(0, dashInBase).trim();
    const p2 = base.slice(dashInBase + 3).trim();
    if (!/^\d+$/.test(p1) && !/^(?:track|audio|sound)\s*\d*$/i.test(p1)) {
      artist = p1;
      title = p2 || base;
    }
  }

  const parentDir = path.basename(path.dirname(normalizedPath)) || 'Local Files';
  const genericFolders = new Set(['downloads', 'download', 'music', 'songs', 'audio', 'desktop', 'documents', 'new folder', 'temp', 'local files', 'unknown', 'unknown album', 'tracks', 'files', 'mp3', 'media']);
  let album = genericFolders.has(parentDir.toLowerCase().trim()) || /^\d+$/.test(parentDir.trim()) ? 'Local Files' : parentDir;
  let trackNumber;
  let year;
  let genre;
  let duration = 0;
  let bitrate;
  let sampleRate;
  let bitDepth;
  let codec;
  let fileSize;
  let coverUrl = '';
  let lyrics;

  try {
    fileSize = fs.statSync(normalizedPath).size;
  } catch {
    // ignore
  }

  // Check adjacent .lrc or .txt lyrics file
  const lrcPath = path.join(path.dirname(normalizedPath), `${base}.lrc`);
  const txtPath = path.join(path.dirname(normalizedPath), `${base}.txt`);
  try {
    if (fs.existsSync(lrcPath)) {
      const lrcRaw = fs.readFileSync(lrcPath, 'utf8');
      const parsedLrc = parseLrcRaw(lrcRaw);
      if (parsedLrc.length > 0) lyrics = parsedLrc;
    } else if (fs.existsSync(txtPath)) {
      const txtRaw = fs.readFileSync(txtPath, 'utf8');
      const parsedTxt = parseLrcRaw(txtRaw);
      if (parsedTxt.length > 0) lyrics = parsedTxt;
    }
  } catch {
    // ignore
  }

  try {
    const mm = await getMusicMetadata();
    const meta = await mm.parseFile(normalizedPath, { duration: true });
    const { common, format } = meta;

    if (common.title && common.title.trim()) title = common.title.trim();
    if (common.artist && common.artist.trim()) artist = common.artist.trim();
    else if (common.artists && common.artists.length > 0) artist = common.artists.join(', ');
    if (common.album && common.album.trim()) album = common.album.trim();
    if (common.track && common.track.no) trackNumber = common.track.no;
    if (common.year) year = common.year;
    if (common.genre && common.genre.length > 0) genre = common.genre[0];
    if (format.duration && Number.isFinite(format.duration)) duration = format.duration;
    if (format.bitrate) bitrate = Math.round(format.bitrate / 1000);
    if (format.sampleRate) sampleRate = format.sampleRate;
    if (format.bitsPerSample) bitDepth = format.bitsPerSample;
    if (format.codec) codec = format.codec;

    if (!lyrics && common.lyrics && common.lyrics.length > 0) {
      const lyrTag = common.lyrics[0];
      if (lyrTag.syncText && lyrTag.syncText.length > 0) {
        lyrics = lyrTag.syncText
          .filter(s => s.text && s.text.trim())
          .map(s => ({ time: (s.timestamp || 0) / 1000, text: s.text.trim() }));
      } else if (lyrTag.text) {
        const parsed = parseLrcRaw(lyrTag.text);
        if (parsed.length > 0) lyrics = parsed;
      }
    }

    const cover = mm.selectCover(common.picture);
    if (cover && cover.data) {
      const artHash = crypto.createHash('sha1').update(cover.data).digest('hex').slice(0, 20);
      const artExt = cover.format && cover.format.includes('png') ? '.png' : '.jpg';
      const artName = `${artHash}${artExt}`;
      const artFile = path.join(getArtCacheDir(), artName);
      if (!fs.existsSync(artFile)) {
        fs.writeFileSync(artFile, cover.data);
      }
      coverUrl = `local-art://cover/${artName}`;
    }

    // Fallback: If no embedded cover, check for album art files in the local directory (cover.jpg, folder.jpg, front.jpg, etc.)
    if (!coverUrl) {
      try {
        const fileDir = path.dirname(normalizedPath);
        const candidates = [
          'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp',
          'folder.jpg', 'folder.jpeg', 'folder.png', 'folder.webp',
          'front.jpg', 'front.jpeg', 'front.png', 'front.webp',
          'album.jpg', 'album.jpeg', 'album.png', 'album.webp',
          'artwork.jpg', 'artwork.jpeg', 'artwork.png', 'artwork.webp',
          `${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`
        ];
        for (const cand of candidates) {
          const candPath = path.join(fileDir, cand);
          if (fs.existsSync(candPath)) {
            const imgData = fs.readFileSync(candPath);
            if (imgData && imgData.length > 512) {
              const artHash = crypto.createHash('sha1').update(imgData).digest('hex').slice(0, 20);
              const artExt = path.extname(cand).toLowerCase() || '.jpg';
              const artName = `${artHash}${artExt}`;
              const artFile = path.join(getArtCacheDir(), artName);
              if (!fs.existsSync(artFile)) {
                fs.writeFileSync(artFile, imgData);
              }
              coverUrl = `local-art://cover/${artName}`;
              break;
            }
          }
        }
        if (!coverUrl) {
          const dirEntries = fs.readdirSync(fileDir);
          const imgEntries = dirEntries.filter(f => /\.(jpe?g|png|webp|bmp)$/i.test(f));
          if (imgEntries.length === 1) {
            const candPath = path.join(fileDir, imgEntries[0]);
            const imgData = fs.readFileSync(candPath);
            if (imgData && imgData.length > 512) {
              const artHash = crypto.createHash('sha1').update(imgData).digest('hex').slice(0, 20);
              const artExt = path.extname(imgEntries[0]).toLowerCase() || '.jpg';
              const artName = `${artHash}${artExt}`;
              const artFile = path.join(getArtCacheDir(), artName);
              if (!fs.existsSync(artFile)) {
                fs.writeFileSync(artFile, imgData);
              }
              coverUrl = `local-art://cover/${artName}`;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // Fallback cleanly to filename metadata
  }

  return {
    id,
    sourceKey: normalizedPath,
    title,
    artist,
    album,
    trackNumber,
    year,
    genre,
    duration,
    bitrate,
    sampleRate,
    bitDepth,
    codec,
    fileSize,
    coverUrl,
    lyrics,
    audioUrl: `local-audio://track/${hash}`,
    fileName
  };
}

function collectAudioFilesRecursive(dirPath, acc = [], seen = new Set(), depth = 0) {
  if (depth > 12 || acc.length >= 25000) return acc;
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (acc.length >= 2500) break;
    const full = path.resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectAudioFilesRecursive(full, acc, seen, depth + 1);
    } else if (entry.isFile() && AUDIO_EXTS.has(path.extname(entry.name).toLowerCase())) {
      if (!seen.has(full)) {
        seen.add(full);
        acc.push(full);
      }
    }
  }
  return acc;
}

async function parseManyFiles(filePaths) {
  const results = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
    const batch = filePaths.slice(i, i + CONCURRENCY);
    const parsed = await Promise.all(batch.map(parseAudioFileMeta));
    results.push(...parsed);
  }
  return results;
}

let mainWindow = null;
let appTray = null;
let currentDesktopPlaying = false;
let currentDesktopTitle = '';
let closeToTrayEnabled = false;
let pendingLaunchFiles = [];

function extractAudioArgs(argv) {
  if (!Array.isArray(argv)) return [];
  return argv.filter((arg) => {
    if (typeof arg !== 'string' || arg.startsWith('-')) return false;
    try {
      const resolved = path.resolve(arg);
      return AUDIO_EXTS.has(path.extname(resolved).toLowerCase()) && fs.existsSync(resolved);
    } catch {
      return false;
    }
  });
}

async function dispatchOpenFiles(filePaths) {
  if (!filePaths || filePaths.length === 0) return;
  const items = await parseManyFiles(filePaths);
  if (items.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:openFiles', items);
  }
}

function registerGlobalMediaShortcuts(enabled) {
  try {
    globalShortcut.unregisterAll();
    if (!enabled) return;
    globalShortcut.register('MediaPlayPause', () => mainWindow?.webContents.send('media:control', 'toggle'));
    globalShortcut.register('MediaNextTrack', () => mainWindow?.webContents.send('media:control', 'next'));
    globalShortcut.register('MediaPreviousTrack', () => mainWindow?.webContents.send('media:control', 'prev'));
  } catch {
    // ignore shortcut registration conflicts with other apps
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  pendingLaunchFiles = extractAudioArgs(process.argv);
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    const files = extractAudioArgs(argv);
    if (files.length > 0) void dispatchOpenFiles(files);
  });
}
let isAppQuitting = false;

function syncDesktopMediaChrome(isPlaying, title) {
  currentDesktopPlaying = Boolean(isPlaying);
  currentDesktopTitle = title || '';
  const icons = getDesktopIcons();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle(currentDesktopPlaying && currentDesktopTitle ? `${currentDesktopTitle} • VYBE` : 'VYBE');
    if (process.platform === 'win32') {
      try {
        mainWindow.setThumbarButtons([
          {
            tooltip: 'Previous',
            icon: icons.prevIcon,
            click: () => mainWindow?.webContents.send('media:control', 'prev')
          },
          {
            tooltip: currentDesktopPlaying ? 'Pause' : 'Play',
            icon: currentDesktopPlaying ? icons.pauseIcon : icons.playIcon,
            click: () => mainWindow?.webContents.send('media:control', 'toggle')
          },
          {
            tooltip: 'Next',
            icon: icons.nextIcon,
            click: () => mainWindow?.webContents.send('media:control', 'next')
          }
        ]);
      } catch {
        // ignore thumbar error before window ready
      }
    }
  }

  if (appTray) {
    appTray.setToolTip(currentDesktopTitle ? `${currentDesktopTitle} • VYBE` : 'VYBE');
    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Player',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: currentDesktopPlaying ? 'Pause' : 'Play',
        click: () => mainWindow?.webContents.send('media:control', 'toggle')
      },
      {
        label: 'Next Track',
        click: () => mainWindow?.webContents.send('media:control', 'next')
      },
      {
        label: 'Previous Track',
        click: () => mainWindow?.webContents.send('media:control', 'prev')
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    appTray.setContextMenu(menu);
  }
}

function createWindow() {
  const icons = getDesktopIcons();
  const iconIcoPath = path.join(__dirname, '..', 'build', 'icon.ico');
  const iconPngPath = path.join(__dirname, '..', 'build', 'icon.png');
  const appIconPath = process.platform === 'win32' && fs.existsSync(iconIcoPath) ? iconIcoPath : (fs.existsSync(iconPngPath) ? iconPngPath : null);
  const winIcon = appIconPath ? (process.platform === 'win32' ? appIconPath : nativeImage.createFromPath(appIconPath)) : icons.trayIcon;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 780,
    minHeight: 560,
    frame: false,
    backgroundColor: '#000000',
    title: 'VYBE',
    icon: winIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false
    }
  });

  if (appIconPath) {
    try {
      mainWindow.setIcon(appIconPath);
    } catch {
      // ignore
    }
  }

  // Security: Restrict renderer navigation to trusted application URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.protocol !== 'file:' && navigationUrl !== devUrl) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // Security: Restrict new windows to safe external http/https browser links only
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch {
      // ignore
    }
    return { action: 'deny' };
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));
  mainWindow.on('close', (e) => {
    if (closeToTrayEnabled && !isAppQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.once('ready-to-show', () => syncDesktopMediaChrome(currentDesktopPlaying, currentDesktopTitle));

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.webContents.session.clearCache().catch(() => {});
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Byte-range aware local audio streamer
  protocol.handle('local-audio', (request) => {
    try {
      const url = new URL(request.url);
      const parts = decodeURIComponent(url.pathname).split('/').filter(Boolean);
      const token = parts.length > 0 ? parts[parts.length - 1] : '';
      const filePath = allowedAudioPaths.get(token);
      if (!filePath || !fs.existsSync(filePath)) {
        return new Response('Not found', {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';
      const rangeHeader = request.headers.get('range');

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (rangeHeader) {
        const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
          if (start >= fileSize || start > end) {
            return new Response(null, {
              status: 416,
              headers: {
                ...corsHeaders,
                'Content-Range': `bytes */${fileSize}`
              }
            });
          }
          const chunkSize = end - start + 1;
          return new Response(fs.createReadStream(filePath, { start, end }), {
            status: 206,
            headers: {
              ...corsHeaders,
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': contentType
            }
          });
        }
      }

      return new Response(fs.createReadStream(filePath), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize),
          'Content-Type': contentType
        }
      });
    } catch {
      return new Response('Internal error', {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  });

  // Cached embedded album art streamer
  protocol.handle('local-art', (request) => {
    try {
      const url = new URL(request.url);
      const artName = path.basename(decodeURIComponent(url.pathname.replace(/^\/+/, '')));
      const artFile = path.join(getArtCacheDir(), artName);
      if (!fs.existsSync(artFile)) {
        return new Response('Not found', {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
      const ext = path.extname(artFile).toLowerCase();
      return new Response(fs.createReadStream(artFile), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': ART_MIME_BY_EXT[ext] || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch {
      return new Response('Error', {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => Boolean(mainWindow?.isMaximized()));
  ipcMain.on('window:updatePlayState', (_e, isPlaying, title) => {
    syncDesktopMediaChrome(isPlaying, title);
  });
  ipcMain.on('window:setCloseToTray', (_e, enabled) => {
    closeToTrayEnabled = Boolean(enabled);
  });

  ipcMain.on('shell:showInExplorer', (_e, filePath) => {
    try {
      if (typeof filePath === 'string' && path.isAbsolute(filePath) && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
      }
    } catch {
      // ignore
    }
  });

  ipcMain.handle('dialog:pickAudioFiles', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio Files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm', 'aiff', 'aif'] }]
    });
    if (res.canceled) return [];
    return parseManyFiles(res.filePaths);
  });

  ipcMain.handle('dialog:pickAudioFolder', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Music Folder',
      buttonLabel: 'Select Folder',
      properties: ['openDirectory', 'multiSelections']
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    const seen = new Set();
    const files = [];
    const folderPaths = [];
    for (const fp of res.filePaths) {
      const folderPath = path.resolve(fp);
      folderPaths.push(folderPath);
      collectAudioFilesRecursive(folderPath, files, seen);
    }
    const items = await parseManyFiles(files);
    return { folderPath: folderPaths[0], folderPaths, items };
  });

  ipcMain.handle('dialog:scanWatchedFolders', async (_e, folders) => {
    if (!Array.isArray(folders) || folders.length === 0) return [];
    const seen = new Set();
    const files = [];
    for (const dir of folders) {
      if (typeof dir === 'string' && fs.existsSync(dir)) {
        collectAudioFilesRecursive(path.resolve(dir), files, seen);
      }
    }
    return parseManyFiles(files);
  });

  ipcMain.handle('dialog:scanDroppedPaths', async (_e, rawPaths) => {
    if (!Array.isArray(rawPaths) || rawPaths.length === 0) return { folders: [], items: [] };
    const seen = new Set();
    const files = [];
    const folders = [];
    for (const p of rawPaths) {
      try {
        const resolved = path.resolve(p);
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          folders.push(resolved);
          collectAudioFilesRecursive(resolved, files, seen);
        } else if (stat.isFile() && AUDIO_EXTS.has(path.extname(resolved).toLowerCase())) {
          if (!seen.has(resolved)) {
            seen.add(resolved);
            files.push(resolved);
          }
        }
      } catch {
        // ignore invalid path
      }
    }
    const items = await parseManyFiles(files);
    return { folders, items };
  });

  ipcMain.handle('dialog:checkMissingFiles', async (_e, paths) => {
    if (!Array.isArray(paths)) return { missingPaths: [], disconnectedDrivePaths: [] };
    const missing = [];
    const disconnected = [];
    for (const p of paths) {
      if (typeof p === 'string' && p.length > 0 && !p.includes('::')) {
        try {
          const root = path.parse(p).root;
          if (root && !fs.existsSync(root)) {
            disconnected.push(p);
          } else if (!fs.existsSync(p)) {
            missing.push(p);
          }
        } catch {
          missing.push(p);
        }
      }
    }
    return { missingPaths: missing, disconnectedDrivePaths: disconnected };
  });

  ipcMain.handle('dialog:pickPlaylistFile', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Playlist (.m3u / .m3u8)',
      properties: ['openFile'],
      filters: [{ name: 'M3U Playlists', extensions: ['m3u8', 'm3u'] }]
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    try {
      const p = res.filePaths[0];
      return {
        name: path.basename(p, path.extname(p)),
        content: fs.readFileSync(p, 'utf8')
      };
    } catch {
      return null;
    }
  });

  ipcMain.on('app:setStartOnBoot', (_e, enabled) => {
    try {
      app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    } catch {
      // ignore on unsupported dev configs
    }
  });

  ipcMain.handle('app:getStartOnBoot', () => {
    try {
      return Boolean(app.getLoginItemSettings().openAtLogin);
    } catch {
      return false;
    }
  });

  ipcMain.on('app:setGlobalShortcuts', (_e, enabled) => {
    registerGlobalMediaShortcuts(Boolean(enabled));
  });

  ipcMain.on('app:showNotification', (_e, title, body) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title: String(title || 'VYBE'), body: String(body || ''), silent: true }).show();
      }
    } catch {
      // ignore notification errors
    }
  });

  // Atomic state persistence with automated rolling backup and corruption recovery
  ipcMain.handle('store:load', () => {
    const primary = getStateFilePath();
    const backup = getBackupStateFilePath();
    if (fs.existsSync(primary)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(primary, 'utf8'));
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (err) {
        console.warn('Primary library state file corrupted, attempting backup recovery:', err);
      }
    }
    if (fs.existsSync(backup)) {
      try {
        const recovered = JSON.parse(fs.readFileSync(backup, 'utf8'));
        if (recovered && typeof recovered === 'object') {
          console.info('Successfully recovered library state from rolling backup.');
          return recovered;
        }
      } catch (err) {
        console.error('Backup state file unreadable:', err);
      }
    }
    return null;
  });

  ipcMain.handle('store:save', (_e, state) => {
    try {
      if (!state || typeof state !== 'object') return false;
      const primary = getStateFilePath();
      const backup = getBackupStateFilePath();
      const temp = getTempStateFilePath();
      const json = JSON.stringify(state, null, 2);

      // 1. Write to temporary file first
      fs.writeFileSync(temp, json, 'utf8');

      // 2. If valid primary exists, update backup
      if (fs.existsSync(primary)) {
        try {
          fs.copyFileSync(primary, backup);
        } catch {
          // ignore backup copy glitch
        }
      }

      // 3. Atomically replace primary with validated temp file
      fs.renameSync(temp, primary);
      return true;
    } catch (err) {
      console.error('Failed to atomically save library state:', err);
      return false;
    }
  });

  // Native ID3 Tag Writer for MP3 & local audio files on disk (including album art / photo)
  ipcMain.handle('media:writeId3Tags', async (_e, filePath, tags) => {
    try {
      if (!filePath || typeof filePath !== 'string') return { success: false, error: 'Invalid path' };
      if (!fs.existsSync(filePath)) return { success: false, error: 'File does not exist' };
      
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.mp3') {
        const NodeID3 = require('node-id3');
        const id3Tags = {};
        if (tags.title !== undefined) id3Tags.title = String(tags.title);
        if (tags.artist !== undefined) id3Tags.artist = String(tags.artist);
        if (tags.album !== undefined) id3Tags.album = String(tags.album);
        if (tags.genre !== undefined) id3Tags.genre = String(tags.genre);
        if (tags.year !== undefined && tags.year) id3Tags.year = String(tags.year);
        if (tags.trackNumber !== undefined && tags.trackNumber) id3Tags.trackNumber = String(tags.trackNumber);
        
        // Write embedded album art / cover photo if provided as data URL or HTTP/HTTPS URL
        const coverInput = tags.coverDataUrl || tags.coverUrl;
        if (coverInput && typeof coverInput === 'string') {
          if (coverInput.startsWith('data:image/')) {
            const match = coverInput.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              const mime = match[1];
              const imgBuf = Buffer.from(match[2], 'base64');
              id3Tags.image = {
                mime: mime,
                type: { id: 3, name: 'front cover' },
                description: 'Front Cover',
                imageBuffer: imgBuf
              };
            }
          } else if (coverInput.startsWith('http://') || coverInput.startsWith('https://')) {
            try {
              const res = await fetch(coverInput);
              if (res.ok) {
                const arrayBuf = await res.arrayBuffer();
                const mime = res.headers.get('content-type') || 'image/jpeg';
                id3Tags.image = {
                  mime: mime.split(';')[0],
                  type: { id: 3, name: 'front cover' },
                  description: 'Front Cover',
                  imageBuffer: Buffer.from(arrayBuf)
                };
              }
            } catch (fetchErr) {
              console.warn('Could not download cover art for ID3 embedding:', fetchErr);
            }
          }
        }
        
        const success = NodeID3.update(id3Tags, filePath);
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: 'node-id3 update returned false' };
        }
      }
      return { success: true, format: ext };
    } catch (err) {
      console.error('Error writing ID3 tags on disk:', err);
      return { success: false, error: String(err?.message || err) };
    }
  });

  // Find local folder artwork on demand for a given audio file path
  ipcMain.handle('media:findLocalCover', async (_e, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) return null;
      const fileDir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName);
      const base = fileName.slice(0, fileName.length - ext.length).trim();

      const candidates = [
        'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp',
        'folder.jpg', 'folder.jpeg', 'folder.png', 'folder.webp',
        'front.jpg', 'front.jpeg', 'front.png', 'front.webp',
        'album.jpg', 'album.jpeg', 'album.png', 'album.webp',
        'artwork.jpg', 'artwork.jpeg', 'artwork.png', 'artwork.webp',
        `${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`
      ];

      for (const cand of candidates) {
        const candPath = path.join(fileDir, cand);
        if (fs.existsSync(candPath)) {
          const imgData = fs.readFileSync(candPath);
          if (imgData && imgData.length > 512) {
            const artHash = crypto.createHash('sha1').update(imgData).digest('hex').slice(0, 20);
            const artExt = path.extname(cand).toLowerCase() || '.jpg';
            const artName = `${artHash}${artExt}`;
            const artFile = path.join(getArtCacheDir(), artName);
            if (!fs.existsSync(artFile)) {
              fs.writeFileSync(artFile, imgData);
            }
            return `local-art://cover/${artName}`;
          }
        }
      }

      const dirEntries = fs.readdirSync(fileDir);
      const imgEntries = dirEntries.filter(f => /\.(jpe?g|png|webp|bmp)$/i.test(f));
      if (imgEntries.length === 1) {
        const candPath = path.join(fileDir, imgEntries[0]);
        const imgData = fs.readFileSync(candPath);
        if (imgData && imgData.length > 512) {
          const artHash = crypto.createHash('sha1').update(imgData).digest('hex').slice(0, 20);
          const artExt = path.extname(imgEntries[0]).toLowerCase() || '.jpg';
          const artName = `${artHash}${artExt}`;
          const artFile = path.join(getArtCacheDir(), artName);
          if (!fs.existsSync(artFile)) {
            fs.writeFileSync(artFile, imgData);
          }
          return `local-art://cover/${artName}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Physical file rename handler that securely renames local audio file on disk
  ipcMain.handle('media:renameFile', async (_e, oldPath, newFileName) => {
    try {
      if (!oldPath || typeof oldPath !== 'string' || !path.isAbsolute(oldPath) || !fs.existsSync(oldPath)) {
        return { success: false, error: 'Source file does not exist or invalid path' };
      }
      if (!newFileName || typeof newFileName !== 'string' || newFileName.includes('\0')) {
        return { success: false, error: 'Invalid new file name' };
      }
      
      const dir = path.dirname(oldPath);
      const originalExt = path.extname(oldPath).toLowerCase();
      if (!AUDIO_EXTS.has(originalExt)) {
        return { success: false, error: 'Cannot rename non-audio files' };
      }

      // Prohibit directory separators and illegal characters to prevent path traversal
      let cleanBase = path.basename(newFileName, originalExt)
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/^\.+/, '')
        .trim();

      if (!cleanBase) cleanBase = 'Untitled Track';
      const targetPath = path.join(dir, `${cleanBase}${originalExt}`);

      // Verify target directory remains identical (strict path traversal barrier)
      if (path.dirname(targetPath) !== dir) {
        return { success: false, error: 'Path traversal forbidden' };
      }

      if (targetPath.toLowerCase() !== oldPath.toLowerCase() && fs.existsSync(targetPath)) {
        return { success: false, error: 'A file with that name already exists in the same folder' };
      }

      fs.renameSync(oldPath, targetPath);

      // Update allowedAudioPaths map if present
      if (allowedAudioPaths.has(oldPath)) {
        const item = allowedAudioPaths.get(oldPath);
        allowedAudioPaths.delete(oldPath);
        allowedAudioPaths.set(targetPath, { ...item, fullPath: targetPath, fileName: `${cleanBase}${originalExt}` });
      }

      return { success: true, newPath: targetPath, newFileName: `${cleanBase}${originalExt}` };
    } catch (err) {
      console.error('Error renaming file on disk:', err);
      return { success: false, error: String(err?.message || err) };
    }
  });

  if (!appTray) {
    const iconIcoPath = path.join(__dirname, '..', 'build', 'icon.ico');
    const iconPngPath = path.join(__dirname, '..', 'build', 'icon.png');
    const trayIconPath = process.platform === 'win32' && fs.existsSync(iconIcoPath) ? iconIcoPath : (fs.existsSync(iconPngPath) ? iconPngPath : null);
    const trayImg = trayIconPath ? nativeImage.createFromPath(trayIconPath) : getDesktopIcons().trayIcon;
    appTray = new Tray(trayImg);
    appTray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Only permit desktop notifications; deny sensor/camera/microphone access
    if (permission === 'notifications') {
      callback(true);
    } else {
      callback(false);
    }
  });

  createWindow();
  syncDesktopMediaChrome(false, '');
  if (pendingLaunchFiles.length > 0) {
    mainWindow?.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        void dispatchOpenFiles(pendingLaunchFiles);
        pendingLaunchFiles = [];
      }, 350);
    });
  }

  app.on('open-file', (e, filePath) => {
    e.preventDefault();
    if (AUDIO_EXTS.has(path.extname(filePath).toLowerCase())) {
      void dispatchOpenFiles([filePath]);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isAppQuitting = true;
  globalShortcut.unregisterAll();
  if (appTray) {
    appTray.destroy();
    appTray = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
