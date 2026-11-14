/**
 * Centralized OAuth & Auth redirect configuration for LifeQuest — World of Aetheria.
 *
 * Keeps production, preview, and local development redirect destinations
 * strictly separated so production never relies on window.location.origin or
 * falls back to http://localhost:3000.
 */

export const PRODUCTION_APP_URL =
  'https://ais-pre-r2du4mvtn2aid6yh7jjmox-633727409836.asia-east1.run.app';

export const PREVIEW_APP_URL =
  'https://ais-dev-r2du4mvtn2aid6yh7jjmox-633727409836.asia-east1.run.app';

export const LOCAL_DEV_APP_URL = 'http://localhost:3000';

const isLocalHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local')
  );
};

const normalizeBaseUrl = (rawUrl: string): string | null => {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

/**
 * Resolves the explicit Supabase OAuth / email redirect URL for the active environment.
 * Always includes a trailing slash (e.g. https://...run.app/) so it matches both
 * exact root entries and wildcard `https://...run.app/**` rules in Supabase Auth.
 */
export const getOAuthRedirectUrl = (): string => {
  // 1. Production build: NEVER use window.location.origin or localhost
  if (import.meta.env.PROD) {
    const envProdUrl =
      (import.meta.env.VITE_PRODUCTION_APP_URL as string | undefined) ||
      (import.meta.env.VITE_SITE_URL as string | undefined);

    if (envProdUrl) {
      const normalized = normalizeBaseUrl(envProdUrl);
      if (normalized) {
        const parsed = new URL(normalized);
        if (parsed.protocol === 'https:' && !isLocalHostname(parsed.hostname)) {
          return `${normalized}/`;
        }
      }
    }

    return `${PRODUCTION_APP_URL}/`;
  }

  // 2. Development / Preview builds: keep strictly separate from production
  const envDevUrl =
    (import.meta.env.VITE_PREVIEW_APP_URL as string | undefined) ||
    (import.meta.env.VITE_DEV_APP_URL as string | undefined);

  if (envDevUrl) {
    const normalized = normalizeBaseUrl(envDevUrl);
    if (normalized) {
      return `${normalized}/`;
    }
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const previewHost = new URL(PREVIEW_APP_URL).hostname.toLowerCase();

    if (hostname === previewHost || hostname.includes('ais-dev-')) {
      return `${PREVIEW_APP_URL}/`;
    }

    if (isLocalHostname(hostname)) {
      const port = window.location.port || '3000';
      return `http://localhost:${port}/`;
    }
  }

  return `${LOCAL_DEV_APP_URL}/`;
};

/**
 * Strips any sensitive token-like substrings if an upstream error message
 * unexpectedly includes URL fragments or query tokens.
 */
export const sanitizeAuthErrorMessage = (raw?: string | null): string => {
  if (!raw || typeof raw !== 'string') {
    return 'Authentication could not be completed. Please try signing in again.';
  }

  let cleaned = raw;
  try {
    cleaned = decodeURIComponent(cleaned.replace(/\+/g, ' '));
  } catch {
    // Keep original if malformed URI encoding
  }

  cleaned = cleaned
    .replace(/(access_token|refresh_token|provider_token|id_token)=[^\s&#]+/gi, '$1=[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .trim();

  return cleaned || 'Authentication could not be completed. Please try signing in again.';
};
