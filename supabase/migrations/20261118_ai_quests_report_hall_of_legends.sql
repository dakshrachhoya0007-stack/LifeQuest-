-- ==============================================================================
-- LIFEQUEST: AI DYNAMIC QUESTS, DAILY QUEST REPORT & HALL OF LEGENDS
-- Additive, race-safe PostgreSQL schema & SECURITY DEFINER RPCs
-- Strictly enforces One-Player-Only Worldwide ownership on Global Achievements
-- Preserves all existing user data, normal quests, and normal achievements.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PROFILE LEGEND TITLE COLUMNS & PUBLIC DIRECTORY SYNC
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_legend_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_legend_style TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_legend_emblem TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_legend_achievement_id TEXT DEFAULT NULL;

ALTER TABLE public.public_champion_directory
  ADD COLUMN IF NOT EXISTS equipped_legend_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_legend_style TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_legend_emblem TEXT DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.sync_public_champion_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_champion_directory (
    id, username, avatar_url, character_class, level, total_xp,
    aether_rank, aether_points, current_streak, total_bosses_defeated,
    leaderboard_visible, last_active_at,
    bio, profile_visibility, show_achievements, show_equipment, show_stats, show_guild, equipped_weapon_id,
    equipped_legend_title, equipped_legend_style, equipped_legend_emblem
  )
  VALUES (
    NEW.id,
    NEW.username,
    CASE WHEN COALESCE(NEW.avatar_url, '') LIKE 'http%' THEN NULL ELSE NEW.avatar_url END,
    NEW.character_class,
    NEW.level,
    NEW.total_xp,
    NEW.aether_rank,
    NEW.aether_points,
    NEW.current_streak,
    NEW.total_bosses_defeated,
    NEW.leaderboard_visible,
    NEW.last_active_at,
    COALESCE(NEW.bio, ''),
    COALESCE(NEW.profile_visibility, 'public'),
    COALESCE(NEW.show_achievements, true),
    COALESCE(NEW.show_equipment, true),
    COALESCE(NEW.show_stats, true),
    COALESCE(NEW.show_guild, true),
    COALESCE(NEW.equipped_weapon_id, 'w-sword-1'),
    NEW.equipped_legend_title,
    NEW.equipped_legend_style,
    NEW.equipped_legend_emblem
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    character_class = EXCLUDED.character_class,
    level = EXCLUDED.level,
    total_xp = EXCLUDED.total_xp,
    aether_rank = EXCLUDED.aether_rank,
    aether_points = EXCLUDED.aether_points,
    current_streak = EXCLUDED.current_streak,
    total_bosses_defeated = EXCLUDED.total_bosses_defeated,
    leaderboard_visible = EXCLUDED.leaderboard_visible,
    last_active_at = EXCLUDED.last_active_at,
    bio = EXCLUDED.bio,
    profile_visibility = EXCLUDED.profile_visibility,
    show_achievements = EXCLUDED.show_achievements,
    show_equipment = EXCLUDED.show_equipment,
    show_stats = EXCLUDED.show_stats,
    show_guild = EXCLUDED.show_guild,
    equipped_weapon_id = EXCLUDED.equipped_weapon_id,
    equipped_legend_title = EXCLUDED.equipped_legend_title,
    equipped_legend_style = EXCLUDED.equipped_legend_style,
    equipped_legend_emblem = EXCLUDED.equipped_legend_emblem;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_public_champion_directory() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. AI DYNAMIC DAILY QUESTS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_dynamic_quests (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('physical', 'intellectual', 'discipline', 'personal_growth', 'social')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'challenging', 'special')),
  objective_label TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL DEFAULT 1,
  unit_label TEXT NOT NULL DEFAULT 'step',
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  player_xp_reward INTEGER NOT NULL DEFAULT 30,
  forge_xp_reward INTEGER NOT NULL DEFAULT 20,
  gold_reward INTEGER NOT NULL DEFAULT 25,
  is_special_challenge BOOLEAN NOT NULL DEFAULT false,
  personalization_reason TEXT NOT NULL DEFAULT '',
  adaptive_tier TEXT NOT NULL DEFAULT 'balanced',
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  evidence_note TEXT DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_key, id)
);

CREATE INDEX IF NOT EXISTS idx_player_dynamic_quests_user_period
  ON public.player_dynamic_quests(user_id, period_key DESC);

ALTER TABLE public.player_dynamic_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dynamic quests" ON public.player_dynamic_quests;
CREATE POLICY "Users can view own dynamic quests"
  ON public.player_dynamic_quests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. DAILY QUEST REPORTS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_daily_reports (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, report_date)
);

ALTER TABLE public.player_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily reports" ON public.player_daily_reports;
CREATE POLICY "Users can view own daily reports"
  ON public.player_daily_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. GLOBAL EXCLUSIVE ACHIEVEMENTS (52 ONE-OF-ONE WORLDWIDE TITLES)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.global_achievements_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  story TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  title_tag TEXT NOT NULL,
  title_style TEXT NOT NULL,
  emblem_icon TEXT NOT NULL,
  requirement_summary TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  reward_player_xp INTEGER NOT NULL DEFAULT 300,
  reward_forge_xp INTEGER NOT NULL DEFAULT 200,
  reward_gold INTEGER NOT NULL DEFAULT 400,
  is_hidden BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.global_achievement_claims (
  achievement_id TEXT PRIMARY KEY REFERENCES public.global_achievements_catalog(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_username TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_achievement_claims_owner
  ON public.global_achievement_claims(owner_id);

CREATE TABLE IF NOT EXISTS public.global_legend_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id TEXT NOT NULL REFERENCES public.global_achievements_catalog(id) ON DELETE CASCADE,
  achievement_name TEXT NOT NULL,
  title_tag TEXT NOT NULL,
  title_style TEXT NOT NULL,
  emblem_icon TEXT NOT NULL,
  rarity TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_username TEXT NOT NULL,
  announced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_achievements_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_achievement_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_legend_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view global catalog" ON public.global_achievements_catalog;
CREATE POLICY "Authenticated can view global catalog"
  ON public.global_achievements_catalog FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can view global claims" ON public.global_achievement_claims;
CREATE POLICY "Authenticated can view global claims"
  ON public.global_achievement_claims FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can view legend announcements" ON public.global_legend_announcements;
CREATE POLICY "Authenticated can view legend announcements"
  ON public.global_legend_announcements FOR SELECT
  TO authenticated
  USING (true);

-- Seed all 52 Worldwide Exclusive Achievements
INSERT INTO public.global_achievements_catalog (
  id, name, story, category, rarity, difficulty, title_tag, title_style,
  emblem_icon, requirement_summary, requirement_type, threshold,
  reward_player_xp, reward_forge_xp, reward_gold, is_hidden
) VALUES
  ('gl-disc-01','Oathkeeper of Dawn','First across the realm to forge steel out of pure morning discipline and honor.','legendary_discipline','Legendary','Hard','OATHKEEPER OF DAWN','gold','ShieldCheck','Complete 5 Discipline AI quests','dynamic_discipline_claimed',5,350,250,400,false),
  ('gl-disc-02','The Unyielding Vow','While lesser knights broke when fatigue spoke, only one stood firm through twenty-five habits.','legendary_discipline','Legendary','Hard','THE UNYIELDING','gold','Flame','Record 25 completed habit logs across your journey','habits_claimed_total',25,400,250,450,false),
  ('gl-disc-03','Architect of Order','Carved structure out of chaos, finishing twenty AI-forged daily quests with honor.','legendary_discipline','Mythic','Extreme','ARCHITECT OF ORDER','arcane','Compass','Claim 20 AI Dynamic Daily Quests','dynamic_quests_claimed_total',20,550,380,650,false),
  ('gl-disc-04','Sovereign of Routine','No distraction could pierce the armor of a hundred daily vows kept in sequence.','legendary_discipline','Ascendant','Extreme','ROUTINE SOVEREIGN','celestial','Crown','Record 100 completed habit logs','habits_claimed_total',100,900,650,1200,false),
  ('gl-disc-05','Sentinel of Procrastination Slain','Struck down hesitation at its root by conquering fifteen Discipline quests.','legendary_discipline','Mythic','Extreme','IRON WILL SENTINEL','crimson','Swords','Claim 15 Discipline category AI quests','dynamic_discipline_claimed',15,600,420,750,false),
  ('gl-disc-06','Tempered Temperance','Mastered personal growth through deliberate reflection and thirty completed quests.','legendary_discipline','Celestial','Pinnacle','TEMPERED PARAGON','emerald','Gem','Claim 30 quests across classic and dynamic quest boards','quests_claimed_total',30,850,600,1000,false),
  ('gl-disc-07','The First Ascendant','First mortal in Aetheria whose sheer accumulation of disciplined deeds shook the Vault.','legendary_discipline','Eternal','Pinnacle','THE FIRST ASCENDANT','prismatic','Sparkles','Amass 15,000 total Player XP across the realm','total_xp',15000,1500,1000,2500,false),

  ('gl-know-01','Scribe of the Astral Archive','Inscribed the first verified reflections of real study into the living chronicle.','master_of_knowledge','Legendary','Hard','ASTRAL SCRIBE','celestial','BookOpen','Complete 5 Intellectual category AI quests','dynamic_intellectual_claimed',5,350,240,400,false),
  ('gl-know-02','Grand Scholar of Aetheria','Turned quiet hours of reading and problem-solving into unmatched arcane intellect.','master_of_knowledge','Mythic','Extreme','GRAND SCHOLAR','arcane','GraduationCap','Complete 15 Intellectual category AI quests','dynamic_intellectual_claimed',15,650,450,800,false),
  ('gl-know-03','Oracle of Self-Mastery','Studied their own Daily Quest Reports relentlessly to refine tomorrow before dawn.','master_of_knowledge','Legendary','Hard','SELF ORACLE','celestial','ScrollText','Generate and review 7 Daily Quest Reports','daily_reports_generated',7,400,280,450,false),
  ('gl-know-04','Sage of Growth','Wove skillcraft and confidence into fifteen Personal Growth victories.','master_of_knowledge','Ascendant','Extreme','SAGE OF GROWTH','emerald','Lightbulb','Complete 15 Personal Growth category AI quests','dynamic_personal_growth_claimed',15,680,480,850,false),
  ('gl-know-05','Luminary of the High Spire','Completed thirty Intellectual trials; even the High Mages seek their counsel.','master_of_knowledge','Celestial','Pinnacle','HIGH SPIRE LUMINARY','celestial','Eye','Complete 30 Intellectual category AI quests','dynamic_intellectual_claimed',30,1100,750,1500,false),
  ('gl-know-06','Keeper of All Scrolls','Mastered twenty-five Daily Quest Reports, missing neither strength nor shadow.','master_of_knowledge','Eternal','Pinnacle','KEEPER OF SCROLLS','prismatic','Library','Generate and review 25 Daily Quest Reports','daily_reports_generated',25,1200,850,1800,false),

  ('gl-phys-01','Vanguard of Iron','The first champion whose sweat forged fifteen verified training sessions.','physical_excellence','Legendary','Hard','VANGUARD OF IRON','crimson','Dumbbell','Complete 15 fitness workout sessions','total_workouts',15,420,320,480,false),
  ('gl-phys-02','Titan of a Thousand Reps','Each repetition witnessed by Aether Vision echoed like thunder in the citadel.','physical_excellence','Mythic','Extreme','TITAN OF IRON','crimson','Zap','Accumulate 1,000 Aether Vision verified repetitions','total_verified_reps',1000,700,550,900,false),
  ('gl-phys-03','Avatar of Motion','Conquered twenty-five Physical AI quests across running, strength, and endurance.','physical_excellence','Ascendant','Extreme','AVATAR OF MOTION','gold','Activity','Complete 25 Physical category AI quests','dynamic_physical_claimed',25,850,600,1100,false),
  ('gl-phys-04','Colossus of Endurance','Fifty full training sessions etched into steel, proving strength is built daily.','physical_excellence','Celestial','Pinnacle','COLOSSUS','crimson','Shield','Complete 50 fitness workout sessions','total_workouts',50,1050,800,1400,false),
  ('gl-phys-05','Five-Thousandfold Strike','Five thousand verified repetitions performed without shortcuts or illusion.','physical_excellence','Eternal','Pinnacle','APEX ATHLETE','prismatic','Trophy','Accumulate 5,000 Aether Vision verified repetitions','total_verified_reps',5000,1600,1200,2600,false),
  ('gl-phys-06','Swift Strider of the Realm','First runner to conquer ten Physical AI quests under the Sunlit Bastion.','physical_excellence','Legendary','Hard','SWIFT STRIDER','emerald','Wind','Complete 10 Physical category AI quests','dynamic_physical_claimed',10,450,300,500,false),
  ('gl-phys-07','Aether Body Ascendant','Gathered 1,500 Aether Points through pure physical mastery and vitality.','physical_excellence','Ascendant','Extreme','AETHER VESSEL','celestial','Sun','Earn 1,500 Aether Points','aether_points',1500,750,550,950,false),

  ('gl-cons-01','Keeper of the Seven-Day Flame','Held a blazing 7-day habit streak before any rival across the realm.','unbreakable_consistency','Legendary','Hard','FLAMEKEEPER','gold','Flame','Reach a 7-day habit streak','current_streak',7,380,260,420,false),
  ('gl-cons-02','Moon-Cycle Warden','Twenty-one unbroken dawns; discipline ceased to be effort and became nature.','unbreakable_consistency','Mythic','Extreme','TWENTY-ONE DAWNS','celestial','Moon','Reach a 21-day habit streak','current_streak',21,800,550,1000,false),
  ('gl-cons-03','Immortal Sunbeam','Sixty consecutive days of showing up—an unbroken legend etched into time itself.','unbreakable_consistency','Eternal','Pinnacle','UNBROKEN','prismatic','Crown','Reach a 60-day habit streak','current_streak',60,2000,1400,3000,false),
  ('gl-cons-04','Steward of Living Springs','Honored the body with 8 full glasses of hydration in one resolute day.','unbreakable_consistency','Legendary','Hard','SPRING STEWARD','celestial','Droplets','Reach 8 glasses in daily hydration tracking','water_glasses_current',8,280,200,320,false),
  ('gl-cons-05','Alchemist of Wholesome Table','Recorded twenty balanced meals, honoring recovery and nourishment as sacred craft.','unbreakable_consistency','Mythic','Hard','HARVEST KEEPER','emerald','Apple','Log 20 balanced meals in Nutrition','meals_logged_total',20,500,350,600,false),
  ('gl-cons-06','Fifty-Meal Connoisseur','Fifty mindful meals logged with honesty, nourishing an unstoppable campaign.','unbreakable_consistency','Ascendant','Extreme','VITALITY MASTER','emerald','Heart','Log 50 balanced meals in Nutrition','meals_logged_total',50,900,650,1200,false),
  ('gl-cons-07','Centurion of Quests','Claimed fifty AI-crafted daily quests without yielding a single season.','unbreakable_consistency','Celestial','Pinnacle','QUEST CENTURION','gold','Award','Claim 50 AI Dynamic Daily Quests','dynamic_quests_claimed_total',50,1300,900,1800,false),

  ('gl-expl-01','Chronicler of the First Ruin','Unlocked five chapters of the Storyline Campaign to rebuild Aetheria from the ash.','exploration_and_discovery','Legendary','Hard','REALM CHRONICLER','gold','Map','Claim 5 Storyline Campaign chapters','story_chapters_claimed',5,480,320,550,false),
  ('gl-expl-02','Restorer of Aetheria','Completed the full seven-chapter Campaign of the Fallen Kingdom first in the world.','exploration_and_discovery','Celestial','Pinnacle','REALM RESTORER','prismatic','Crown','Complete all 7 Storyline Campaign chapters','story_chapters_claimed',7,1250,900,1800,false),
  ('gl-expl-03','Collector of Relics','Gathered eight distinct armaments into a gleaming personal vault.','exploration_and_discovery','Mythic','Hard','RELIC COLLECTOR','arcane','Hammer','Unlock 8 weapons or gear pieces in your Armory','unlocked_weapons_count',8,520,450,700,false),
  ('gl-expl-04','Grand Arsenal Curator','Fifteen legendary arms resting at command—an army forged from real-world deeds.','exploration_and_discovery','Ascendant','Extreme','ARSENAL CURATOR','gold','Swords','Unlock 15 weapons or gear pieces in your Armory','unlocked_weapons_count',15,950,800,1300,false),
  ('gl-expl-05','Master of the Anvil','Tempered a chosen weapon to Level 10 through relentless Forge XP dedication.','exploration_and_discovery','Mythic','Extreme','ANVIL MASTER','crimson','Hammer','Upgrade any weapon in the Armory to Level 10','max_weapon_level',10,650,500,850,false),
  ('gl-expl-06','Archivist of Heroic Feats','Claimed twenty standard achievements across all pillars of LifeQuest.','exploration_and_discovery','Ascendant','Extreme','ARCHIVIST','celestial','Award','Unlock 20 normal realm achievements','normal_achievements_unlocked',20,800,600,1000,false),

  ('gl-soc-01','Herald of Fellowship','Built a circle of trusted companions across Aetheria through genuine kindness.','social_legends','Legendary','Hard','HERALD OF BONDS','emerald','Users','Have 5 accepted friends in Aetheria','friends_count',5,360,240,450,false),
  ('gl-soc-02','Ambassador of Kindness','Completed ten Social AI quests connecting with family, friends, and guildmates.','social_legends','Mythic','Hard','REALM AMBASSADOR','emerald','HeartHandshake','Complete 10 Social category AI quests','dynamic_social_claimed',10,520,360,680,false),
  ('gl-soc-03','Founder of the Citadel Guild','Raised a guild banner and stepped forward as commander of a living fellowship.','social_legends','Mythic','Extreme','GUILD SOVEREIGN','gold','Shield','Hold Guild Leader rank in an active guild','guild_leader',1,550,400,750,false),
  ('gl-soc-04','Tavern Bard of Aetheria','Shared twenty-five encouraging dispatches across the Tavern and Guild halls.','social_legends','Legendary','Hard','TAVERN BARD','arcane','MessageSquare','Send 25 messages in Realm or Guild Chat','chat_messages_sent',25,340,240,400,false),
  ('gl-soc-05','Paragon of Unity','Completed twenty-five Social AI quests, uplifting real communities beyond the screen.','social_legends','Celestial','Pinnacle','PARAGON OF UNITY','celestial','Sparkles','Complete 25 Social category AI quests','dynamic_social_claimed',25,950,650,1300,false),
  ('gl-soc-06','Bannerlord of Fifteen Allies','Stood shoulder to shoulder with fifteen accepted friends on the path of progression.','social_legends','Ascendant','Extreme','BANNERLORD','gold','Users','Have 15 accepted friends in Aetheria','friends_count',15,780,520,1050,false),

  ('gl-ult-01','Dragonslayer of the Five Kingdoms','Vanquished bosses ten times over, turning dread into sovereign triumph.','ultimate_challenges','Mythic','Extreme','DREADSLAYER','crimson','Swords','Defeat Kingdom Bosses 10 times','total_bosses_defeated',10,750,580,950,false),
  ('gl-ult-02','Conqueror of All Five Realms','Cleansed every single Kingdom from Shadow Forest to Void Citadel.','ultimate_challenges','Celestial','Pinnacle','FIVE REALMS CONQUEROR','crimson','Crown','Clear all 5 Boss Kingdoms in Aetheria','all_kingdoms_cleared',1,1400,1000,2000,false),
  ('gl-ult-03','Ascendant Level Fifteen','First hero to shatter Level 15 through balanced habit, mind, and combat mastery.','ultimate_challenges','Ascendant','Extreme','GRAND CHAMPION','gold','Star','Reach Player Level 15','level',15,900,700,1200,false),
  ('gl-ult-04','Eternal Level Twenty-Five','A mythic plateau of real-world transformation achieved by only one in the world.','ultimate_challenges','Eternal','Pinnacle','ETERNAL LEGEND','prismatic','Crown','Reach Player Level 25','level',25,2500,1800,3500,false),
  ('gl-ult-05','Gilded Treasurer of the Crown','Held five thousand Gold Sovereigns earned cleanly through quests and victory.','ultimate_challenges','Ascendant','Extreme','GILDED SOVEREIGN','gold','Coins','Hold 5,000 Gold in your treasury','gold_balance',5000,650,500,1000,false),
  ('gl-ult-06','Emberheart Forge Master','Accumulated 2,000 Forge XP—enough cosmic fire to reforge celestial steel.','ultimate_challenges','Mythic','Extreme','EMBERHEART','crimson','Flame','Hold 2,000 Forge XP ready for the anvil','forge_xp_balance',2000,600,500,800,false),
  ('gl-ult-07','Celestial Starbearer','Reached 5,000 Aether Points, shining like a second sun above the Fallen Citadel.','ultimate_challenges','Eternal','Pinnacle','STARBEARER','prismatic','Sparkles','Accumulate 5,000 Aether Points','aether_points',5000,2200,1500,3200,false),

  ('gl-hid-01','Echo of the Fallen Crown','A hidden vow fulfilled: stood in the ruins, walked all seven paths of honor, and returned home.','special_hidden_achievements','Mythic','Secret','CROWN RECLAIMED','gold','Crown','Complete and claim the 7-part Reclaim Your Honor trial','honor_reclaimed',1,450,350,550,true),
  ('gl-hid-02','Voice Across the Veil','Forged a fellowship bond inside a Guild and spoke with allies in the tavern.','special_hidden_achievements','Legendary','Secret','VOICE OF FELLOWSHIP','arcane','Compass','Join an active Guild and connect with the realm','guild_joined',1,320,220,400,true),
  ('gl-hid-03','Mirror of True Growth','Turned inward through twenty Personal Growth quests that transformed daily confidence.','special_hidden_achievements','Celestial','Secret','SOULFORGED','emerald','Sparkles','Complete 20 Personal Growth AI quests','dynamic_personal_growth_claimed',20,950,700,1300,true),
  ('gl-hid-04','Thirtyfold Aether Blade','Defeated Kingdom Bosses 25 times in silent mastery of elemental weakness and timing.','special_hidden_achievements','Eternal','Secret','VOIDBREAKER','crimson','Swords','Defeat Kingdom Bosses 25 times','total_bosses_defeated',25,1500,1100,2200,true),
  ('gl-hid-05','Whisper of the Hundredth Deed','Completed 75 combined quests—leaving legends etched into every corner of the notice board.','special_hidden_achievements','Celestial','Secret','MYTHWALKER','arcane','ScrollText','Claim 75 quests across classic and dynamic quest boards','quests_claimed_total',75,1450,1000,2000,true),
  ('gl-hid-06','The Phoenix Sovereign','From zero to fifty thousand Player XP—the ultimate phoenix of real-world progression.','special_hidden_achievements','Eternal','Secret','PHOENIX SOVEREIGN','prismatic','Flame','Amass 50,000 total Player XP across the realm','total_xp',50000,3000,2000,5000,true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  story = EXCLUDED.story,
  category = EXCLUDED.category,
  rarity = EXCLUDED.rarity,
  difficulty = EXCLUDED.difficulty,
  title_tag = EXCLUDED.title_tag,
  title_style = EXCLUDED.title_style,
  emblem_icon = EXCLUDED.emblem_icon,
  requirement_summary = EXCLUDED.requirement_summary,
  requirement_type = EXCLUDED.requirement_type,
  threshold = EXCLUDED.threshold,
  reward_player_xp = EXCLUDED.reward_player_xp,
  reward_forge_xp = EXCLUDED.reward_forge_xp,
  reward_gold = EXCLUDED.reward_gold,
  is_hidden = EXCLUDED.is_hidden;

-- ------------------------------------------------------------------------------
-- 5. DYNAMIC QUEST RPCs (ANTI-EXPLOIT & DAILY IMMUTABLE QUOTES)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_save_generated_daily_quests(
  p_period_key TEXT,
  p_quests JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_existing_count INTEGER := 0;
  v_q JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_period_key IS NULL OR trim(p_period_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid period key.');
  END IF;

  SELECT count(*)::INTEGER INTO v_existing_count
  FROM public.player_dynamic_quests
  WHERE user_id = v_uid AND period_key = p_period_key;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'alreadyGenerated', true,
      'quests', (
        SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.is_special_challenge ASC, q.created_at ASC), '[]'::jsonb)
        FROM public.player_dynamic_quests q
        WHERE q.user_id = v_uid AND q.period_key = p_period_key
      )
    );
  END IF;

  FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(p_quests, '[]'::jsonb)) LOOP
    INSERT INTO public.player_dynamic_quests (
      id, user_id, period_key, title, description, category, difficulty,
      objective_label, evidence_type, progress, max_progress, unit_label,
      estimated_minutes, player_xp_reward, forge_xp_reward, gold_reward,
      is_special_challenge, personalization_reason, adaptive_tier
    ) VALUES (
      COALESCE(v_q->>'id', gen_random_uuid()::text),
      v_uid,
      p_period_key,
      LEFT(COALESCE(v_q->>'title', 'Daily Trial'), 140),
      LEFT(COALESCE(v_q->>'description', ''), 500),
      CASE WHEN v_q->>'category' IN ('physical','intellectual','discipline','personal_growth','social') THEN v_q->>'category' ELSE 'discipline' END,
      CASE WHEN v_q->>'difficulty' IN ('easy','medium','challenging','special') THEN v_q->>'difficulty' ELSE 'medium' END,
      LEFT(COALESCE(v_q->>'objectiveLabel', 'Complete objective'), 200),
      COALESCE(v_q->>'evidenceType', 'personal_reflection'),
      0,
      GREATEST(1, LEAST(500, COALESCE((v_q->>'maxProgress')::INTEGER, 1))),
      LEFT(COALESCE(v_q->>'unitLabel', 'step'), 40),
      GREATEST(5, LEAST(180, COALESCE((v_q->>'estimatedMinutes')::INTEGER, 15))),
      GREATEST(10, LEAST(250, COALESCE((v_q->>'playerXpReward')::INTEGER, 45))),
      GREATEST(10, LEAST(200, COALESCE((v_q->>'forgeXpReward')::INTEGER, 30))),
      GREATEST(10, LEAST(200, COALESCE((v_q->>'goldReward')::INTEGER, 30))),
      COALESCE((v_q->>'isSpecialChallenge')::BOOLEAN, false),
      LEFT(COALESCE(v_q->>'personalizationReason', ''), 300),
      COALESCE(v_q->>'adaptiveTier', 'balanced')
    )
    ON CONFLICT (user_id, period_key, id) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'alreadyGenerated', false,
    'quests', (
      SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.is_special_challenge ASC, q.created_at ASC), '[]'::jsonb)
      FROM public.player_dynamic_quests q
      WHERE q.user_id = v_uid AND q.period_key = p_period_key
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_dynamic_quest_progress(
  p_period_key TEXT,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_u JSONB;
  v_row public.player_dynamic_quests%ROWTYPE;
  v_next_prog INTEGER;
  v_now_done BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  FOR v_u IN SELECT * FROM jsonb_array_elements(COALESCE(p_updates, '[]'::jsonb)) LOOP
    SELECT * INTO v_row
    FROM public.player_dynamic_quests
    WHERE user_id = v_uid AND period_key = p_period_key AND id = (v_u->>'id')
    FOR UPDATE;

    IF FOUND AND NOT v_row.claimed THEN
      v_next_prog := LEAST(v_row.max_progress, GREATEST(v_row.progress, COALESCE((v_u->>'progress')::INTEGER, v_row.progress)));
      v_now_done := v_next_prog >= v_row.max_progress;

      UPDATE public.player_dynamic_quests
      SET
        progress = v_next_prog,
        completed = v_row.completed OR v_now_done,
        evidence_note = COALESCE(NULLIF(trim(v_u->>'evidenceNote'), ''), evidence_note),
        completed_at = CASE WHEN completed_at IS NULL AND (v_row.completed OR v_now_done) THEN now() ELSE completed_at END
      WHERE user_id = v_uid AND period_key = p_period_key AND id = v_row.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_claim_dynamic_quest(
  p_quest_id TEXT,
  p_period_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q public.player_dynamic_quests%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_q
  FROM public.player_dynamic_quests
  WHERE user_id = v_uid AND period_key = p_period_key AND id = p_quest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dynamic quest not found.');
  END IF;
  IF v_q.claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed for this quest.');
  END IF;
  IF NOT v_q.completed OR v_q.progress < v_q.max_progress THEN
    RETURN jsonb_build_object('success', false, 'error', 'Complete the quest objective before claiming.');
  END IF;

  UPDATE public.player_dynamic_quests
  SET claimed = true, claimed_at = now()
  WHERE user_id = v_uid AND period_key = p_period_key AND id = p_quest_id;

  v_prof := public._credit_currencies(
    v_uid,
    v_q.player_xp_reward,
    v_q.forge_xp_reward,
    v_q.gold_reward,
    0,
    'dynamic_quest',
    p_quest_id,
    'AI Quest Claimed: ' || v_q.title,
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'profile', to_jsonb(v_prof),
    'quest', to_jsonb(v_q)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_save_daily_report(
  p_report_date TEXT,
  p_report_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.player_daily_reports (user_id, report_date, report_data, updated_at)
  VALUES (v_uid, p_report_date, p_report_data, now())
  ON CONFLICT (user_id, report_date) DO UPDATE SET
    report_data = EXCLUDED.report_data,
    updated_at = now();
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. SERVER-SIDE GLOBAL ACHIEVEMENT VERIFICATION & ATOMIC ONE-OWNER LOCKING
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._compute_user_legend_metrics(p_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_habits_claimed INTEGER := 0;
  v_meals_total INTEGER := 0;
  v_water_cur INTEGER := 0;
  v_quests_claimed INTEGER := 0;
  v_dyn_claimed INTEGER := 0;
  v_dyn_phys INTEGER := 0;
  v_dyn_intel INTEGER := 0;
  v_dyn_disc INTEGER := 0;
  v_dyn_pg INTEGER := 0;
  v_dyn_soc INTEGER := 0;
  v_norm_ach INTEGER := 0;
  v_weapons_count INTEGER := 0;
  v_max_weapon_lvl INTEGER := 1;
  v_friends_count INTEGER := 0;
  v_guild_joined INTEGER := 0;
  v_guild_leader INTEGER := 0;
  v_chat_sent INTEGER := 0;
  v_story_claimed INTEGER := 0;
  v_all_kingdoms INTEGER := 0;
  v_honor_claimed INTEGER := 0;
  v_reports_count INTEGER := 0;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_habits_claimed FROM public.habit_logs WHERE user_id = p_uid;
  SELECT COALESCE(count(*), 0)::INTEGER INTO v_meals_total FROM public.nutrition_logs WHERE user_id = p_uid;
  SELECT COALESCE(glasses_count, 0)::INTEGER INTO v_water_cur
  FROM public.hydration_logs WHERE user_id = p_uid ORDER BY log_date DESC LIMIT 1;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_quests_claimed
  FROM public.player_quest_progress WHERE user_id = p_uid AND claimed = true;

  SELECT
    COALESCE(count(*) FILTER (WHERE claimed = true), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'physical'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'intellectual'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'discipline'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'personal_growth'), 0)::INTEGER,
    COALESCE(count(*) FILTER (WHERE claimed = true AND category = 'social'), 0)::INTEGER
  INTO v_dyn_claimed, v_dyn_phys, v_dyn_intel, v_dyn_disc, v_dyn_pg, v_dyn_soc
  FROM public.player_dynamic_quests WHERE user_id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_norm_ach
  FROM public.player_achievements WHERE user_id = p_uid AND unlocked = true;

  SELECT
    COALESCE(count(*) FILTER (WHERE unlocked = true), 0)::INTEGER,
    COALESCE(max(level), 1)::INTEGER
  INTO v_weapons_count, v_max_weapon_lvl
  FROM public.player_weapons WHERE user_id = p_uid;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_friends_count
  FROM public.friendships WHERE status = 'accepted' AND (requester_id = p_uid OR addressee_id = p_uid);

  SELECT
    CASE WHEN EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = p_uid) THEN 1 ELSE 0 END,
    CASE WHEN EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = p_uid AND role = 'leader') THEN 1 ELSE 0 END
  INTO v_guild_joined, v_guild_leader;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_chat_sent FROM public.chat_messages WHERE sender_id = p_uid;

  SELECT CASE WHEN COALESCE(count(*) FILTER (WHERE cleared = true), 0) >= 5 THEN 1 ELSE 0 END
  INTO v_all_kingdoms
  FROM public.boss_encounters WHERE user_id = p_uid;

  v_story_claimed := COALESCE(jsonb_array_length(v_prof.client_preferences->'campaignProgress'->'claimedChapterIds'), 0);
  v_honor_claimed := CASE WHEN COALESCE((v_prof.client_preferences->'reclaimHonor'->>'claimed')::BOOLEAN, false) THEN 1 ELSE 0 END;

  SELECT COALESCE(count(*), 0)::INTEGER INTO v_reports_count FROM public.player_daily_reports WHERE user_id = p_uid;

  RETURN jsonb_build_object(
    'level', COALESCE(v_prof.level, 1),
    'total_xp', COALESCE(v_prof.total_xp, 0),
    'current_streak', COALESCE(v_prof.current_streak, 0),
    'total_workouts', COALESCE(v_prof.total_workouts_completed, 0),
    'total_verified_reps', COALESCE(v_prof.total_verified_reps, 0),
    'total_bosses_defeated', COALESCE(v_prof.total_bosses_defeated, 0),
    'aether_points', COALESCE(v_prof.aether_points, 0),
    'habits_claimed_total', v_habits_claimed,
    'meals_logged_total', v_meals_total,
    'water_glasses_current', v_water_cur,
    'quests_claimed_total', v_quests_claimed + v_dyn_claimed,
    'dynamic_quests_claimed_total', v_dyn_claimed,
    'dynamic_physical_claimed', v_dyn_phys,
    'dynamic_intellectual_claimed', v_dyn_intel,
    'dynamic_discipline_claimed', v_dyn_disc,
    'dynamic_personal_growth_claimed', v_dyn_pg,
    'dynamic_social_claimed', v_dyn_soc,
    'normal_achievements_unlocked', v_norm_ach,
    'unlocked_weapons_count', v_weapons_count,
    'max_weapon_level', v_max_weapon_lvl,
    'friends_count', v_friends_count,
    'guild_joined', v_guild_joined,
    'guild_leader', v_guild_leader,
    'chat_messages_sent', v_chat_sent,
    'story_chapters_claimed', v_story_claimed,
    'all_kingdoms_cleared', v_all_kingdoms,
    'honor_reclaimed', v_honor_claimed,
    'daily_reports_generated', v_reports_count,
    'gold_balance', COALESCE(v_prof.gold_balance, 0),
    'forge_xp_balance', COALESCE(v_prof.forge_xp, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._compute_user_legend_metrics(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_hall_of_legends()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_metrics JSONB;
  v_claims JSONB;
  v_announcements JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  v_metrics := public._compute_user_legend_metrics(v_uid);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'achievementId', c.achievement_id,
    'ownerId', c.owner_id,
    'ownerUsername', c.owner_username,
    'claimedAt', c.claimed_at
  )), '[]'::jsonb)
  INTO v_claims
  FROM public.global_achievement_claims c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'achievementId', a.achievement_id,
    'achievementName', a.achievement_name,
    'titleTag', a.title_tag,
    'titleStyle', a.title_style,
    'emblemIcon', a.emblem_icon,
    'rarity', a.rarity,
    'ownerId', a.owner_id,
    'ownerUsername', a.owner_username,
    'announcedAt', a.announced_at
  ) ORDER BY a.announced_at DESC), '[]'::jsonb)
  INTO v_announcements
  FROM (
    SELECT * FROM public.global_legend_announcements ORDER BY announced_at DESC LIMIT 25
  ) a;

  RETURN jsonb_build_object(
    'success', true,
    'metrics', v_metrics,
    'claims', v_claims,
    'announcements', v_announcements
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_claim_global_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_cat public.global_achievements_catalog%ROWTYPE;
  v_existing public.global_achievement_claims%ROWTYPE;
  v_metrics JSONB;
  v_progress INTEGER := 0;
  v_inserted_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Champion profile not found.');
  END IF;

  SELECT * INTO v_cat FROM public.global_achievements_catalog WHERE id = p_achievement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Global Exclusive Achievement does not exist.');
  END IF;

  -- Check if already permanently claimed by someone
  SELECT * INTO v_existing FROM public.global_achievement_claims WHERE achievement_id = p_achievement_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'alreadyClaimedGlobally', true,
      'ownerId', v_existing.owner_id,
      'ownerUsername', v_existing.owner_username,
      'claimedAt', v_existing.claimed_at,
      'error', 'This Global Exclusive Achievement has already been permanently claimed by ' || v_existing.owner_username || '.'
    );
  END IF;

  -- Authoritative server-side verification against real DB metrics
  v_metrics := public._compute_user_legend_metrics(v_uid);
  v_progress := COALESCE((v_metrics->>v_cat.requirement_type)::INTEGER, 0);

  IF v_progress < v_cat.threshold THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requirement not yet verified (' || v_progress || '/' || v_cat.threshold || ').'
    );
  END IF;

  -- Strict race-safe atomic one-owner insert
  INSERT INTO public.global_achievement_claims (achievement_id, owner_id, owner_username)
  VALUES (v_cat.id, v_uid, v_prof.username)
  ON CONFLICT (achievement_id) DO NOTHING
  RETURNING achievement_id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT * INTO v_existing FROM public.global_achievement_claims WHERE achievement_id = p_achievement_id;
    RETURN jsonb_build_object(
      'success', false,
      'alreadyClaimedGlobally', true,
      'ownerId', v_existing.owner_id,
      'ownerUsername', v_existing.owner_username,
      'claimedAt', v_existing.claimed_at,
      'error', 'Another champion (' || COALESCE(v_existing.owner_username, 'a rival') || ') claimed this Global Exclusive Title moments ago!'
    );
  END IF;

  -- Equip newly won title on player profile
  PERFORM set_config('app.trusted_rpc', 'true', true);
  UPDATE public.profiles
  SET
    equipped_legend_title = v_cat.title_tag,
    equipped_legend_style = v_cat.title_style,
    equipped_legend_emblem = v_cat.emblem_icon,
    equipped_legend_achievement_id = v_cat.id
  WHERE id = v_uid;

  -- Credit achievement bounty
  v_prof := public._credit_currencies(
    v_uid,
    v_cat.reward_player_xp,
    v_cat.reward_forge_xp,
    v_cat.reward_gold,
    0,
    'global_legend',
    v_cat.id,
    'World-First Legend Claimed: ' || v_cat.name,
    NULL
  );

  -- Record permanent community announcement
  INSERT INTO public.global_legend_announcements (
    achievement_id, achievement_name, title_tag, title_style, emblem_icon, rarity, owner_id, owner_username
  ) VALUES (
    v_cat.id, v_cat.name, v_cat.title_tag, v_cat.title_style, v_cat.emblem_icon, v_cat.rarity, v_uid, v_prof.username
  );

  RETURN jsonb_build_object(
    'success', true,
    'profile', to_jsonb(v_prof),
    'ownership', jsonb_build_object(
      'achievementId', v_cat.id,
      'ownerId', v_uid,
      'ownerUsername', v_prof.username,
      'claimedAt', now()
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_set_equipped_legend_title(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cat public.global_achievements_catalog%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  IF p_achievement_id IS NULL OR trim(p_achievement_id) = '' THEN
    UPDATE public.profiles
    SET
      equipped_legend_title = NULL,
      equipped_legend_style = NULL,
      equipped_legend_emblem = NULL,
      equipped_legend_achievement_id = NULL
    WHERE id = v_uid;
    RETURN jsonb_build_object('success', true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.global_achievement_claims
    WHERE achievement_id = p_achievement_id AND owner_id = v_uid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this Global Exclusive Title.');
  END IF;

  SELECT * INTO v_cat FROM public.global_achievements_catalog WHERE id = p_achievement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title catalog entry not found.');
  END IF;

  UPDATE public.profiles
  SET
    equipped_legend_title = v_cat.title_tag,
    equipped_legend_style = v_cat.title_style,
    equipped_legend_emblem = v_cat.emblem_icon,
    equipped_legend_achievement_id = v_cat.id
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'titleTag', v_cat.title_tag,
    'titleStyle', v_cat.title_style,
    'emblemIcon', v_cat.emblem_icon,
    'achievementId', v_cat.id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. SOCIAL RPC EXTENSIONS SO LEGEND TITLES APPEAR EVERYWHERE
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_get_leaderboard(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.rpc_get_leaderboard(
  p_scope TEXT DEFAULT 'global',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  streak INTEGER,
  score BIGINT,
  is_current_user BOOLEAN,
  legend_title TEXT,
  legend_style TEXT,
  legend_emblem TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_scope TEXT := lower(COALESCE(p_scope, 'global'));
  v_my_guild_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT guild_id INTO v_my_guild_id FROM public.guild_members WHERE guild_members.user_id = v_uid LIMIT 1;

  RETURN QUERY
  WITH friend_ids AS (
    SELECT v_uid AS fid
    UNION
    SELECT CASE WHEN f.requester_id = v_uid THEN f.addressee_id ELSE f.requester_id END AS fid
    FROM public.friendships f
    WHERE f.status = 'accepted' AND (f.requester_id = v_uid OR f.addressee_id = v_uid)
  ),
  window_xp AS (
    SELECT
      et.user_id,
      COALESCE(SUM(et.delta), 0)::BIGINT AS earned_xp
    FROM public.economy_transactions et
    WHERE et.currency = 'PLAYER_XP'
      AND et.delta > 0
      AND (
        (v_scope = 'weekly' AND et.created_at >= date_trunc('week', now() AT TIME ZONE 'UTC'))
        OR (v_scope = 'monthly' AND et.created_at >= date_trunc('month', now() AT TIME ZONE 'UTC'))
      )
    GROUP BY et.user_id
  ),
  filtered AS (
    SELECT
      p.id,
      p.username,
      CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END AS safe_avatar,
      p.character_class,
      p.level,
      p.aether_rank,
      p.current_streak,
      p.equipped_legend_title,
      p.equipped_legend_style,
      p.equipped_legend_emblem,
      CASE
        WHEN v_scope IN ('weekly', 'monthly') THEN COALESCE(wx.earned_xp, 0)
        ELSE (p.total_xp + p.current_streak * 25)::BIGINT
      END AS computed_score
    FROM public.profiles p
    LEFT JOIN window_xp wx ON wx.user_id = p.id
    WHERE (p.leaderboard_visible = true OR p.id = v_uid)
      AND (COALESCE(p.profile_visibility, 'public') <> 'private' OR p.id = v_uid)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
      )
      AND (
        v_scope IN ('global', 'weekly', 'monthly')
        OR (v_scope = 'friends' AND EXISTS (SELECT 1 FROM friend_ids fi WHERE fi.fid = p.id))
        OR (v_scope = 'guild' AND v_my_guild_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = v_my_guild_id AND gm.user_id = p.id
        ))
      )
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY f.computed_score DESC, f.level DESC, f.current_streak DESC, f.username ASC) AS rank,
    f.id AS user_id,
    f.username,
    f.safe_avatar AS avatar_url,
    f.character_class,
    f.level,
    f.aether_rank,
    f.current_streak AS streak,
    f.computed_score AS score,
    (f.id = v_uid) AS is_current_user,
    f.equipped_legend_title AS legend_title,
    f.equipped_legend_style AS legend_style,
    f.equipped_legend_emblem AS legend_emblem
  FROM filtered f
  ORDER BY rank ASC
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_limit, 50)))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_search_champions(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.rpc_search_champions(
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 40,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  current_streak INTEGER,
  bio TEXT,
  profile_visibility TEXT,
  relationship_status TEXT,
  friendship_id UUID,
  guild_id TEXT,
  guild_name TEXT,
  guild_tag TEXT,
  achievement_count BIGINT,
  legend_title TEXT,
  legend_style TEXT,
  legend_emblem TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END AS avatar_url,
    p.character_class,
    p.level,
    p.aether_rank,
    p.current_streak,
    COALESCE(p.bio, '') AS bio,
    COALESCE(p.profile_visibility, 'public') AS profile_visibility,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
      ) THEN 'blocked'
      WHEN f.status = 'accepted' THEN 'friends'
      WHEN f.status = 'pending' AND f.requester_id = v_uid THEN 'request_sent'
      WHEN f.status = 'pending' AND f.addressee_id = v_uid THEN 'request_received'
      ELSE 'none'
    END AS relationship_status,
    f.id AS friendship_id,
    g.id AS guild_id,
    g.name AS guild_name,
    g.tag AS guild_tag,
    (
      SELECT COUNT(*) FROM public.player_achievements pa
      WHERE pa.user_id = p.id AND pa.unlocked = true
    ) AS achievement_count,
    p.equipped_legend_title AS legend_title,
    p.equipped_legend_style AS legend_style,
    p.equipped_legend_emblem AS legend_emblem
  FROM public.profiles p
  LEFT JOIN public.friendships f
    ON ((f.requester_id = v_uid AND f.addressee_id = p.id)
     OR (f.addressee_id = v_uid AND f.requester_id = p.id))
  LEFT JOIN public.guild_members gm ON gm.user_id = p.id
  LEFT JOIN public.guilds g ON g.id = gm.guild_id
  WHERE p.id <> v_uid
    AND COALESCE(p.profile_visibility, 'public') <> 'private'
    AND (p.leaderboard_visible = true OR f.status = 'accepted')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p.id)
         OR (ub.blocker_id = p.id AND ub.blocked_id = v_uid)
    )
    AND (
      v_q = '%%'
      OR lower(p.username) LIKE v_q
      OR lower(COALESCE(p.character_name, '')) LIKE v_q
      OR lower(p.character_class) LIKE v_q
    )
  ORDER BY
    CASE WHEN f.status = 'accepted' THEN 0 WHEN f.status = 'pending' THEN 1 ELSE 2 END ASC,
    p.level DESC,
    p.total_xp DESC,
    p.username ASC
  LIMIT LEAST(60, GREATEST(1, COALESCE(p_limit, 40)))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_get_champion_profiles(UUID[]);
CREATE OR REPLACE FUNCTION public.rpc_get_champion_profiles(p_user_ids UUID[])
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  character_class TEXT,
  level INTEGER,
  aether_rank TEXT,
  current_streak INTEGER,
  legend_title TEXT,
  legend_style TEXT,
  legend_emblem TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    CASE WHEN COALESCE(p.avatar_url, '') LIKE 'http%' THEN NULL ELSE p.avatar_url END AS avatar_url,
    p.character_class,
    p.level,
    p.aether_rank,
    p.current_streak,
    p.equipped_legend_title AS legend_title,
    p.equipped_legend_style AS legend_style,
    p.equipped_legend_emblem AS legend_emblem
  FROM public.profiles p
  WHERE p.id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    AND (
      p.id = v_uid
      OR p.leaderboard_visible = true
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.requester_id = v_uid AND f.addressee_id = p.id)
           OR (f.addressee_id = v_uid AND f.requester_id = p.id)
      )
      OR EXISTS (
        SELECT 1 FROM public.guild_members gm1
        JOIN public.guild_members gm2 ON gm1.guild_id = gm2.guild_id
        WHERE gm1.user_id = v_uid AND gm2.user_id = p.id
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_public_player_profile(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_target public.profiles%ROWTYPE;
  v_f public.friendships%ROWTYPE;
  v_rel TEXT := 'none';
  v_is_blocked BOOLEAN := false;
  v_blocked_by_me BOOLEAN := false;
  v_is_self BOOLEAN := false;
  v_is_friend BOOLEAN := false;
  v_equipped JSONB;
  v_guild JSONB;
  v_achievements JSONB;
  v_legend_titles JSONB;
  v_weapons_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target player ID required');
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Champion not found');
  END IF;

  v_is_self := (v_uid = p_target_user_id);

  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p_target_user_id)
       OR (ub.blocker_id = p_target_user_id AND ub.blocked_id = v_uid)
  ) INTO v_is_blocked;

  IF v_is_blocked AND NOT v_is_self THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_blocks WHERE blocker_id = v_uid AND blocked_id = p_target_user_id
    ) INTO v_blocked_by_me;
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'blockedByMe', v_blocked_by_me,
      'error', 'This profile is unavailable due to a block setting.'
    );
  END IF;

  SELECT * INTO v_f
  FROM public.friendships f
  WHERE (f.requester_id = v_uid AND f.addressee_id = p_target_user_id)
     OR (f.addressee_id = v_uid AND f.requester_id = p_target_user_id)
  LIMIT 1;

  IF FOUND THEN
    IF v_f.status = 'accepted' THEN
      v_rel := 'friends';
      v_is_friend := true;
    ELSIF v_f.status = 'pending' AND v_f.requester_id = v_uid THEN
      v_rel := 'request_sent';
    ELSIF v_f.status = 'pending' AND v_f.addressee_id = v_uid THEN
      v_rel := 'request_received';
    END IF;
  END IF;

  IF NOT v_is_self THEN
    IF COALESCE(v_target.profile_visibility, 'public') = 'private' THEN
      RETURN jsonb_build_object(
        'success', true,
        'accessible', false,
        'restrictedReason', 'private',
        'player', jsonb_build_object(
          'id', v_target.id,
          'username', v_target.username,
          'characterClass', v_target.character_class,
          'legendTitle', v_target.equipped_legend_title,
          'legendTitleStyle', v_target.equipped_legend_style,
          'legendEmblem', v_target.equipped_legend_emblem,
          'relationshipStatus', v_rel,
          'friendshipId', v_f.id
        )
      );
    END IF;

    IF COALESCE(v_target.profile_visibility, 'public') = 'friends_only' AND NOT v_is_friend THEN
      RETURN jsonb_build_object(
        'success', true,
        'accessible', false,
        'restrictedReason', 'friends_only',
        'player', jsonb_build_object(
          'id', v_target.id,
          'username', v_target.username,
          'characterClass', v_target.character_class,
          'level', v_target.level,
          'aetherRank', v_target.aether_rank,
          'legendTitle', v_target.equipped_legend_title,
          'legendTitleStyle', v_target.equipped_legend_style,
          'legendEmblem', v_target.equipped_legend_emblem,
          'bio', COALESCE(v_target.bio, ''),
          'relationshipStatus', v_rel,
          'friendshipId', v_f.id
        )
      );
    END IF;
  END IF;

  IF v_is_self OR COALESCE(v_target.show_equipment, true) THEN
    SELECT jsonb_build_object(
      'weaponId', pw.weapon_id,
      'name', pw.name,
      'category', pw.category,
      'rarity', pw.rarity,
      'level', pw.level,
      'evolutionStage', pw.evolution_stage,
      'masteryLevel', pw.mastery_level,
      'element', COALESCE(pw.element, 'Physical')
    )
    INTO v_equipped
    FROM public.player_weapons pw
    WHERE pw.user_id = p_target_user_id AND pw.equipped = true
    ORDER BY pw.updated_at DESC
    LIMIT 1;

    SELECT count(*)::INTEGER INTO v_weapons_count
    FROM public.player_weapons pw
    WHERE pw.user_id = p_target_user_id AND pw.unlocked = true;
  END IF;

  IF v_is_self OR COALESCE(v_target.show_guild, true) THEN
    SELECT jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'tag', g.tag,
      'level', g.level,
      'role', gm.role
    )
    INTO v_guild
    FROM public.guild_members gm
    JOIN public.guilds g ON g.id = gm.guild_id
    WHERE gm.user_id = p_target_user_id
    LIMIT 1;
  END IF;

  IF v_is_self OR COALESCE(v_target.show_achievements, true) THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ac.id,
      'name', ac.name,
      'description', ac.description,
      'category', ac.category,
      'icon', ac.icon,
      'unlocked', pa.unlocked
    ) ORDER BY ac.id), '[]'::jsonb)
    INTO v_achievements
    FROM public.player_achievements pa
    JOIN public.achievements_catalog ac ON ac.id = pa.achievement_id
    WHERE pa.user_id = p_target_user_id AND pa.unlocked = true;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'achievementId', gac.id,
    'name', gac.name,
    'titleTag', gac.title_tag,
    'titleStyle', gac.title_style,
    'emblemIcon', gac.emblem_icon,
    'rarity', gac.rarity,
    'claimedAt', gc.claimed_at
  ) ORDER BY gc.claimed_at DESC), '[]'::jsonb)
  INTO v_legend_titles
  FROM public.global_achievement_claims gc
  JOIN public.global_achievements_catalog gac ON gac.id = gc.achievement_id
  WHERE gc.owner_id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'accessible', true,
    'player', jsonb_build_object(
      'id', v_target.id,
      'username', v_target.username,
      'characterName', COALESCE(v_target.character_name, v_target.username),
      'characterClass', v_target.character_class,
      'level', v_target.level,
      'totalXp', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_xp ELSE NULL END,
      'aetherRank', v_target.aether_rank,
      'aetherPoints', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.aether_points ELSE NULL END,
      'currentStreak', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.current_streak ELSE NULL END,
      'totalWorkoutsCompleted', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_workouts_completed ELSE NULL END,
      'totalVerifiedReps', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_verified_reps ELSE NULL END,
      'totalBossesDefeated', CASE WHEN v_is_self OR COALESCE(v_target.show_stats, true) THEN v_target.total_bosses_defeated ELSE NULL END,
      'legendTitle', v_target.equipped_legend_title,
      'legendTitleStyle', v_target.equipped_legend_style,
      'legendEmblem', v_target.equipped_legend_emblem,
      'legendAchievementId', v_target.equipped_legend_achievement_id,
      'legendTitles', COALESCE(v_legend_titles, '[]'::jsonb),
      'bio', COALESCE(v_target.bio, ''),
      'profileVisibility', COALESCE(v_target.profile_visibility, 'public'),
      'showAchievements', COALESCE(v_target.show_achievements, true),
      'showEquipment', COALESCE(v_target.show_equipment, true),
      'showStats', COALESCE(v_target.show_stats, true),
      'showGuild', COALESCE(v_target.show_guild, true),
      'relationshipStatus', CASE WHEN v_is_self THEN 'self' ELSE v_rel END,
      'friendshipId', v_f.id,
      'equippedWeapon', v_equipped,
      'unlockedWeaponsCount', CASE WHEN v_is_self OR COALESCE(v_target.show_equipment, true) THEN v_weapons_count ELSE NULL END,
      'guild', v_guild,
      'achievements', COALESCE(v_achievements, '[]'::jsonb),
      'lastActiveAt', v_target.last_active_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_guild_details(p_guild_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_guild public.guilds%ROWTYPE;
  v_my_role TEXT;
  v_members JSONB;
  v_challenges JSONB;
  v_requests JSONB := '[]'::jsonb;
  v_invites JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild not found.');
  END IF;

  SELECT role INTO v_my_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'userId', p.id,
    'username', p.username,
    'characterClass', p.character_class,
    'level', p.level,
    'aetherRank', p.aether_rank,
    'legendTitle', p.equipped_legend_title,
    'legendTitleStyle', p.equipped_legend_style,
    'legendEmblem', p.equipped_legend_emblem,
    'role', gm.role,
    'weeklyContribution', gm.weekly_contribution,
    'joinedAt', gm.joined_at
  ) ORDER BY
    CASE gm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END ASC,
    gm.weekly_contribution DESC,
    gm.joined_at ASC
  ), '[]'::jsonb)
  INTO v_members
  FROM public.guild_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.guild_id = p_guild_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', gc.id,
    'title', gc.title,
    'periodKey', gc.period_key,
    'targetValue', gc.target_value,
    'currentValue', gc.current_value,
    'rewardGold', gc.reward_gold,
    'rewardPlayerXp', gc.reward_player_xp,
    'completed', gc.completed
  ) ORDER BY gc.created_at DESC), '[]'::jsonb)
  INTO v_challenges
  FROM public.guild_challenges gc
  WHERE gc.guild_id = p_guild_id;

  IF v_my_role IN ('leader', 'officer') THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', gjr.id,
      'userId', p.id,
      'username', p.username,
      'characterClass', p.character_class,
      'level', p.level,
      'aetherRank', p.aether_rank,
      'message', gjr.message,
      'createdAt', gjr.created_at
    ) ORDER BY gjr.created_at ASC), '[]'::jsonb)
    INTO v_requests
    FROM public.guild_join_requests gjr
    JOIN public.profiles p ON p.id = gjr.user_id
    WHERE gjr.guild_id = p_guild_id AND gjr.status = 'pending';

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', gi.id,
      'inviteeId', p.id,
      'inviteeName', p.username,
      'inviteeClass', p.character_class,
      'inviteeLevel', p.level,
      'createdAt', gi.created_at
    ) ORDER BY gi.created_at DESC), '[]'::jsonb)
    INTO v_invites
    FROM public.guild_invites gi
    JOIN public.profiles p ON p.id = gi.invitee_id
    WHERE gi.guild_id = p_guild_id AND gi.status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'guild', jsonb_build_object(
      'id', v_guild.id,
      'name', v_guild.name,
      'tag', v_guild.tag,
      'emblem', COALESCE(v_guild.emblem, 'Shield'),
      'level', v_guild.level,
      'guildXp', v_guild.guild_xp,
      'membersCount', (SELECT count(*)::INTEGER FROM public.guild_members gm2 WHERE gm2.guild_id = v_guild.id),
      'maxMembers', v_guild.max_members,
      'description', v_guild.description,
      'weeklyQuestName', v_guild.weekly_quest_name,
      'weeklyQuestProgress', v_guild.weekly_quest_progress,
      'weeklyQuestMax', v_guild.weekly_quest_max,
      'isMember', v_my_role IS NOT NULL,
      'myRole', v_my_role,
      'ownerId', v_guild.owner_id,
      'isPublic', v_guild.is_public,
      'minLevel', v_guild.min_level
    ),
    'members', v_members,
    'challenges', v_challenges,
    'joinRequests', v_requests,
    'pendingInvites', v_invites
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_save_generated_daily_quests(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_dynamic_quest_progress(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_claim_dynamic_quest(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_save_daily_report(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_hall_of_legends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_claim_global_achievement(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_set_equipped_legend_title(TEXT) TO authenticated;

COMMIT;
