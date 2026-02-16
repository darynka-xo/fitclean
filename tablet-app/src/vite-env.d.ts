/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_KASPI_MERCHANT_ID: string
  readonly VITE_KASPI_TERMINAL_ID: string
  readonly VITE_KASPI_API_KEY: string
  readonly VITE_WHATSAPP_API_URL: string
  readonly VITE_WHATSAPP_INSTANCE_ID: string
  readonly VITE_WHATSAPP_API_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
