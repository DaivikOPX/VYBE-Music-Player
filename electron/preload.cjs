const { contextBridge, ipcRenderer, webUtils, webFrame } = require('electron');

function detectPreloadMode() {
  if (process.argv.includes('--uninstall')) return 'uninstall';
  if (process.argv.includes('--setup') || Boolean(process.env.PORTABLE_EXECUTABLE_FILE)) return 'setup';
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const m = new URLSearchParams(window.location.search).get('mode');
      if (m === 'setup' || m === 'uninstall') return m;
    }
  } catch {
    // ignore
  }
  return 'player';
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
  appMode: detectPreloadMode(),
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (cb) => {
    const listener = (_event, val) => cb(Boolean(val));
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  },
  setZoomFactor: (factor) => {
    try {
      if (typeof factor === 'number' && factor > 0) {
        webFrame.setZoomFactor(factor);
      }
    } catch (err) {
      console.error('Failed to set zoom factor:', err);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch {
      return 1;
    }
  },
  onMediaControl: (cb) => {
    const listener = (_event, action) => cb(String(action));
    ipcRenderer.on('media:control', listener);
    return () => ipcRenderer.removeListener('media:control', listener);
  },
  onOpenFiles: (cb) => {
    const listener = (_event, items) => cb(items);
    ipcRenderer.on('app:openFiles', listener);
    return () => ipcRenderer.removeListener('app:openFiles', listener);
  },
  pickAudioFiles: () => ipcRenderer.invoke('dialog:pickAudioFiles'),
  pickAudioFolder: () => ipcRenderer.invoke('dialog:pickAudioFolder'),
  scanWatchedFolders: (folders) => ipcRenderer.invoke('dialog:scanWatchedFolders', folders),
  scanDroppedPaths: (paths) => ipcRenderer.invoke('dialog:scanDroppedPaths', paths),
  checkMissingFiles: (paths) => ipcRenderer.invoke('dialog:checkMissingFiles', paths),
  importPlaylistFile: () => ipcRenderer.invoke('dialog:pickPlaylistFile'),
  getPathForFile: (file) => {
    try {
      return webUtils?.getPathForFile ? webUtils.getPathForFile(file) : file.path || '';
    } catch {
      return '';
    }
  },
  loadState: () => ipcRenderer.invoke('store:load'),
  saveState: (state) => ipcRenderer.invoke('store:save', state),
  showInExplorer: (filePath) => ipcRenderer.send('shell:showInExplorer', filePath),
  writeId3Tags: (filePath, tags) => ipcRenderer.invoke('media:writeId3Tags', filePath, tags),
  findLocalCover: (filePath) => ipcRenderer.invoke('media:findLocalCover', filePath),
  renameFile: (oldPath, newFileName) => ipcRenderer.invoke('media:renameFile', oldPath, newFileName),
  updatePlayState: (isPlaying, title) => ipcRenderer.send('window:updatePlayState', isPlaying, title),
  setCloseToTray: (enabled) => ipcRenderer.send('window:setCloseToTray', Boolean(enabled)),
  setStartOnBoot: (enabled) => ipcRenderer.send('app:setStartOnBoot', Boolean(enabled)),
  getStartOnBoot: () => ipcRenderer.invoke('app:getStartOnBoot'),
  setGlobalShortcuts: (enabled) => ipcRenderer.send('app:setGlobalShortcuts', Boolean(enabled)),
  showNotification: (title, body) => ipcRenderer.send('app:showNotification', title, body),
  setupGetDefaults: () => ipcRenderer.invoke('setup:getDefaults'),
  setupPickFolder: (currentPath) => ipcRenderer.invoke('setup:pickFolder', currentPath),
  setupRunInstall: (opts) => ipcRenderer.invoke('setup:runInstall', opts),
  onSetupProgress: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('setup:progress', listener);
    return () => ipcRenderer.removeListener('setup:progress', listener);
  },
  setupLaunchInstalled: (targetExe) => ipcRenderer.invoke('setup:launchInstalled', targetExe),
  uninstallGetInfo: () => ipcRenderer.invoke('uninstall:getInfo'),
  uninstallExportBackup: () => ipcRenderer.invoke('uninstall:exportBackup'),
  uninstallClearCacheOnly: () => ipcRenderer.invoke('uninstall:clearCacheOnly'),
  uninstallRun: (opts) => ipcRenderer.invoke('uninstall:run', opts),
  onUninstallProgress: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('uninstall:progress', listener);
    return () => ipcRenderer.removeListener('uninstall:progress', listener);
  },
  uninstallFinish: () => ipcRenderer.invoke('uninstall:finish')
});
