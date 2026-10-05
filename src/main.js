// MAIN process.
//
// The raw session token lives HERE, never in the renderer. Two pieces from
// @atlasauth/electron do the work:
//   - `createAtlasBridge` wires an OS-backed token store to three ipcMain
//     handlers, so the renderer can read/replace/clear the token and nothing
//     more.
//   - `createNativeSessionManager` owns the native session: it exchanges a
//     first-party OAuth access token for an Atlas session and auto-refreshes
//     (rotating) the refresh token, persisting each rotation.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const {
  createAtlasBridge,
  createInMemoryTokenStorage,
  createNativeSessionManager,
  exchangeForSession,
  clearNativeSession,
} = require('@atlasauth/electron');
const config = require('./config');

// In-memory for the quickstart. In production use:
//   createTokenStorage({ store: new Store(...), cipher: safeStorageCipher(safeStorage, b64 => Buffer.from(b64,'base64')) })
// so the rotating refresh token is encrypted at rest and survives a restart.
const storage = createInMemoryTokenStorage();

let bridge;
let manager;

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 540,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(async () => {
  // Renderer's only path to the token (window.atlas.{getToken,setToken,clearToken}).
  bridge = createAtlasBridge({ ipcMain, storage });

  // The native session manager, rehydrated from the (same) store under its own key.
  manager = await createNativeSessionManager({
    frontendApi: config.frontendApi,
    publishableKey: config.publishableKey,
    clientId: config.clientId,
    storage,
  });

  // Exchange an OAuth access token (obtained via the system browser / loopback
  // redirect — see README) for an Atlas session, then publish the session JWT to
  // the bridge so the renderer can bearer it on FAPI calls.
  ipcMain.handle('atlas:sign-in', async (_event, accessToken) => {
    const session = await exchangeForSession({
      baseUrl: config.frontendApi,
      clientId: config.clientId,
      accessToken,
    });
    if (!session) return { ok: false };
    manager.setSession(session);
    await bridge.setToken(session.sessionToken);
    return { ok: true, sessionId: session.sessionId };
  });

  // Hand back a fresh token (the manager refreshes it if near expiry) and keep
  // the bridge copy in sync.
  ipcMain.handle('atlas:refresh', async () => {
    const token = await manager.getToken();
    if (token) await bridge.setToken(token);
    return token;
  });

  ipcMain.handle('atlas:sign-out', async () => {
    manager.clear();
    await clearNativeSession(storage);
    await bridge.clearToken();
    return { ok: true };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
