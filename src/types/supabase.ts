export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          character_name: string | null;
          avatar_url: string | null;
          character_class: string;
          level: number;
          player_xp: number;
          player_xp_next_level: number;
          total_xp: number;
          forge_xp: number;
          gold_balance: number;
          aether_rank: string;
          aether_points: number;
          aether_points_next_rank: number;
          current_streak: number;
          total_workouts_completed: number;
          total_verified_reps: number;
          total_bosses_defeated: number;
          current_kingdom_id: string;
          current_chapter_id: string;
          equipped_weapon_id: string;
          preferred_units: string;
          age_years: number | null;
          age_group: string | null;
          biological_sex: string | null;
          height: string | null;
          weight: string | null;
          activity_level: string;
          preferred_fitness_activities: string[];
          fitness_goals: string[];
          dietary_preference: string;
          food_allergies: string[];
          food_intolerances: string[];
          disliked_foods: string;
          notification_preferences: Json;
          timezone: string;
          sound_enabled: boolean;
          is_onboarded: boolean;
          leaderboard_visible: boolean;
          bio: string;
          profile_visibility: string;
          show_achievements: boolean;
          show_equipment: boolean;
          show_stats: boolean;
          show_guild: boolean;
          presence_status: string;
          auto_away_enabled: boolean;
          auto_away_minutes: number;
          privacy_settings: Json;
          legacy_migrated: boolean;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          username?: string;
          character_name?: string | null;
          avatar_url?: string | null;
          character_class?: string;
          preferred_units?: string;
          age_years?: number | null;
          age_group?: string | null;
          biological_sex?: string | null;
          height?: string | null;
          weight?: string | null;
          activity_level?: string;
          preferred_fitness_activities?: string[];
          fitness_goals?: string[];
          dietary_preference?: string;
          food_allergies?: string[];
          food_intolerances?: string[];
          disliked_foods?: string;
          notification_preferences?: Json;
          timezone?: string;
          sound_enabled?: boolean;
          is_onboarded?: boolean;
          leaderboard_visible?: boolean;
          bio?: string;
          profile_visibility?: string;
          show_achievements?: boolean;
          show_equipment?: boolean;
          show_stats?: boolean;
          show_guild?: boolean;
          presence_status?: string;
          auto_away_enabled?: boolean;
          auto_away_minutes?: number;
          privacy_settings?: Json;
          last_active_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_champion_directory: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          character_class: string;
          level: number;
          total_xp: number;
          aether_rank: string;
          aether_points: number;
          current_streak: number;
          total_bosses_defeated: number;
          leaderboard_visible: boolean;
          bio: string;
          profile_visibility: string;
          show_achievements: boolean;
          show_equipment: boolean;
          show_stats: boolean;
          show_guild: boolean;
          equipped_weapon_id: string;
          last_active_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      game_states: {
        Row: {
          id: string;
          user_id: string;
          game_data: Json;
          state_version: number;
          client_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          workout_data: Json;
          exercise_type: string | null;
          exercise_name: string | null;
          duration_minutes: number;
          repetitions: number;
          distance_km: number | null;
          verified_with_vision: boolean;
          xp_awarded: number;
          forge_xp_awarded: number;
          gold_awarded: number;
          aether_points_awarded: number;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      nutrition_logs: {
        Row: {
          id: string;
          user_id: string;
          meal_data: Json;
          meal_type: string | null;
          title: string | null;
          dietary_category: string | null;
          log_date: string;
          xp_awarded: number;
          forge_xp_awarded: number;
          gold_awarded: number;
          aether_points_awarded: number;
          idempotency_key: string | null;
          logged_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          frequency_type: string;
          period_key: string;
          xp_awarded: number;
          forge_xp_awarded: number;
          gold_awarded: number;
          aether_points_awarded: number;
          idempotency_key: string | null;
          habit_data: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      hydration_daily: {
        Row: {
          user_id: string;
          log_date: string;
          glasses_count: number;
          rewarded_glasses_count: number;
          goal_reward_claimed: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          frequency: string;
          icon_name: string;
          player_xp_reward: number;
          forge_xp_reward: number;
          gold_reward: number;
          streak: number;
          last_period_key: string | null;
          last_completed_at: string | null;
          archived_at: string | null;
          rebalance_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      economy_transactions: {
        Row: {
          id: string;
          user_id: string;
          currency: string;
          delta: number;
          balance_after: number;
          source_type: string;
          source_id: string | null;
          description: string;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      shop_items: {
        Row: {
          id: string;
          item_type: string;
          name: string;
          description: string;
          rarity: string;
          price_gold: number;
          price_forge_xp: number;
          required_level: number;
          metadata: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_weapons: {
        Row: {
          user_id: string;
          weapon_id: string;
          name: string;
          category: string;
          rarity: string;
          level: number;
          max_level: number;
          base_attack: number;
          attack_per_level: number;
          base_defense: number;
          defense_per_level: number;
          upgrade_forge_cost: number;
          unlocked: boolean;
          equipped: boolean;
          evolution_stage: string;
          mastery_level: number;
          mastery_xp: number;
          mastery_xp_next_level: number;
          mastery_path: string;
          abilities: Json;
          crit_chance?: number;
          crit_damage?: number;
          speed?: number;
          element?: string;
          ability_power?: number;
          awakened?: boolean;
          awakening_level?: number;
          evolution_target_id?: string | null;
          unlock_source?: string;
          last_mastery_drill_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_buffs: {
        Row: {
          user_id: string;
          buff_id: string;
          name: string;
          effect_type: string;
          effect_value: number;
          duration_battles: number;
          uses_remaining: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_purchases: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          price_gold: number;
          price_forge_xp: number;
          idempotency_key: string | null;
          purchased_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quests_catalog: {
        Row: {
          id: string;
          title: string;
          description: string;
          quest_type: string;
          category: string;
          max_progress: number;
          player_xp_reward: number;
          forge_xp_reward: number;
          gold_reward: number;
          is_active: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_quest_progress: {
        Row: {
          user_id: string;
          quest_id: string;
          period_key: string;
          progress: number;
          max_progress: number;
          completed: boolean;
          claimed: boolean;
          claimed_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      achievements_catalog: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: string;
          icon: string;
          max_progress: number;
          reward_player_xp: number;
          reward_forge_xp: number;
          reward_gold: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          progress: number;
          max_progress: number;
          unlocked: boolean;
          claimed: boolean;
          claimed_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      boss_encounters: {
        Row: {
          user_id: string;
          kingdom_id: string;
          boss_id: string;
          unlocked: boolean;
          cleared: boolean;
          boss_hp: number;
          boss_max_hp: number;
          player_hp: number;
          player_stamina: number;
          current_phase: number;
          turn_count: number;
          telegraph_active: boolean;
          weakness_discovered: boolean;
          first_clear_claimed: boolean;
          battle_active: boolean;
          victory_pending: boolean;
          last_repeat_reward_period_key: string | null;
          last_victory_at: string | null;
          times_defeated: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      guilds: {
        Row: {
          id: string;
          name: string;
          tag: string;
          emblem: string;
          level: number;
          guild_xp: number;
          is_public: boolean;
          min_level: number;
          max_members: number;
          description: string;
          weekly_quest_name: string;
          weekly_quest_progress: number;
          weekly_quest_max: number;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      guild_join_requests: {
        Row: {
          id: string;
          guild_id: string;
          user_id: string;
          message: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      guild_invites: {
        Row: {
          id: string;
          guild_id: string;
          inviter_id: string;
          invitee_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      guild_members: {
        Row: {
          guild_id: string;
          user_id: string;
          role: string;
          weekly_contribution: number;
          joined_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      guild_challenges: {
        Row: {
          id: string;
          guild_id: string;
          title: string;
          period_key: string;
          target_value: number;
          current_value: number;
          reward_gold: number;
          reward_player_xp: number;
          completed: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      guild_challenge_contributions: {
        Row: {
          id: string;
          challenge_id: string;
          guild_id: string;
          user_id: string;
          contribution_delta: number;
          source_type: string;
          source_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          channel: string;
          guild_id: string | null;
          sender_id: string;
          recipient_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      chat_reports: {
        Row: {
          id: string;
          message_id: string;
          reporter_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          reporter_id: string;
          reason?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      champion_public_profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          character_class: string;
          level: number;
          total_xp: number;
          aether_rank: string;
          aether_points: number;
          current_streak: number;
          total_bosses_defeated: number;
          leaderboard_visible: boolean;
          bio: string;
          profile_visibility: string;
          show_achievements: boolean;
          show_equipment: boolean;
          show_stats: boolean;
          show_guild: boolean;
          equipped_weapon_id: string;
          last_active_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      rpc_bootstrap_player_state: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rpc_update_profile_preferences: {
        Args: {
          p_username?: string | null;
          p_character_name?: string | null;
          p_avatar_url?: string | null;
          p_character_class?: string | null;
          p_preferred_units?: string | null;
          p_height?: string | null;
          p_weight?: string | null;
          p_activity_level?: string | null;
          p_preferred_fitness_activities?: string[] | null;
          p_fitness_goals?: string[] | null;
          p_dietary_preference?: string | null;
          p_food_allergies?: string[] | null;
          p_food_intolerances?: string[] | null;
          p_disliked_foods?: string | null;
          p_notification_preferences?: Json | null;
          p_timezone?: string | null;
          p_sound_enabled?: boolean | null;
          p_is_onboarded?: boolean | null;
          p_leaderboard_visible?: boolean | null;
          p_age_years?: number | null;
          p_age_group?: string | null;
          p_biological_sex?: string | null;
          p_bio?: string | null;
          p_profile_visibility?: string | null;
          p_show_achievements?: boolean | null;
          p_show_equipment?: boolean | null;
          p_show_stats?: boolean | null;
          p_show_guild?: boolean | null;
        };
        Returns: Json;
      };
      rpc_save_client_preferences: {
        Args: { p_preferences: Json };
        Returns: Json;
      };
      rpc_claim_habit_reward: {
        Args: { p_habit_id: string; p_idempotency_key?: string };
        Returns: Json;
      };
      rpc_create_habit: {
        Args: {
          p_name: string;
          p_category?: string;
          p_frequency?: string;
          p_icon_name?: string;
          p_player_xp?: number;
          p_forge_xp?: number;
          p_gold?: number;
        };
        Returns: Json;
      };
      rpc_archive_habit: {
        Args: { p_habit_id: string };
        Returns: Json;
      };
      rpc_log_workout: {
        Args: {
          p_exercise_type: string;
          p_exercise_name: string;
          p_duration_minutes?: number;
          p_repetitions?: number;
          p_distance_km?: number | null;
          p_verified_with_vision?: boolean;
          p_notes?: string | null;
          p_idempotency_key?: string;
        };
        Returns: Json;
      };
      rpc_log_nutrition: {
        Args: {
          p_meal_type: string;
          p_title: string;
          p_food_items: string[];
          p_dietary_category?: string;
          p_balanced_notes?: string | null;
          p_idempotency_key?: string;
          p_nutrition_estimate?: Json | null;
        };
        Returns: Json;
      };
      rpc_log_water_glass: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rpc_reset_water_daily: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rpc_claim_quest: {
        Args: { p_quest_id: string; p_period_key?: string };
        Returns: Json;
      };
      rpc_claim_achievement: {
        Args: { p_achievement_id: string };
        Returns: Json;
      };
      rpc_purchase_shop_item: {
        Args: { p_item_id: string; p_idempotency_key?: string };
        Returns: Json;
      };
      rpc_equip_weapon: {
        Args: { p_weapon_id: string };
        Returns: Json;
      };
      rpc_upgrade_weapon: {
        Args: { p_weapon_id: string };
        Returns: Json;
      };
      rpc_train_weapon_mastery: {
        Args: { p_weapon_id: string; p_gained_xp?: number };
        Returns: Json;
      };
      rpc_evolve_weapon: {
        Args: { p_weapon_id: string };
        Returns: Json;
      };
      rpc_toggle_buff: {
        Args: { p_buff_id: string };
        Returns: Json;
      };
      rpc_discover_boss_weakness: {
        Args: { p_kingdom_id: string };
        Returns: Json;
      };
      rpc_start_boss_encounter: {
        Args: { p_kingdom_id: string };
        Returns: Json;
      };
      rpc_boss_combat_turn: {
        Args: {
          p_kingdom_id: string;
          p_action: string;
          p_ability_id?: string | null;
        };
        Returns: Json;
      };
      rpc_complete_boss_victory: {
        Args: { p_kingdom_id: string; p_idempotency_key?: string };
        Returns: Json;
      };
      rpc_reset_boss_encounter: {
        Args: { p_kingdom_id: string };
        Returns: Json;
      };
      rpc_list_guilds: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          tag: string;
          emblem: string;
          level: number;
          max_members: number;
          description: string;
          weekly_quest_name: string;
          weekly_quest_progress: number;
          weekly_quest_max: number;
          members_count: number;
          is_member: boolean;
          my_role: string | null;
          is_public: boolean;
          min_level: number;
          guild_xp: number;
          owner_id: string | null;
          has_pending_request: boolean;
          has_pending_invite: boolean;
        }[];
      };
      rpc_create_guild: {
        Args: {
          p_name: string;
          p_tag: string;
          p_description?: string;
          p_emblem?: string;
          p_is_public?: boolean;
          p_min_level?: number;
        };
        Returns: Json;
      };
      rpc_join_guild: {
        Args: { p_guild_id: string };
        Returns: Json;
      };
      rpc_request_join_guild: {
        Args: { p_guild_id: string; p_message?: string };
        Returns: Json;
      };
      rpc_respond_guild_request: {
        Args: { p_request_id: string; p_accept: boolean };
        Returns: Json;
      };
      rpc_invite_to_guild: {
        Args: { p_guild_id: string; p_target_user_id: string };
        Returns: Json;
      };
      rpc_respond_guild_invite: {
        Args: { p_invite_id: string; p_accept: boolean };
        Returns: Json;
      };
      rpc_list_my_guild_invites: {
        Args: Record<string, never>;
        Returns: {
          invite_id: string;
          guild_id: string;
          guild_name: string;
          guild_tag: string;
          guild_level: number;
          inviter_name: string;
          created_at: string;
        }[];
      };
      rpc_disband_guild: {
        Args: { p_guild_id: string };
        Returns: Json;
      };
      rpc_create_guild_challenge: {
        Args: {
          p_guild_id: string;
          p_title: string;
          p_target_value?: number;
          p_reward_gold?: number;
          p_reward_player_xp?: number;
        };
        Returns: Json;
      };
      rpc_get_guild_details: {
        Args: { p_guild_id: string };
        Returns: Json;
      };
      rpc_leave_guild: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rpc_update_guild_details: {
        Args: {
          p_guild_id: string;
          p_description?: string | null;
          p_weekly_quest_name?: string | null;
          p_is_public?: boolean | null;
          p_min_level?: number | null;
          p_emblem?: string | null;
        };
        Returns: Json;
      };
      rpc_manage_guild_member: {
        Args: {
          p_guild_id: string;
          p_target_user_id: string;
          p_action: string;
        };
        Returns: Json;
      };
      rpc_send_friend_request: {
        Args: { p_target_user_id: string };
        Returns: Json;
      };
      rpc_cancel_friend_request: {
        Args: { p_friendship_id: string };
        Returns: Json;
      };
      rpc_respond_friend_request: {
        Args: { p_friendship_id: string; p_accept: boolean };
        Returns: Json;
      };
      rpc_remove_friend: {
        Args: { p_friendship_id: string };
        Returns: Json;
      };
      rpc_block_user: {
        Args: { p_target_user_id: string };
        Returns: Json;
      };
      rpc_unblock_user: {
        Args: { p_target_user_id: string };
        Returns: Json;
      };
      rpc_list_blocked_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          username: string;
          character_class: string;
          level: number;
          aether_rank: string;
          blocked_at: string;
        }[];
      };
      rpc_get_public_player_profile: {
        Args: { p_target_user_id: string };
        Returns: Json;
      };
      rpc_search_champions: {
        Args: { p_query?: string; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          username: string;
          avatar_url: string | null;
          character_class: string;
          level: number;
          aether_rank: string;
          current_streak: number;
          bio: string;
          profile_visibility: string;
          relationship_status: string;
          friendship_id: string | null;
          guild_id: string | null;
          guild_name: string | null;
          guild_tag: string | null;
          achievement_count: number;
        }[];
      };
      rpc_get_champion_profiles: {
        Args: { p_user_ids: string[] };
        Returns: {
          id: string;
          username: string;
          avatar_url: string | null;
          character_class: string;
          level: number;
          aether_rank: string;
          current_streak: number;
        }[];
      };
      rpc_send_chat_message: {
        Args: {
          p_channel: string;
          p_body: string;
          p_guild_id?: string | null;
          p_recipient_id?: string | null;
        };
        Returns: Json;
      };
      rpc_report_chat_message: {
        Args: { p_message_id: string; p_reason?: string };
        Returns: Json;
      };
      rpc_mark_notifications_read: {
        Args: { p_notification_id?: string | null };
        Returns: Json;
      };
      rpc_get_leaderboard: {
        Args: { p_scope?: string; p_limit?: number; p_offset?: number };
        Returns: {
          rank: number;
          user_id: string;
          username: string;
          avatar_url: string | null;
          character_class: string;
          level: number;
          aether_rank: string;
          streak: number;
          score: number;
          is_current_user: boolean;
        }[];
      };
      rpc_unlock_progression_weapon: {
        Args: { p_weapon_id: string; p_idempotency_key?: string };
        Returns: Json;
      };
      rpc_ascend_weapon_rarity: {
        Args: { p_weapon_id: string; p_idempotency_key?: string };
        Returns: Json;
      };
      rpc_update_presence: {
        Args: {
          p_status?: string | null;
          p_auto_away_enabled?: boolean | null;
          p_auto_away_minutes?: number | null;
          p_heartbeat_only?: boolean;
        };
        Returns: Json;
      };
      rpc_get_presence_batch: {
        Args: { p_user_ids: string[] };
        Returns: Json;
      };
      rpc_update_privacy_settings: {
        Args: { p_privacy_settings: Json };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
