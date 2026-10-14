/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEMO_FALLBACK?: string;
  readonly VITE_DEMO_ONLY?: string;
  readonly VITE_ROUTER?: 'browser' | 'hash';
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
