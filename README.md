# atlas-electron-quickstart

An Electron desktop app wired to Atlas with the **native-session** flow, using
`@atlasauth/electron`.

## Architecture

The raw token lives in the **main** process; the renderer only ever asks for it
over a narrow IPC bridge.

- **`src/main.ts`** —
  - `createAtlasBridge({ ipcMain, storage })` exposes `getToken/setToken/clearToken`
    over IPC.
  - `createNativeSessionManager({ frontendApi, publishableKey, clientId, storage })`
    owns the session; `exchangeForSession(...)` turns a first-party OAuth access
    token into an Atlas session; the manager auto-refreshes (rotating) the
    refresh token.
- **`src/preload.ts`** — `exposeAtlasBridge({ contextBridge, ipcRenderer })`
  publishes `window.atlas`, plus the sign-in/refresh/sign-out handlers and the
  public config.
- **`src/renderer.ts`** — `createAtlasClient(...)` + `getAtlasBridge()` build the
  bearer-wired `@atlasauth/js` FapiClient; `GET /v1/client` reads the session.

## TypeScript layout

Main + preload are compiled by `tsc` (`tsconfig.json`, CommonJS, ES2022) into
`dist/` (`"main": "dist/main.js"`). The renderer is typed via
`tsconfig.renderer.json` (DOM lib, bundler resolution) and bundled by esbuild;
`src/renderer-env.d.ts` types the `window.atlasAuth` API from the preload.

## Getting the access token

In production you obtain the first-party OAuth access token with a **system
browser / loopback** flow: open a `BrowserWindow` (or the OS browser) to the
instance's `/oauth2/authorize`, capture the redirect to a `127.0.0.1` URI, and
exchange the code at `/oauth2/token`. This quickstart lets you paste the access
token so the `exchangeForSession` → manager → bridge path runs end-to-end.

## Run

```sh
npm install
cp .env.example .env     # export the vars, or edit src/config.ts
npm start                # tsc (main + preload -> dist/), esbuild (renderer), launches Electron
npm run typecheck        # tsc --noEmit for main/preload and the renderer
```

## Packages

- `@atlasauth/electron` — `createAtlasBridge`, `exposeAtlasBridge` (`/preload`),
  `createAtlasClient` + `getAtlasBridge` (renderer), `createNativeSessionManager`,
  `exchangeForSession`, `clearNativeSession`, `createInMemoryTokenStorage`
  (+ `createTokenStorage` / `safeStorageCipher` for production)
