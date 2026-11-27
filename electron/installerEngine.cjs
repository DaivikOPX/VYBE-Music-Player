const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');

let cachedRequiredBytes = 0;
let pendingSelfDeleteDir = null;

function execPromise(cmd, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    try {
      execFile(cmd, args, { windowsHide: true, timeout: timeoutMs }, (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: stdout || '', stderr: stderr || '', err });
      });
    } catch (err) {
      resolve({ ok: false, stdout: '', stderr: '', err });
    }
  });
}

function getDirStats(dirPath, acc = { files: [], totalBytes: 0 }) {
  if (!dirPath || !fs.existsSync(dirPath)) return acc;
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      getDirStats(full, acc);
    } else if (entry.isFile()) {
      try {
        const st = fs.statSync(full);
        acc.files.push({ full, size: st.size });
        acc.totalBytes += st.size;
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return acc;
}

function getDiskFreeBytes(targetPath) {
  try {
    let probe = path.resolve(targetPath || os.homedir());
    while (probe && !fs.existsSync(probe)) {
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
    if (typeof fs.statfsSync === 'function' && fs.existsSync(probe)) {
      const stats = fs.statfsSync(probe);
      return Number(stats.bavail) * Number(stats.bsize);
    }
  } catch {
    // ignore statfs errors
  }
  return 0;
}

async function terminateOtherVybeProcesses() {
  if (process.platform !== 'win32') return;
  // Build our own process subtree (main + GPU/renderer/utility children) so we NEVER kill our own UI window!
  const cmd = `
    $procs = Get-CimInstance Win32_Process -Filter "Name='VYBE.exe'" -ErrorAction SilentlyContinue;
    if (-not $procs) { exit 0 }
    $keep = New-Object 'System.Collections.Generic.HashSet[int]';
    [void]$keep.Add(${process.pid});
    $changed = $true;
    while ($changed) {
      $changed = $false;
      foreach ($p in $procs) {
        if ($keep.Contains([int]$p.ParentProcessId) -and -not $keep.Contains([int]$p.ProcessId)) {
          [void]$keep.Add([int]$p.ProcessId);
          $changed = $true;
        }
      }
    }
    foreach ($p in $procs) {
      if (-not $keep.Contains([int]$p.ProcessId)) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue;
      }
    }
  `.replace(/\s+/g, ' ').trim();
  await execPromise('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], 8000);
  await new Promise((r) => setTimeout(r, 350));
}

function getLibraryFilePaths(userDataDir) {
  return [
    path.join(userDataDir, 'vybe-library.json'),
    path.join(userDataDir, 'vybe-library.backup.json'),
    path.join(userDataDir, 'vybe-library.tmp.json')
  ];
}

function readLibraryData(userDataDir) {
  const [primary, backup] = getLibraryFilePaths(userDataDir);
  for (const fp of [primary, backup]) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // try fallback
      }
    }
  }
  return null;
}

function getCacheFolders(userDataDir) {
  return [
    path.join(userDataDir, 'Cache'),
    path.join(userDataDir, 'Code Cache'),
    path.join(userDataDir, 'GPUCache'),
    path.join(userDataDir, 'DawnGraphiteCache'),
    path.join(userDataDir, 'DawnWebGPUCache')
  ];
}

function registerInstallerIPC({ app, ipcMain, dialog, shell, session, getMainWindow }) {
  const sendProgress = (channel, percent, step) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, { percent, step });
    }
  };

  ipcMain.handle('setup:getDefaults', () => {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const installDir = path.join(localAppData, 'Programs', 'VYBE');
    const isExistingInstall = fs.existsSync(path.join(installDir, 'VYBE.exe'));

    if (!cachedRequiredBytes) {
      if (app.isPackaged) {
        cachedRequiredBytes = getDirStats(path.dirname(process.execPath)).totalBytes || 335 * 1024 * 1024;
      } else {
        cachedRequiredBytes = 335 * 1024 * 1024;
      }
    }

    return {
      installDir,
      freeBytes: getDiskFreeBytes(installDir),
      requiredBytes: cachedRequiredBytes,
      isExistingInstall,
      appVersion: app.getVersion() || '1.0.0',
      isPreview: !app.isPackaged
    };
  });

  ipcMain.handle('setup:pickFolder', async (_e, currentPath) => {
    const win = getMainWindow();
    let defaultPath = currentPath || path.join(process.env.LOCALAPPDATA || os.homedir(), 'Programs');
    while (defaultPath && !fs.existsSync(defaultPath)) {
      const parent = path.dirname(defaultPath);
      if (parent === defaultPath) break;
      defaultPath = parent;
    }

    const res = await dialog.showOpenDialog(win || undefined, {
      title: 'Choose Install Location for VYBE',
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    });

    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { cancelled: true };
    }

    let chosen = path.resolve(res.filePaths[0]);
    if (path.basename(chosen).toLowerCase() !== 'vybe' && !fs.existsSync(path.join(chosen, 'VYBE.exe'))) {
      chosen = path.join(chosen, 'VYBE');
    }

    return {
      cancelled: false,
      path: chosen,
      freeBytes: getDiskFreeBytes(chosen),
      isExistingInstall: fs.existsSync(path.join(chosen, 'VYBE.exe'))
    };
  });

  ipcMain.handle('setup:runInstall', async (_e, opts) => {
    try {
      const installDir = path.resolve(String(opts?.installDir || ''));
      const desktopShortcut = Boolean(opts?.desktopShortcut);
      const startMenuShortcut = Boolean(opts?.startMenuShortcut);
      const startWithWindows = Boolean(opts?.startWithWindows);

      if (!app.isPackaged) {
        const previewSteps = [
          { p: 12, s: 'Preparing installation workspace...' },
          { p: 36, s: 'Copying VYBE Audio Studio engine...' },
          { p: 64, s: 'Installing Chromium & WebAudio shaders...' },
          { p: 84, s: desktopShortcut ? 'Creating Desktop & Start Menu shortcuts...' : 'Updating Windows integration...' },
          { p: 95, s: 'Registering Windows Apps & Features entry...' },
          { p: 100, s: 'Installation complete (Preview Mode)!' }
        ];
        for (const item of previewSteps) {
          sendProgress('setup:progress', item.p, item.s);
          await new Promise((r) => setTimeout(r, 380));
        }
        return { success: true, targetExe: path.join(installDir, 'VYBE.exe') };
      }

      if (!installDir || !path.isAbsolute(installDir)) {
        return { success: false, error: 'Invalid installation directory.' };
      }

      sendProgress('setup:progress', 5, 'Stopping any active VYBE background instances...');
      await terminateOtherVybeProcesses();

      const sourceDir = path.dirname(process.execPath);
      const sourceExeName = path.basename(process.execPath).toLowerCase();
      const { files, totalBytes } = getDirStats(sourceDir);

      fs.mkdirSync(installDir, { recursive: true });
      sendProgress('setup:progress', 10, 'Copying VYBE Audio Studio files...');

      let copiedBytes = 0;
      let lastReportedPercent = 10;
      const safeTotal = Math.max(1, totalBytes);

      for (const fileInfo of files) {
        const relPath = path.relative(sourceDir, fileInfo.full);
        if (!relPath || relPath.startsWith('..')) continue;

        let destRel = relPath;
        if (relPath.toLowerCase() === sourceExeName) {
          destRel = 'VYBE.exe';
        }

        const destFull = path.join(installDir, destRel);
        fs.mkdirSync(path.dirname(destFull), { recursive: true });
        fs.copyFileSync(fileInfo.full, destFull);

        copiedBytes += fileInfo.size;
        const pct = 10 + Math.round((copiedBytes / safeTotal) * 68);
        if (pct >= lastReportedPercent + 2 || copiedBytes === totalBytes) {
          lastReportedPercent = pct;
          sendProgress('setup:progress', Math.min(78, pct), `Installing ${path.basename(destRel)}...`);
          // Yield to event loop so UI paints smoothly
          await new Promise((r) => setTimeout(r, 4));
        }
      }

      const targetExe = path.join(installDir, 'VYBE.exe');

      sendProgress('setup:progress', 82, 'Configuring Windows shortcuts...');
      const desktopLnk = path.join(app.getPath('desktop'), 'VYBE.lnk');
      const startMenuLnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'VYBE.lnk');

      if (process.platform === 'win32') {
        if (desktopShortcut) {
          shell.writeShortcutLink(desktopLnk, 'create', {
            target: targetExe,
            cwd: installDir,
            icon: targetExe,
            iconIndex: 0,
            description: 'VYBE — Offline-First Audio Studio'
          });
        } else if (fs.existsSync(desktopLnk)) {
          try { fs.unlinkSync(desktopLnk); } catch {}
        }

        if (startMenuShortcut) {
          fs.mkdirSync(path.dirname(startMenuLnk), { recursive: true });
          shell.writeShortcutLink(startMenuLnk, 'create', {
            target: targetExe,
            cwd: installDir,
            icon: targetExe,
            iconIndex: 0,
            description: 'VYBE — Offline-First Audio Studio'
          });
        } else if (fs.existsSync(startMenuLnk)) {
          try { fs.unlinkSync(startMenuLnk); } catch {}
        }

        sendProgress('setup:progress', 90, 'Updating Windows startup & uninstall registry...');
        const runKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
        if (startWithWindows) {
          await execPromise('reg', ['add', runKey, '/v', 'VYBE', '/t', 'REG_SZ', '/d', `"${targetExe}"`, '/f']);
        } else {
          await execPromise('reg', ['delete', runKey, '/v', 'VYBE', '/f']);
        }

        const uninstKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\com.vybe.musicplayer';
        const estKb = String(Math.max(1024, Math.round(totalBytes / 1024)));
        const ver = app.getVersion() || '1.0.0';
        const regEntries = [
          ['DisplayName', 'REG_SZ', 'VYBE'],
          ['DisplayVersion', 'REG_SZ', ver],
          ['Publisher', 'REG_SZ', 'VYBE Team'],
          ['DisplayIcon', 'REG_SZ', `${targetExe},0`],
          ['InstallLocation', 'REG_SZ', installDir],
          ['UninstallString', 'REG_SZ', `"${targetExe}" --uninstall`],
          ['QuietUninstallString', 'REG_SZ', `"${targetExe}" --uninstall`],
          ['EstimatedSize', 'REG_DWORD', estKb],
          ['NoModify', 'REG_DWORD', '1'],
          ['NoRepair', 'REG_DWORD', '1']
        ];
        for (const [name, type, val] of regEntries) {
          await execPromise('reg', ['add', uninstKey, '/v', name, '/t', type, '/d', val, '/f']);
        }
      }

      try {
        fs.writeFileSync(
          path.join(installDir, 'install-meta.json'),
          JSON.stringify({ installDir, desktopShortcut, startMenuShortcut, startWithWindows, installedAt: Date.now() }, null, 2),
          'utf8'
        );
      } catch {}

      sendProgress('setup:progress', 100, 'VYBE is ready to launch!');
      return { success: true, targetExe };
    } catch (err) {
      return { success: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('setup:launchInstalled', async (_e, targetExe) => {
    if (!app.isPackaged || !targetExe || !fs.existsSync(targetExe)) {
      app.quit();
      return;
    }
    try {
      const child = spawn(targetExe, [], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(targetExe)
      });
      child.unref();
    } catch {}
    app.quit();
  });

  // =========================================================================
  // UNINSTALLER ("DELETE APP SCREEN") IPC
  // =========================================================================
  ipcMain.handle('uninstall:getInfo', () => {
    const userDataDir = app.getPath('userData');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const installDir = app.isPackaged
      ? path.dirname(process.execPath)
      : path.join(localAppData, 'Programs', 'VYBE');

    const appCoreBytes = app.isPackaged
      ? getDirStats(installDir).totalBytes
      : 335 * 1024 * 1024;

    const saved = readLibraryData(userDataDir);
    let playlistCount = 0;
    let likedCount = 0;
    let customCoverCount = 0;
    let trackCount = 0;
    let libraryBytes = 0;
    let settingsBytes = 0;

    if (saved) {
      playlistCount = Array.isArray(saved.playlists) ? saved.playlists.length : 0;
      likedCount = Array.isArray(saved.likedTrackIds) ? saved.likedTrackIds.length : 0;
      trackCount = Array.isArray(saved.cachedTracks) ? saved.cachedTracks.length : 0;
      if (saved.customTracksMeta && typeof saved.customTracksMeta === 'object') {
        customCoverCount = Object.values(saved.customTracksMeta).filter((m) => m && m.coverUrl).length;
      }
      if (Array.isArray(saved.playlists)) {
        customCoverCount += saved.playlists.filter((p) => p && p.coverUrl && p.coverUrl.startsWith('data:')).length;
      }

      try {
        libraryBytes = Buffer.byteLength(
          JSON.stringify({
            playlists: saved.playlists || [],
            folders: saved.folders || [],
            likedTrackIds: saved.likedTrackIds || [],
            followedArtistIds: saved.followedArtistIds || [],
            savedAlbumIds: saved.savedAlbumIds || [],
            pinnedItemIds: saved.pinnedItemIds || [],
            customTracksMeta: saved.customTracksMeta || {},
            watchedFolders: saved.watchedFolders || [],
            cachedTracks: saved.cachedTracks || []
          }),
          'utf8'
        );
        settingsBytes = Buffer.byteLength(
          JSON.stringify({
            settings: saved.settings || {},
            profile: saved.profile || {},
            volume: saved.volume,
            isShuffle: saved.isShuffle,
            repeatMode: saved.repeatMode
          }),
          'utf8'
        );
      } catch {}
    }

    const artCacheDir = path.join(userDataDir, 'cover-cache');
    let cacheBytes = getDirStats(artCacheDir).totalBytes;
    for (const cDir of getCacheFolders(userDataDir)) {
      cacheBytes += getDirStats(cDir).totalBytes;
    }

    return {
      installDir,
      userDataDir,
      appCoreBytes,
      libraryBytes,
      settingsBytes,
      cacheBytes,
      playlistCount,
      likedCount,
      customCoverCount,
      trackCount,
      isPreview: !app.isPackaged
    };
  });

  ipcMain.handle('uninstall:exportBackup', async () => {
    try {
      const win = getMainWindow();
      const userDataDir = app.getPath('userData');
      const saved = readLibraryData(userDataDir);
      const dateStr = new Date().toISOString().slice(0, 10);
      const res = await dialog.showSaveDialog(win || undefined, {
        title: 'Export VYBE Library & Settings Backup',
        defaultPath: path.join(app.getPath('documents'), `VYBE-Backup-${dateStr}.json`),
        filters: [{ name: 'VYBE Backup JSON', extensions: ['json'] }]
      });

      if (res.canceled || !res.filePath) {
        return { success: false, cancelled: true };
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        appVersion: app.getVersion() || '1.0.0',
        playlists: saved?.playlists || [],
        folders: saved?.folders || [],
        likedTrackIds: saved?.likedTrackIds || [],
        followedArtistIds: saved?.followedArtistIds || [],
        savedAlbumIds: saved?.savedAlbumIds || [],
        pinnedItemIds: saved?.pinnedItemIds || [],
        customTracksMeta: saved?.customTracksMeta || {},
        watchedFolders: saved?.watchedFolders || [],
        settings: saved?.settings || {},
        profile: saved?.profile || {}
      };

      fs.writeFileSync(res.filePath, JSON.stringify(payload, null, 2), 'utf8');
      return { success: true, filePath: res.filePath };
    } catch (err) {
      return { success: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('uninstall:clearCacheOnly', async () => {
    try {
      const userDataDir = app.getPath('userData');
      let freedBytes = 0;

      if (session?.defaultSession) {
        try {
          await session.defaultSession.clearCache();
        } catch {}
      }

      // Safely remove only Electron HTTP/GPU/Code caches — keep cover-cache & playlists intact!
      for (const cDir of getCacheFolders(userDataDir)) {
        if (fs.existsSync(cDir)) {
          freedBytes += getDirStats(cDir).totalBytes;
          if (app.isPackaged) {
            try { fs.rmSync(cDir, { recursive: true, force: true }); } catch {}
          }
        }
      }

      return { success: true, freedBytes };
    } catch (err) {
      return { success: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('uninstall:run', async (_e, opts) => {
    try {
      const removeLibrary = Boolean(opts?.removeLibrary);
      const removeSettings = Boolean(opts?.removeSettings);
      const removeCache = Boolean(opts?.removeCache);

      if (!app.isPackaged) {
        const steps = [
          { p: 18, s: 'Stopping background audio processes...' },
          { p: 42, s: 'Removing Windows shortcuts & Apps entry...' },
          { p: 72, s: removeLibrary ? 'Removing library & custom covers...' : 'Preserving your playlists & custom covers...' },
          { p: 94, s: 'Staging core folder removal...' },
          { p: 100, s: 'Uninstall complete (Preview Mode — real files untouched)!' }
        ];
        for (const item of steps) {
          sendProgress('uninstall:progress', item.p, item.s);
          await new Promise((r) => setTimeout(r, 360));
        }
        return { success: true };
      }

      const installDir = path.dirname(process.execPath);
      const userDataDir = app.getPath('userData');

      sendProgress('uninstall:progress', 15, 'Closing active VYBE playback instances...');
      await terminateOtherVybeProcesses();

      sendProgress('uninstall:progress', 40, 'Removing shortcuts & Windows registration...');
      if (process.platform === 'win32') {
        const desktopLnk = path.join(app.getPath('desktop'), 'VYBE.lnk');
        const startMenuLnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'VYBE.lnk');
        for (const lnk of [desktopLnk, startMenuLnk]) {
          if (fs.existsSync(lnk)) {
            try { fs.unlinkSync(lnk); } catch {}
          }
        }
        await execPromise('reg', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'VYBE', '/f']);
        await execPromise('reg', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\com.vybe.musicplayer', '/f']);
      }

      sendProgress('uninstall:progress', 72, removeLibrary ? 'Removing selected VYBE data...' : 'Preserving your playlists & library...');
      if (removeLibrary && removeSettings) {
        for (const fp of getLibraryFilePaths(userDataDir)) {
          if (fs.existsSync(fp)) {
            try { fs.unlinkSync(fp); } catch {}
          }
        }
      } else if (removeLibrary || removeSettings) {
        const existing = readLibraryData(userDataDir);
        if (existing) {
          const updated = { ...existing };
          if (removeLibrary) {
            delete updated.playlists;
            delete updated.folders;
            delete updated.likedTrackIds;
            delete updated.followedArtistIds;
            delete updated.savedAlbumIds;
            delete updated.pinnedItemIds;
            delete updated.customTracksMeta;
            delete updated.watchedFolders;
            delete updated.cachedTracks;
            delete updated.recentlyPlayedIds;
            delete updated.queueTrackIds;
            delete updated.playCounts;
            delete updated.lastPlayedMap;
            delete updated.listeningStats;
          }
          if (removeSettings) {
            delete updated.settings;
            delete updated.profile;
            delete updated.volume;
            delete updated.isMuted;
            delete updated.isShuffle;
            delete updated.repeatMode;
          }
          const [primary, backup] = getLibraryFilePaths(userDataDir);
          try {
            fs.writeFileSync(primary, JSON.stringify(updated, null, 2), 'utf8');
            if (fs.existsSync(backup)) fs.copyFileSync(primary, backup);
          } catch {}
        }
      }

      if (removeCache) {
        if (session?.defaultSession) {
          try { await session.defaultSession.clearCache(); } catch {}
        }
        const artCache = path.join(userDataDir, 'cover-cache');
        if (fs.existsSync(artCache)) {
          try { fs.rmSync(artCache, { recursive: true, force: true }); } catch {}
        }
        for (const cDir of getCacheFolders(userDataDir)) {
          if (fs.existsSync(cDir)) {
            try { fs.rmSync(cDir, { recursive: true, force: true }); } catch {}
          }
        }
      }

      pendingSelfDeleteDir = installDir;
      sendProgress('uninstall:progress', 100, 'VYBE has been removed from your PC.');
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('uninstall:finish', () => {
    if (pendingSelfDeleteDir && app.isPackaged && process.platform === 'win32') {
      try {
        const safeDir = pendingSelfDeleteDir.replace(/"/g, '');
        const child = spawn(
          'cmd.exe',
          ['/c', `ping 127.0.0.1 -n 3 >nul & rmdir /s /q "${safeDir}" || (ping 127.0.0.1 -n 3 >nul & rmdir /s /q "${safeDir}")`],
          {
            detached: true,
            stdio: 'ignore',
            cwd: os.tmpdir(),
            windowsHide: true
          }
        );
        child.unref();
      } catch {}
    }
    app.quit();
  });
}

module.exports = { registerInstallerIPC };
