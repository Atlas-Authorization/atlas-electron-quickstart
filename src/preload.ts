// PRELOAD script. The one place that sees both Electron and the renderer's
// window. `exposeAtlasBridge` publishes the narrow token API on `window.atlas`;
// we also expose the sign-in/refresh/sign-out handlers and the public config the
// renderer needs to build its FAPI client.
import { contextBridge, ipcRenderer } from 'electron';
import { exposeAtlasBridge } from '@atlasauth/electron/preload';
import { config } from './config';

exposeAtlasBridge({ contextBridge, ipcRenderer });

contextBridge.exposeInMainWorld('atlasAuth', {
  signIn: (accessToken: string) => ipcRenderer.invoke('atlas:sign-in', accessToken),
  refresh: () => ipcRenderer.invoke('atlas:refresh'),
  signOut: () => ipcRenderer.invoke('atlas:sign-out'),
  config: { publishableKey: config.publishableKey, frontendApi: config.frontendApi },
});
