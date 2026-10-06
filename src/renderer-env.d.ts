// Types for the API that src/preload.ts exposes on `window.atlasAuth`.
export {};

declare global {
  interface Window {
    atlasAuth: {
      signIn(accessToken: string): Promise<{ ok: boolean; sessionId?: string }>;
      refresh(): Promise<string | null>;
      signOut(): Promise<{ ok: boolean }>;
      config: { publishableKey: string; frontendApi: string };
    };
  }
}
