# LifeQuest ("World of Aetheria") — Pre-Migration Backup, Manual SQL Execution & Verification Runbook

> **Important:** Nothing has been executed against your live Supabase project (`grlnojmvacbpcqfhzwpd`). All 20 missing tables, indexes, RLS policies, and RPCs currently exist only inside `supabase/migrations/20261113_unified_backend.sql` until you run it manually.

---

## 1. Tables Covered by `supabase/migrations/20261113_unified_backend.sql`

### Existing 5 Tables (Preserved & Extended Non-Destructively)
1. `public.profiles`
2. `public.game_states`
3. `public.workout_sessions`
4. `public.nutrition_logs`
5. `public.habit_logs`

### 20 Missing Tables Created Idempotently (`CREATE TABLE IF NOT EXISTS`)
**Player & Economy**
1. `public.habits`
2. `public.hydration_daily`
3. `public.economy_transactions`
4. `public.shop_items`
5. `public.player_weapons`
6. `public.player_buffs`
7. `public.player_purchases`

**Quests & Achievements**
8. `public.quests_catalog`
9. `public.player_quest_progress`
10. `public.achievements_catalog`
11. `public.player_achievements`

**Boss System**
12. `public.boss_encounters`

**Multiplayer & Social**
13. `public.guilds`
14. `public.guild_members`
15. `public.guild_challenges`
16. `public.guild_challenge_contributions`
17. `public.friendships`
18. `public.chat_messages`
19. `public.chat_reports`
20. `public.notifications`

*(Plus `public.public_champion_directory` and `security_invoker` view `public.champion_public_profiles` for safe leaderboard queries without exposing private `profiles` columns.)*

---

## 2. Exact Pre-Migration Backup Instructions

Take backups **before** running any migration SQL on project `grlnojmvacbpcqfhzwpd`.

### Option A — Supabase CLI / `pg_dump` (Recommended)
1. Open **Supabase Dashboard → Project (`grlnojmvacbpcqfhzwpd`) → Project Settings → Database → Connection string → URI** (use the **Direct** connection string, not transaction pooler).
2. Run in your terminal:

```bash
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-DB-PASSWORD]@db.grlnojmvacbpcqfhzwpd.supabase.co:5432/postgres?sslmode=require"
mkdir -p ./backups
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")

# 1. Full schema backup (tables, functions, triggers, RLS policies, grants)
pg_dump "$SUPABASE_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file "./backups/lifequest_schema_${TIMESTAMP}.sql"

# 2. Full data backup of public + auth schemas (existing accounts, saves, logs)
pg_dump "$SUPABASE_DB_URL" \
  --data-only \
  --schema=public \
  --schema=auth \
  --column-inserts \
  --file "./backups/lifequest_data_${TIMESTAMP}.sql"

# 3. Pre-migration snapshot of the 5 original tables individually (fast restore)
pg_dump "$SUPABASE_DB_URL" \
  -t public.profiles \
  -t public.game_states \
  -t public.workout_sessions \
  -t public.nutrition_logs \
  -t public.habit_logs \
  --file "./backups/lifequest_original_5_tables_${TIMESTAMP}.sql"
```

### Option B — Supabase Dashboard Snapshot
1. Open **Supabase Dashboard → Project `grlnojmvacbpcqfhzwpd` → Database → Backups**.
2. Confirm a recent daily backup or create a manual backup before running SQL.
3. Also record row counts of your 5 existing tables in **SQL Editor**:
```sql
SELECT 'profiles' AS tbl, count(*) FROM public.profiles
UNION ALL SELECT 'game_states', count(*) FROM public.game_states
UNION ALL SELECT 'workout_sessions', count(*) FROM public.workout_sessions
UNION ALL SELECT 'nutrition_logs', count(*) FROM public.nutrition_logs
UNION ALL SELECT 'habit_logs', count(*) FROM public.habit_logs;
```

---

## 3. Beginner-Friendly Manual Execution (Supabase Dashboard → SQL Editor)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select project **`grlnojmvacbpcqfhzwpd`**.
2. Go to **Database → Backups** and confirm your backup from Section 2 exists.
3. Open **SQL Editor** in the left sidebar → click **+ New query**.
4. Open `supabase/migrations/20261113_unified_backend.sql` in your repository, copy the **entire file contents**, and paste into the SQL Editor.
5. Click **Run** (`Ctrl+Enter` / `Cmd+Enter`).
   - Because the file is wrapped in `BEGIN; ... COMMIT;`, either everything applies cleanly or nothing changes on error.
   - Wait for `Success. No rows returned` (or query complete).
6. **Verify all 25 tables & RLS status immediately** by running this read-only check in a new SQL Editor tab:
```sql
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'profiles','game_states','workout_sessions','nutrition_logs','habit_logs',
    'habits','hydration_daily','economy_transactions','shop_items',
    'player_weapons','player_buffs','player_purchases',
    'quests_catalog','player_quest_progress','achievements_catalog','player_achievements',
    'boss_encounters',
    'guilds','guild_members','guild_challenges','guild_challenge_contributions',
    'friendships','chat_messages','chat_reports','notifications',
    'public_champion_directory'
  )
ORDER BY c.relname;
```
Confirm **26 rows** return (`5 original + 20 new + public_champion_directory`), all with `rls_enabled = true`, and re-run the Section 2 row-count query to confirm your 5 original tables kept 100% of existing rows.

7. **Run the 10-Point Verification Suite (Non-Destructive):**
   - Paste `supabase/tests/unified_backend_security_verification.sql` into SQL Editor and click **Run** (or run via `psql`).
   - Note: Running against a database requires `SET ROLE` permission on `auth.users` inside a transaction that ends with `ROLLBACK;`. Prefer running on a staging copy/branch first.
   - Confirm `PASS [Test 1]` through `PASS [Test 10]` print with `ROLLBACK`.

8. **Additive Weapon Arsenal Expansion (`20261114_weapon_arsenal_expansion.sql`):**
   - After running `20261113_unified_backend.sql`, run `supabase/migrations/20261114_weapon_arsenal_expansion.sql` in SQL Editor. This migration is strictly additive (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS public.weapon_catalog`, `ON CONFLICT DO UPDATE` for 18 new shop items, and adds `rpc_unlock_progression_weapon` + `rpc_ascend_weapon_rarity`). Zero existing rows or tables are deleted or renamed.
   - Verify non-destructively on staging/branch with `supabase/tests/weapon_arsenal_security_verification.sql` (`PASS [Arsenal 1]` through `PASS [Arsenal 7]`).

9. **Social System, Real Guilds & Economy Rebalancing (`20261115_social_guilds_economy_rebalance.sql`):**
   - After running `20261113_unified_backend.sql` and `20261114_weapon_arsenal_expansion.sql`, run `supabase/migrations/20261115_social_guilds_economy_rebalance.sql` in SQL Editor.
   - **What it does safely:** Adds additive privacy columns on `public.profiles` (`bio`, `profile_visibility`, `show_achievements`, `show_equipment`, `show_stats`, `show_guild`), creates `user_blocks`, `guild_join_requests`, and `guild_invites` with RLS, strips Google OAuth `http%` URLs from all public RPCs, purges ONLY unjoined static placeholder guilds (`guild-1`, `guild-2`, `guild-3` with 0 members — preserving every real user guild), adds full guild governance & public profile RPCs, and rebalances `shop_items` prices and future habit/boss XP while keeping 100% of existing earned player XP, Gold, Aether Points, and items intact.
   - Verify non-destructively on staging/branch with `supabase/tests/social_guilds_economy_security_verification.sql` (`PASS [Social 1]` through `PASS [Economy 5]`).

---

## 4. Live REST / PostgREST Exploit Verification (Staging / Post-Migration)

Using a real signed-in test user JWT (`$ACCESS_TOKEN`) and your project's `$ANON_KEY`:

1. **Unauthenticated (`anon`) RPC call fails (`401` / `403`):**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_claim_habit_reward" \
     -H "apikey: $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"p_habit_id":"h-1","p_idempotency_key":"11111111-1111-4111-8111-111111111111"}'
   ```
   Expected: `401` or `403`.

2. **Direct Gold/XP update fails (`403` / `42501`):**
   ```bash
   curl -i -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
     -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"gold_balance": 999999}'
   ```
   Expected: HTTP `401`/`403` (`permission denied for table profiles` or progression guard error).

3. **Legitimate timezone/preference update succeeds (`200`/`204`):**
   ```bash
   curl -i -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
     -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"timezone":"America/Chicago"}'
   ```
   Expected: HTTP `200` or `204`.

4. **Internal helper RPC blocked (`401`/`403`/`404`):**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     -X POST "$SUPABASE_URL/rest/v1/rpc/_credit_currencies" \
     -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"p_user_id":"'"$USER_ID"'","p_gold":1000}'
   ```
   Expected: `401`, `403`, or `404`.

---

## 5. Edge Function Warning — `dispatch-notification` (DO NOT DEPLOY AS-IS)

`supabase/functions/dispatch-notification/index.ts` remains **undeployed** intentionally.
- **Why it is unsafe right now:** Lines 56–70 instantiate `createClient(supabaseUrl, serviceRoleKey)` and insert a row into `public.notifications` for **any** `input.targetUserId` and **any** `type` (including `'system'`, `'achievement'`, `'rank_up'`) whenever a caller supplies any valid user JWT — without checking whether the caller has permission to notify that target user. Any authenticated user could spam or spoof system notifications to any other user in Aetheria.
- **How to fix it before deploying:**
  1. Never allow user JWTs to mint `'system'`, `'achievement'`, or `'rank_up'` notifications (those must only be inserted by server triggers/RPCs or a verified webhook shared secret).
  2. For user-triggered social types (`'guild_invite'`, `'guild_raid'`), require the server to verify that `caller.user.id` is a `leader` or `officer` of a guild shared with `input.targetUserId` (or an accepted friend for friend-only notifications), and sanitize/bound `title` and `body` length before inserting.

---

## 6. Rollback Precautions

1. Execute backups in Section 2 immediately before applying the migration.
2. Deploy the matching frontend build alongside the SQL migration so browsers use `rpc_list_guilds`, `rpc_claim_habit_reward`, `rpc_log_workout`, `rpc_log_nutrition`, `rpc_start_boss_encounter`, `rpc_boss_combat_turn`, and `rpc_complete_boss_victory`.
3. **If rollback is needed:**
   - Do **NOT** drop existing user tables (`profiles`, `game_states`, `workout_sessions`, `nutrition_logs`, `habit_logs`).
   - Restore your pre-migration backup (`lifequest_original_5_tables_${TIMESTAMP}.sql` / `lifequest_data_${TIMESTAMP}.sql`) into a staging verification instance or selectively revert policies/functions from `lifequest_schema_${TIMESTAMP}.sql`.
