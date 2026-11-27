const { contextBridge, ipcRenderer, webUtils, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
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
  showNotification: (title, body) => ipcRenderer.send('app:showNotification', title, body)
});
