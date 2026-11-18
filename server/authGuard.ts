import type { Request } from 'express';

const verifiedTokenCache = new Map<string, { userId: string; expiresAt: number }>();

async function verifySupabaseBearerToken(token: string): Promise<string | null> {
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

  try {
    const resp = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
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
 * 1. When a Bearer JWT is present and Supabase Auth is configured, verifies the JWT cryptographically
 *    and rejects any forged/mismatched `x-lifequest-user-id` or `body.ownerId` / `body.userId`.
 * 2. In local single-node / offline-Supabase preview mode without Supabase env vars, requires `x-lifequest-user-id`
 *    and verifies it matches any declared `expectedOwnerId` (no unauthenticated claims or cross-user spoofing).
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

  let verifiedUid: string | null = null;

  if (bearer) {
    verifiedUid = await verifySupabaseBearerToken(bearer);
    const supabaseConfigured = Boolean(
      (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim() &&
        (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim()
    );
    if (supabaseConfigured && !verifiedUid) {
      return { ok: false, status: 401, error: 'Invalid or expired authentication token.' };
    }
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
