import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlay', {
  onScreenshot: (cb) => ipcRenderer.on('overlay:screenshot', (_, dataUrl) => cb(dataUrl)),
  sendRegion: (bounds) => ipcRenderer.send('capture:region', bounds),
  cancel: () => ipcRenderer.send('capture:cancel'),
});
