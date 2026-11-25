import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import {
  isSupabaseAuthConfigured,
  resolveOptionalViewerId,
  resolveVerifiedCaller,
  verifyAdminHeader,
} from '../server/authGuard.ts';

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

test('verifyAdminHeader fails closed when env secret is unset or header mismatches', () => {
  const prevKey = process.env.LIFEQUEST_ADMIN_KEY;
  const prevSecret = process.env.LIFEQUEST_ADMIN_SECRET;
  try {
    delete process.env.LIFEQUEST_ADMIN_KEY;
    delete process.env.LIFEQUEST_ADMIN_SECRET;

    // Even a common placeholder secret must be rejected when env vars are unset
    assert.equal(
      verifyAdminHeader(makeReq({ 'x-lifequest-admin-key': 'lifequest-admin-dev' }), [
        'LIFEQUEST_ADMIN_KEY',
        'LIFEQUEST_ADMIN_SECRET',
      ]),
      false
    );

    process.env.LIFEQUEST_ADMIN_KEY = 'super-strong-test-secret';
    assert.equal(
      verifyAdminHeader(makeReq({ 'x-lifequest-admin-key': 'wrong-secret' }), [
        'LIFEQUEST_ADMIN_KEY',
      ]),
      false
    );
    assert.equal(
      verifyAdminHeader(makeReq({}), ['LIFEQUEST_ADMIN_KEY']),
      false
    );
    assert.equal(
      verifyAdminHeader(makeReq({ 'x-lifequest-admin-key': 'super-strong-test-secret' }), [
        'LIFEQUEST_ADMIN_KEY',
      ]),
      true
    );
  } finally {
    if (prevKey === undefined) delete process.env.LIFEQUEST_ADMIN_KEY;
    else process.env.LIFEQUEST_ADMIN_KEY = prevKey;
    if (prevSecret === undefined) delete process.env.LIFEQUEST_ADMIN_SECRET;
    else process.env.LIFEQUEST_ADMIN_SECRET = prevSecret;
  }
});

test('resolveVerifiedCaller rejects spoofed x-lifequest-user-id when Supabase Auth is configured', async () => {
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevAnon = process.env.VITE_SUPABASE_ANON_KEY;
  try {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key-placeholder';

    assert.equal(isSupabaseAuthConfigured(), true);

    // Header-only caller without Bearer token must be rejected with 401
    const resNoBearer = await resolveVerifiedCaller(
      makeReq({ 'x-lifequest-user-id': 'victim-user-123' })
    );
    assert.equal(resNoBearer.ok, false);
    assert.equal(resNoBearer.status, 401);

    // Optional viewer must NOT trust x-lifequest-user-id when Supabase Auth is active
    const viewer = await resolveOptionalViewerId(
      makeReq({ 'x-lifequest-user-id': 'victim-user-123' })
    );
    assert.equal(viewer, null);
  } finally {
    if (prevUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = prevUrl;
    if (prevAnon === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = prevAnon;
  }
});

test('resolveVerifiedCaller enforces owner match and requireSession in offline mode', async () => {
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevAnon = process.env.VITE_SUPABASE_ANON_KEY;
  const prevUrl2 = process.env.SUPABASE_URL;
  const prevAnon2 = process.env.SUPABASE_ANON_KEY;
  try {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    assert.equal(isSupabaseAuthConfigured(), false);

    // Missing any identity fails with 401
    const emptyRes = await resolveVerifiedCaller(makeReq({}));
    assert.equal(emptyRes.ok, false);
    assert.equal(emptyRes.status, 401);

    // Acting on behalf of another user fails with 403
    const mismatchRes = await resolveVerifiedCaller(
      makeReq({ 'x-lifequest-user-id': 'user-a' }),
      { expectedOwnerId: 'user-b' }
    );
    assert.equal(mismatchRes.ok, false);
    assert.equal(mismatchRes.status, 403);

    // requireSession fails without Bearer even in offline mode
    const requireSessionRes = await resolveVerifiedCaller(
      makeReq({ 'x-lifequest-user-id': 'user-a' }),
      { requireSession: true }
    );
    assert.equal(requireSessionRes.ok, false);
    assert.equal(requireSessionRes.status, 401);

    // Matching userId succeeds in offline dev mode
    const validRes = await resolveVerifiedCaller(
      makeReq({ 'x-lifequest-user-id': 'user-a' }),
      { expectedOwnerId: 'user-a' }
    );
    assert.equal(validRes.ok, true);
    assert.equal(validRes.userId, 'user-a');
  } finally {
    if (prevUrl !== undefined) process.env.VITE_SUPABASE_URL = prevUrl;
    if (prevAnon !== undefined) process.env.VITE_SUPABASE_ANON_KEY = prevAnon;
    if (prevUrl2 !== undefined) process.env.SUPABASE_URL = prevUrl2;
    if (prevAnon2 !== undefined) process.env.SUPABASE_ANON_KEY = prevAnon2;
  }
});
