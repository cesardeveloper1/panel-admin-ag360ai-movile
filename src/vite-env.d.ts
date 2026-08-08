/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SOCKET_BASE_URL?: string;
  readonly VITE_DEV_BACKEND_URL?: string;
  readonly VITE_USE_API_MOCK?: string;
  readonly VITE_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
