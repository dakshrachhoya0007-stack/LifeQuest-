import type { Request } from 'express';

const verifiedTokenCache = new Map<string, { userId: string; expiresAt: number }>();

export function isSupabaseAuthConfigured(): boolean {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  return Boolean(supabaseUrl && anonKey);
}

export async function verifySupabaseBearerToken(token: string): Promise<string | null> {
  if (!token) return null;
  const cached = verifiedTokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId;
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    const uid = typeof data?.id === 'string' ? data.id.trim() : '';
    if (!uid) return null;
    verifiedTokenCache.set(token, { userId: uid, expiresAt: Date.now() + 60_000 });
    if (verifiedTokenCache.size > 500) {
      const oldestKey = verifiedTokenCache.keys().next().value;
      if (oldestKey) verifiedTokenCache.delete(oldestKey);
    }
    return uid;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface CallerAuthResult {
  ok: boolean;
  userId?: string;
  status?: number;
  error?: string;
}

/**
 * Verifies caller identity strictly:
 * 1. When Supabase Auth env vars are configured, a valid Bearer JWT is ALWAYS required
 *    (unverified `x-lifequest-user-id` headers without a matching valid JWT are rejected).
 * 2. When Supabase Auth env vars are not configured (offline local/test mode), requires
 *    `x-lifequest-user-id` (unless `requireSession` forces a Bearer token) and verifies it
 *    matches any declared `expectedOwnerId`.
 */
export async function resolveVerifiedCaller(
  req: Request,
  opts?: { expectedOwnerId?: string | null; requireSession?: boolean }
): Promise<CallerAuthResult> {
  const authHeader = String(req.headers['authorization'] || '').trim();
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const headerUid = String(req.headers['x-lifequest-user-id'] || '').trim();
  const supabaseConfigured = isSupabaseAuthConfigured();

  let verifiedUid: string | null = null;

  if (bearer) {
    verifiedUid = await verifySupabaseBearerToken(bearer);
    if (supabaseConfigured && !verifiedUid) {
      return { ok: false, status: 401, error: 'Invalid or expired authentication token.' };
    }
  } else if (supabaseConfigured || opts?.requireSession) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required: missing valid session token.',
    };
  }

  const effectiveUid = verifiedUid || headerUid;
  if (!effectiveUid) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  if (verifiedUid && headerUid && verifiedUid !== headerUid) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: caller header does not match authenticated user session.',
    };
  }

  if (opts?.expectedOwnerId && opts.expectedOwnerId.trim() && opts.expectedOwnerId.trim() !== effectiveUid) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: cannot act on behalf of another champion.',
    };
  }

  return { ok: true, userId: effectiveUid };
}

/**
 * Resolves an optional viewer user ID for public/filtered endpoints without trusting
 * spoofed viewer headers when Supabase Auth is active.
 */
export async function resolveOptionalViewerId(req: Request): Promise<string | null> {
  const authHeader = String(req.headers['authorization'] || '').trim();
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (bearer) {
    return await verifySupabaseBearerToken(bearer);
  }
  if (isSupabaseAuthConfigured()) {
    return null;
  }
  const fallback = String(req.headers['x-lifequest-user-id'] || req.headers['x-viewer-id'] || '').trim();
  return fallback || null;
}

/**
 * Fail-closed admin secret verification (never falls back to hardcoded strings).
 */
export function verifyAdminHeader(req: Request, envVarNames: string[]): boolean {
  const provided = String(req.headers['x-lifequest-admin-key'] || '').trim();
  if (!provided) return false;
  for (const key of envVarNames) {
    const expected = String(process.env[key] || '').trim();
    if (expected && provided === expected) {
      return true;
    }
  }
  return false;
}
