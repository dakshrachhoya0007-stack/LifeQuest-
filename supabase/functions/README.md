# LifeQuest Unified Backend Deployment Guide (Web + Mobile)

This directory contains the shared PostgreSQL schema migration and Supabase Edge Functions powering both the LifeQuest Website and the LifeQuest Mobile Application against your existing Supabase project.

## 1. Apply Database Migration (Zero Data Loss)
Run `/supabase/migrations/20261113_unified_backend.sql` in your **Supabase Dashboard -> SQL Editor** (or via Supabase CLI: `supabase db push`).
- Safely preserves all existing rows in `profiles`, `game_states`, `workout_sessions`, `nutrition_logs`, and `habit_logs`.
- Automatically backfills legacy `game_states.game_data` into normalized progression tables when each player signs in (`rpc_bootstrap_player_state()`).
- Enforces database-level duplicate habit claim protection via `unique_habit_claim_per_period (user_id, habit_id, period_key)`.

## 2. Deploy Edge Functions (Optional Enhanced Endpoints)
```bash
supabase functions deploy bootstrap-player
supabase functions deploy dispatch-notification
```

## 3. Shared Client Contract (Web & Mobile)
Both platforms authenticate against the same `auth.users` / Supabase Auth project and call the same Postgres RPCs:
- `rpc_bootstrap_player_state()`
- `rpc_claim_habit_reward(p_habit_id, p_idempotency_key)`
- `rpc_log_workout(...)` / `rpc_log_nutrition(...)` / `rpc_log_water_glass()`
- `rpc_claim_quest(...)` / `rpc_claim_achievement(...)`
- `rpc_purchase_shop_item(...)` / `rpc_upgrade_weapon(...)` / `rpc_evolve_weapon(...)`
- `rpc_complete_boss_victory(...)` / `rpc_discover_boss_weakness(...)`
- `rpc_get_leaderboard(p_scope, p_limit, p_offset)` (`global` | `weekly` | `monthly` | `friends` | `guild`)
- `rpc_create_guild(...)` / `rpc_join_guild(...)` / `rpc_leave_guild()`
- `rpc_send_friend_request(...)` / `rpc_respond_friend_request(...)` / `rpc_search_champions(...)`
- `rpc_send_chat_message(...)` / `rpc_mark_notifications_read(...)`
