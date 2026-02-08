/**
 * Public base URL for Supabase Edge Functions.
 *
 * In production this project is typically deployed behind a reverse proxy where
 * `/api/functions/v1/*` is forwarded to Supabase, so we prefer same-origin.
 *
 * In development we default to the direct Supabase URL.
 *
 * You can override both via `VITE_FUNCTIONS_BASE_URL`.
 *
 * Examples:
 * - Production: "https://shadowauth.qzz.io/api/functions/v1"
 * - Development: "https://<project>.supabase.co/functions/v1"
 */
export function getFunctionsBaseUrl(): string {
  const override = import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined;
  if (override && override.trim()) return override.replace(/\/+$/, "");

  // Prefer same-origin in production (custom domain / reverse proxy)
  if (import.meta.env.PROD && typeof window !== "undefined") {
    return `${window.location.origin}/api/functions/v1`;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl && supabaseUrl.trim()) {
    return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
  }

  // Last resort (shouldn't happen)
  return "/api/functions/v1";
}

