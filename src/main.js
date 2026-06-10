import {
  app, BrowserWindow, globalShortcut, ipcMain,
  Tray, Menu, nativeImage, desktopCapturer,
  screen, clipboard, dialog, shell, systemPreferences,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import Store from 'electron-store';

if (started) app.quit();

const store = new Store({
  defaults: {
    shortcut: 'CommandOrControl+Shift+X',
    defaultColor: '#F88379',
    defaultStrokeWidth: 3,
    defaultFormat: 'png',
    recentCaptures: [],
  },
});

let tray = null;
let annotatorWindow = null;
let overlayWindow = null;
let lastScreenshot = null; // NativeImage of full screen before crop

// ── Windows ────────────────────────────────────────────────────

function createAnnotatorWindow() {
  if (annotatorWindow) { annotatorWindow.show(); annotatorWindow.focus(); return; }

  annotatorWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    annotatorWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    annotatorWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  annotatorWindow.once('ready-to-show', () => {
    annotatorWindow.show();
    annotatorWindow.focus();
    app.focus({ steal: true });
  });

  annotatorWindow.on('closed', () => { annotatorWindow = null; });
}

function createOverlayWindow() {
  if (overlayWindow) { overlayWindow.close(); overlayWindow = null; }

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  overlayWindow = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '#overlay');
  } else {
    overlayWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash: 'overlay' }
    );
  }

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show();
    if (lastScreenshot) {
      overlayWindow.webContents.send('overlay:screenshot', lastScreenshot.toDataURL());
    }
  });

  overlayWindow.on('closed', () => { overlayWindow = null; });
}

// ── Screen capture ─────────────────────────────────────────────

async function checkScreenPermission() {
  if (process.platform !== 'darwin') return true;
  const status = systemPreferences.getMediaAccessStatus('screen');
  if (status === 'granted') return true;
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording Permission Required',
    message: 'Screenshot Markup needs Screen Recording access.',
    detail: 'Open System Settings → Privacy & Security → Screen Recording and enable Screenshot Markup, then restart the app.',
    buttons: ['Open System Settings', 'Cancel'],
  });
  if (response === 0) shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  return false;
}

async function startCapture() {
  const hasPermission = await checkScreenPermission();
  if (!hasPermission) return;

  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const scaleFactor = display.scaleFactor;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width * scaleFactor), height: Math.round(height * scaleFactor) },
  });

  if (!sources.length) return;
  lastScreenshot = sources[0].thumbnail;

  if (annotatorWindow && annotatorWindow.isVisible()) {
    await new Promise((resolve) => {
      annotatorWindow.once('hide', resolve);
      annotatorWindow.hide();
    });
    // Wait for macOS hide animation to fully complete
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  createOverlayWindow();
}

// ── Tray ───────────────────────────────────────────────────────

function createTray() {
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbklEQVQ4T2NkIBIwEqmHgSoGvHz58n9ERIQ0kJyTk/M/PT0dRB4NBlIcJSUl/1+9ekUWBiMjI+P/jo6O/zExMWQZMGHCBPJdACIJCQlhSExMJNsFWDUDLSDaBVg1Ay0g2gVYNQMtINoFuDQDALHRLRFeiWInAAAAAElFTkSuQmCC';
  const icon = nativeImage.createFromDataURL(iconDataUrl).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const updateMenu = () => {
    const shortcut = store.get('shortcut');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Screenshot Markup', enabled: false },
      { type: 'separator' },
      { label: `Capture (${shortcut})`, click: startCapture },
      { label: 'Open Annotator', click: createAnnotatorWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]));
  };

  updateMenu();
  tray.setToolTip('Screenshot Markup');
  tray.on('click', () => {
    if (annotatorWindow) { annotatorWindow.show(); annotatorWindow.focus(); }
    else createAnnotatorWindow();
  });
}

// ── IPC ────────────────────────────────────────────────────────

function registerIPC() {
  ipcMain.on('capture:start', startCapture);

  ipcMain.on('capture:region', (_, bounds) => {
    if (!lastScreenshot || !bounds) return;
    const display = screen.getPrimaryDisplay();
    const scaleFactor = display.scaleFactor;

    const cropRect = {
      x: Math.max(0, Math.round(bounds.x * scaleFactor)),
      y: Math.max(0, Math.round(bounds.y * scaleFactor)),
      width: Math.max(1, Math.round(bounds.width * scaleFactor)),
      height: Math.max(1, Math.round(bounds.height * scaleFactor)),
    };

    const cropped = lastScreenshot.crop(cropRect);
    if (overlayWindow) { overlayWindow.close(); overlayWindow = null; }

    if (!annotatorWindow) createAnnotatorWindow();
    else annotatorWindow.show();

    annotatorWindow.webContents.once('did-finish-load', () => {
      annotatorWindow.webContents.send('capture:image', cropped.toDataURL());
    });
    if (annotatorWindow.webContents.isLoading()) {
      // wait — handled above
    } else {
      annotatorWindow.webContents.send('capture:image', cropped.toDataURL());
    }

    // Save to recent
    const recent = store.get('recentCaptures', []);
    recent.unshift({ dataUrl: cropped.toDataURL(), date: Date.now() });
    store.set('recentCaptures', recent.slice(0, 10));
  });

  ipcMain.on('capture:cancel', () => {
    if (overlayWindow) { overlayWindow.close(); overlayWindow = null; }
    if (annotatorWindow) { annotatorWindow.show(); annotatorWindow.focus(); }
  });

  ipcMain.handle('export:clipboard', (_, dataUrl) => {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
    return { success: true };
  });

  ipcMain.handle('export:save', async (_, dataUrl, format = 'png') => {
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const { filePath, canceled } = await dialog.showSaveDialog(annotatorWindow, {
      defaultPath: `screenshot-${Date.now()}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (canceled || !filePath) return { success: false };
    const image = nativeImage.createFromDataURL(dataUrl);
    const buf = ext === 'jpg' ? image.toJPEG(90) : image.toPNG();
    fs.writeFileSync(filePath, buf);
    return { success: true, filePath };
  });

  ipcMain.handle('recent:get', () => store.get('recentCaptures', []));

  ipcMain.handle('settings:get', () => ({
    shortcut: store.get('shortcut'),
    defaultColor: store.get('defaultColor'),
    defaultStrokeWidth: store.get('defaultStrokeWidth'),
    defaultFormat: store.get('defaultFormat'),
  }));

  ipcMain.handle('settings:set', (_, settings) => {
    const prevShortcut = store.get('shortcut');
    Object.entries(settings).forEach(([k, v]) => store.set(k, v));
    if (settings.shortcut && settings.shortcut !== prevShortcut) {
      globalShortcut.unregisterAll();
      globalShortcut.register(settings.shortcut, startCapture);
    }
    return { success: true };
  });

  ipcMain.on('window:close', () => {
    if (annotatorWindow) annotatorWindow.hide();
  });
}

// ── App lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
  createTray();
  registerIPC();

  const shortcut = store.get('shortcut');
  globalShortcut.register(shortcut, startCapture);

  createAnnotatorWindow();

  app.on('activate', () => {
    if (!annotatorWindow) createAnnotatorWindow();
    else { annotatorWindow.show(); annotatorWindow.focus(); }
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray on macOS, quit on other platforms
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
