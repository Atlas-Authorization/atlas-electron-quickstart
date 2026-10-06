// RENDERER. Bundled for the browser context by `npm run build` (esbuild).
//
// It never holds the raw token: `createAtlasClient` builds the shared
// `@atlasauth/js` FapiClient with a fetch that reads the bearer from the IPC
// bridge (`window.atlas`, via `getAtlasBridge`) on every request.
import { createAtlasClient, getAtlasBridge } from '@atlasauth/electron';

const cfg = window.atlasAuth.config;
const client = createAtlasClient({
  publishableKey: cfg.publishableKey,
  frontendApi: cfg.frontendApi,
});

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};
const out = (v: unknown): void => {
  $('out').textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
};

/** Shape of `GET /v1/client` (only the fields this window reads). */
interface ClientView {
  session?: { id: string } | null;
  user?: unknown;
}

async function render(): Promise<void> {
  const bridge = getAtlasBridge();
  const token = bridge ? await bridge.getToken() : null;
  if (!token) {
    out('Signed out.');
    return;
  }
  // Bearer-wired automatically from the bridge token.
  const res = await client.get<ClientView>('/v1/client');
  out(res.ok ? { user: res.data?.user, sessionId: res.data?.session?.id } : 'Token present but invalid.');
}

$('signin').addEventListener('click', async () => {
  // In a real app you obtain this access token via a system-browser / loopback
  // OAuth flow (BrowserWindow to the authorize URL, capture the redirect). Here
  // you paste it to drive the exchange end-to-end.
  const token = $<HTMLInputElement>('accessToken').value.trim();
  const result = await window.atlasAuth.signIn(token);
  out(result.ok ? `Signed in (session ${result.sessionId}).` : 'Exchange failed.');
  await render();
});

$('refresh').addEventListener('click', async () => {
  await window.atlasAuth.refresh();
  await render();
});

$('signout').addEventListener('click', async () => {
  await window.atlasAuth.signOut();
  await render();
});

void render();
