import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onImageReady: (cb) => ipcRenderer.on('capture:image', (_, dataUrl) => cb(dataUrl)),
  startCapture: () => ipcRenderer.send('capture:start'),
  exportClipboard: (dataUrl) => ipcRenderer.invoke('export:clipboard', dataUrl),
  exportSave: (dataUrl, format) => ipcRenderer.invoke('export:save', dataUrl, format),
  getRecent: () => ipcRenderer.invoke('recent:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  closeWindow: () => ipcRenderer.send('window:close'),
});
