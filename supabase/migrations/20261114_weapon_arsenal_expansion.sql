-- ==============================================================================
-- LIFEQUEST ("WORLD OF AETHERIA") — ADDITIVE WEAPON ARSENAL & BEYOND-MYTHICAL MIGRATION
-- Target existing Supabase project: grlnojmvacbpcqfhzwpd
-- Preserves all 25 existing tables, all existing user data, and all working RPCs.
-- DO NOT execute automatically against live DB without reviewing backup runbook.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADDITIVE SCHEMA EXTENSIONS ON EXISTING player_weapons
-- ------------------------------------------------------------------------------

ALTER TABLE public.player_weapons
  ADD COLUMN IF NOT EXISTS crit_chance INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS crit_damage INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS speed INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS element TEXT NOT NULL DEFAULT 'Physical',
  ADD COLUMN IF NOT EXISTS ability_power INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS awakened BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS awakening_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evolution_target_id TEXT,
  ADD COLUMN IF NOT EXISTS unlock_source TEXT NOT NULL DEFAULT 'starter';

-- Ensure legacy Sword/Bow/Staff/Shield weapons keep balanced defaults and evolution targets
UPDATE public.player_weapons
SET evolution_target_id = 'w-asc-runeblade',
    crit_chance = GREATEST(crit_chance, 18),
    crit_damage = GREATEST(crit_damage, 220),
    speed = GREATEST(speed, 74),
    element = 'Light',
    ability_power = GREATEST(ability_power, 30)
WHERE weapon_id = 'w-sword-celestial' AND evolution_target_id IS NULL;

UPDATE public.player_weapons
SET evolution_target_id = 'w-cel-staff',
    crit_chance = GREATEST(crit_chance, 16),
    crit_damage = GREATEST(crit_damage, 215),
    speed = GREATEST(speed, 78),
    element = 'Arcane',
    ability_power = GREATEST(ability_power, 38)
WHERE weapon_id = 'w-staff-astral' AND evolution_target_id IS NULL;

-- ------------------------------------------------------------------------------
-- 2. AUTHORITATIVE SERVER CATALOG FOR PROGRESSION & EVOLUTION WEAPONS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weapon_catalog (
  weapon_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  base_attack INTEGER NOT NULL,
  attack_per_level INTEGER NOT NULL,
  base_defense INTEGER NOT NULL,
  defense_per_level INTEGER NOT NULL,
  crit_chance INTEGER NOT NULL DEFAULT 10,
  crit_damage INTEGER NOT NULL DEFAULT 190,
  speed INTEGER NOT NULL DEFAULT 65,
  element TEXT NOT NULL DEFAULT 'Physical',
  ability_power INTEGER NOT NULL DEFAULT 15,
  max_level INTEGER NOT NULL DEFAULT 16,
  upgrade_forge_cost INTEGER NOT NULL DEFAULT 320,
  awakened BOOLEAN NOT NULL DEFAULT false,
  awakening_level INTEGER NOT NULL DEFAULT 0,
  unlockable_via_progression BOOLEAN NOT NULL DEFAULT false,
  source_weapon_id TEXT,
  evolution_target_id TEXT,
  -- Server-validated progression & evolution gates
  req_player_level INTEGER NOT NULL DEFAULT 1,
  req_weapon_level INTEGER NOT NULL DEFAULT 1,
  req_mastery_level INTEGER NOT NULL DEFAULT 1,
  req_aether_rank TEXT NOT NULL DEFAULT 'Dormant',
  req_kingdom_cleared TEXT,
  req_bosses_defeated INTEGER NOT NULL DEFAULT 0,
  req_streak_days INTEGER NOT NULL DEFAULT 0,
  req_workouts INTEGER NOT NULL DEFAULT 0,
  req_verified_reps INTEGER NOT NULL DEFAULT 0,
  req_forge_xp INTEGER NOT NULL DEFAULT 0,
  evo_forge_xp_cost INTEGER NOT NULL DEFAULT 0,
  evo_gold_cost INTEGER NOT NULL DEFAULT 0,
  special_ability_name TEXT,
  description TEXT NOT NULL DEFAULT '',
  lore TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weapon_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Weapon catalog readable by authenticated" ON public.weapon_catalog;
CREATE POLICY "Weapon catalog readable by authenticated"
  ON public.weapon_catalog FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.weapon_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.weapon_catalog TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. INTERNAL HELPER FUNCTIONS (STRICTLY REVOKED FROM PUBLIC/anon/authenticated)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._aether_rank_tier(p_rank TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE COALESCE(p_rank, 'Dormant')
    WHEN 'Dormant' THEN 1
    WHEN 'Awakened' THEN 2
    WHEN 'Ascended' THEN 3
    WHEN 'Mythic' THEN 4
    WHEN 'Transcendent' THEN 5
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public._get_mastery_path_for_category(p_cat TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_cat IN ('Bows', 'Crossbows', 'Dual Blades', 'Spears') THEN 'Endurance'
    WHEN p_cat IN ('Magic Staffs', 'Wands', 'Daggers', 'Scythes', 'Helmets', 'Accessories') THEN 'Focus'
    WHEN p_cat IN ('Shields', 'Armour') THEN 'Recovery'
    ELSE 'Strength'
  END;
$$;

CREATE OR REPLACE FUNCTION public._default_abilities_for_category(p_cat TEXT)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE COALESCE(p_cat, 'Swords')
    WHEN 'Greatswords' THEN '[{"id":"ab-gs-1","name":"Tectonic Cleave","icon":"Swords","description":"Brings down a colossal two-handed arc dealing 165% Earth impact damage.","unlockRequirement":"Attain Greatsword Mastery Level 2 (Strength Path)","unlockMasteryLevel":2,"combatEffect":"+65% Heavy Cleave Damage (Earth Element)","unlocked":true,"damageMultiplier":1.65,"element":"Earth","staminaCost":28},{"id":"ab-gs-2","name":"Shattering Judgement","icon":"Flame","description":"Crushes guard stances with molten solar shockwaves for 245% Fire damage.","unlockRequirement":"Attain Greatsword Mastery Level 4 (Strength Path)","unlockMasteryLevel":4,"combatEffect":"+145% Armor-Shattering Strike (Fire Element)","unlocked":false,"damageMultiplier":2.45,"critBonus":12,"element":"Fire","staminaCost":38},{"id":"ab-gs-3","name":"Sovereign Skyfall","icon":"Sparkles","description":"Channels transcendent gravity to unleash a 385% Light-charged zenith strike.","unlockRequirement":"Attain Greatsword Mastery Level 7 (Strength Path)","unlockMasteryLevel":7,"combatEffect":"+285% Zenith Execution (Light Element)","unlocked":false,"damageMultiplier":3.85,"critBonus":18,"element":"Light","staminaCost":48}]'::jsonb
    WHEN 'Daggers' THEN '[{"id":"ab-dg-1","name":"Viper Fang","icon":"Zap","description":"Flash-step thrust targeting vitals with +22% critical strike chance.","unlockRequirement":"Attain Dagger Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+45% Precision Strike & +22% Crit (Wind Element)","unlocked":true,"damageMultiplier":1.45,"critBonus":22,"element":"Wind","staminaCost":16},{"id":"ab-dg-2","name":"Umbral Ambush","icon":"Eye","description":"Vanishes into shadow mist before striking for 215% Shadow critical damage.","unlockRequirement":"Attain Dagger Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+115% Shadow Ambush & +28% Crit (Shadow Element)","unlocked":false,"damageMultiplier":2.15,"critBonus":28,"element":"Shadow","staminaCost":26},{"id":"ab-dg-3","name":"Phantom Execution","icon":"Sparkles","description":"Seven invisible lightning-fast incisions dealing 310% damage with lethal precision.","unlockRequirement":"Attain Dagger Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+210% Multi-Incision & +35% Crit (Lightning Element)","unlocked":false,"damageMultiplier":3.1,"critBonus":35,"element":"Lightning","staminaCost":36}]'::jsonb
    WHEN 'Dual Blades' THEN '[{"id":"ab-db-1","name":"Whirlwind Cross","icon":"Wind","description":"Twin diagonal slashes whipping gale currents for 150% Wind damage.","unlockRequirement":"Attain Dual Blade Mastery Level 2 (Endurance Path)","unlockMasteryLevel":2,"combatEffect":"+50% Twin Tempest Flurry (Wind Element)","unlocked":true,"damageMultiplier":1.5,"critBonus":14,"element":"Wind","staminaCost":20},{"id":"ab-db-2","name":"Blazing Cyclone","icon":"Flame","description":"Spins twin blades in an ember vortex dealing 230% sustained Fire damage.","unlockRequirement":"Attain Dual Blade Mastery Level 4 (Endurance Path)","unlockMasteryLevel":4,"combatEffect":"+130% Vortex Combo & +18% Crit (Fire Element)","unlocked":false,"damageMultiplier":2.3,"critBonus":18,"element":"Fire","staminaCost":30},{"id":"ab-db-3","name":"Tempest Waltz","icon":"Zap","description":"Relentless twin-arc blitz harnessing storm speed for 340% Lightning damage.","unlockRequirement":"Attain Dual Blade Mastery Level 7 (Endurance Path)","unlockMasteryLevel":7,"combatEffect":"+240% Lightning Flurry & +24% Crit (Lightning Element)","unlocked":false,"damageMultiplier":3.4,"critBonus":24,"element":"Lightning","staminaCost":42}]'::jsonb
    WHEN 'Crossbows' THEN '[{"id":"ab-xb-1","name":"Heavy Quarrel","icon":"Crosshair","description":"Fires a tungsten siege bolt engineered to crack heavy boss carapace.","unlockRequirement":"Attain Crossbow Mastery Level 2 (Endurance Path)","unlockMasteryLevel":2,"combatEffect":"+55% Siege Bolt Impact (Physical Element)","unlocked":true,"damageMultiplier":1.55,"critBonus":10,"element":"Physical","staminaCost":22},{"id":"ab-xb-2","name":"Railbolt Surge","icon":"Zap","description":"Accelerates a magnetized bolt across the arena for 235% Lightning damage.","unlockRequirement":"Attain Crossbow Mastery Level 4 (Endurance Path)","unlockMasteryLevel":4,"combatEffect":"+135% Magnetized Pierce (Lightning Element)","unlocked":false,"damageMultiplier":2.35,"critBonus":16,"element":"Lightning","staminaCost":32},{"id":"ab-xb-3","name":"Starfall Salvo","icon":"Sparkles","description":"Launches a three-bolt glacial cluster dealing 345% piercing Frost damage.","unlockRequirement":"Attain Crossbow Mastery Level 7 (Endurance Path)","unlockMasteryLevel":7,"combatEffect":"+245% Tri-Bolt Shatter (Ice Element)","unlocked":false,"damageMultiplier":3.45,"critBonus":20,"element":"Ice","staminaCost":44}]'::jsonb
    WHEN 'Wands' THEN '[{"id":"ab-wd-1","name":"Lumen Spark","icon":"Sparkles","description":"Crisp rapid arcane bolt costing minimal stamina with glowing Light potency.","unlockRequirement":"Attain Wand Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+55% Quick Arcane Bolt (Light Element)","unlocked":true,"damageMultiplier":1.55,"critBonus":10,"element":"Light","staminaCost":18},{"id":"ab-wd-2","name":"Prismatic Weaving","icon":"Eye","description":"Detonates condensed rune glyphs in a 225% Arcane cascade.","unlockRequirement":"Attain Wand Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+125% Glyph Detonation (Arcane Element)","unlocked":false,"damageMultiplier":2.25,"critBonus":15,"element":"Arcane","staminaCost":28},{"id":"ab-wd-3","name":"Chorus of Dawn","icon":"Sparkles","description":"Channels sacred starlight symphony for 350% Cosmic radiance.","unlockRequirement":"Attain Wand Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+250% Sacred Resonance (Cosmic Element)","unlocked":false,"damageMultiplier":3.5,"critBonus":20,"element":"Cosmic","staminaCost":40}]'::jsonb
    WHEN 'Spears' THEN '[{"id":"ab-sp-1","name":"Skewer Lunge","icon":"Crosshair","description":"Extends full pike reach to impale enemy defenses for 155% piercing damage.","unlockRequirement":"Attain Spear Mastery Level 2 (Endurance Path)","unlockMasteryLevel":2,"combatEffect":"+55% Long-Reach Thrust (Physical Element)","unlocked":true,"damageMultiplier":1.55,"critBonus":12,"element":"Physical","staminaCost":22},{"id":"ab-sp-2","name":"Tidal Skewer","icon":"Droplets","description":"Spirals oceanic current down the shaft for 225% Water damage & +25% guard.","unlockRequirement":"Attain Spear Mastery Level 4 (Endurance Path)","unlockMasteryLevel":4,"combatEffect":"+125% Tidal Surge & +25% Guard (Water Element)","unlocked":false,"damageMultiplier":2.25,"defenseBoost":25,"element":"Water","staminaCost":32},{"id":"ab-sp-3","name":"Valkyrie Dive","icon":"Zap","description":"Soars skyward and plunges in a blinding storm spearfall for 355% Lightning damage.","unlockRequirement":"Attain Spear Mastery Level 7 (Endurance Path)","unlockMasteryLevel":7,"combatEffect":"+255% Aerial Storm Dive (Lightning Element)","unlocked":false,"damageMultiplier":3.55,"critBonus":20,"element":"Lightning","staminaCost":42}]'::jsonb
    WHEN 'Axes' THEN '[{"id":"ab-ax-1","name":"Crimson Chop","icon":"Flame","description":"Ferocious overhead axe chop splitting shields for 160% Fire-tempered damage.","unlockRequirement":"Attain Axe Mastery Level 2 (Strength Path)","unlockMasteryLevel":2,"combatEffect":"+60% Shield-Splitter Chop (Fire Element)","unlocked":true,"damageMultiplier":1.6,"critBonus":10,"element":"Fire","staminaCost":24},{"id":"ab-ax-2","name":"Rending Frenzy","icon":"Swords","description":"Unleashes brutal twin cleaves dealing 240% crushing Physical-Shadow impact.","unlockRequirement":"Attain Axe Mastery Level 4 (Strength Path)","unlockMasteryLevel":4,"combatEffect":"+140% Savage Twin Cleave & +18% Crit","unlocked":false,"damageMultiplier":2.4,"critBonus":18,"element":"Shadow","staminaCost":35},{"id":"ab-ax-3","name":"Worldsplitter","icon":"Hammer","description":"Summons primordial earth-cracking might for 375% Earth shockwave damage.","unlockRequirement":"Attain Axe Mastery Level 7 (Strength Path)","unlockMasteryLevel":7,"combatEffect":"+275% Tectonic Execution (Earth Element)","unlocked":false,"damageMultiplier":3.75,"critBonus":22,"element":"Earth","staminaCost":46}]'::jsonb
    WHEN 'War Hammers' THEN '[{"id":"ab-hm-1","name":"Crag Slam","icon":"Hammer","description":"Smashes the arena stone to stagger foes while bolstering guard by +30%.","unlockRequirement":"Attain War Hammer Mastery Level 2 (Strength Path)","unlockMasteryLevel":2,"combatEffect":"+55% Earth Tremor & +30% Guard (Earth Element)","unlocked":true,"damageMultiplier":1.55,"defenseBoost":30,"element":"Earth","staminaCost":25},{"id":"ab-hm-2","name":"Thunderous Anvil","icon":"Zap","description":"Calls down a roaring anvil strike infused with 235% Lightning thunder.","unlockRequirement":"Attain War Hammer Mastery Level 4 (Strength Path)","unlockMasteryLevel":4,"combatEffect":"+135% Storm Anvil Impact & +35% Guard (Lightning)","unlocked":false,"damageMultiplier":2.35,"defenseBoost":35,"element":"Lightning","staminaCost":36},{"id":"ab-hm-3","name":"Solstice Cataclysm","icon":"Sparkles","description":"Brings down hallowed golden radiance for 370% Light impact and +45% fortress ward.","unlockRequirement":"Attain War Hammer Mastery Level 7 (Strength Path)","unlockMasteryLevel":7,"combatEffect":"+270% Sacred Shockwave & +45% Ward (Light)","unlocked":false,"damageMultiplier":3.7,"defenseBoost":45,"element":"Light","staminaCost":46}]'::jsonb
    WHEN 'Scythes' THEN '[{"id":"ab-sc-1","name":"Dusk Reap","icon":"Moon","description":"Sweeping crescent arc cutting with 155% Shadow energy and +16% crit.","unlockRequirement":"Attain Scythe Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+55% Crescent Reap & +16% Crit (Shadow)","unlocked":true,"damageMultiplier":1.55,"critBonus":16,"element":"Shadow","staminaCost":22},{"id":"ab-sc-2","name":"Rime Harvest","icon":"Sparkles","description":"Freezes life force along a lunar blade arc for 235% Ice damage & +20% crit.","unlockRequirement":"Attain Scythe Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+135% Lunar Frost Arc & +20% Crit (Ice)","unlocked":false,"damageMultiplier":2.35,"critBonus":20,"element":"Ice","staminaCost":34},{"id":"ab-sc-3","name":"Astral Severance","icon":"Sparkles","description":"Slices through dimensional space for 375% Cosmic devastation & +28% crit.","unlockRequirement":"Attain Scythe Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+275% Dimensional Rend & +28% Crit (Cosmic)","unlocked":false,"damageMultiplier":3.75,"critBonus":28,"element":"Cosmic","staminaCost":45}]'::jsonb
    WHEN 'Bows' THEN '[{"id":"ab-bw-1","name":"Quick Shot","icon":"Crosshair","description":"Instant double arrow release dealing 140% rapid precision damage.","unlockRequirement":"Attain Bow Mastery Level 2 (Endurance Path)","unlockMasteryLevel":2,"combatEffect":"+40% Rapid Attack Speed","unlocked":true,"damageMultiplier":1.4,"element":"Physical","staminaCost":20},{"id":"ab-bw-2","name":"Piercing Arrow","icon":"Zap","description":"Fires a high-velocity lightning phase bolt that bypasses 50% of target defense.","unlockRequirement":"Attain Bow Mastery Level 4 (Endurance Path)","unlockMasteryLevel":4,"combatEffect":"+110% Armor Piercing Damage (Lightning Element)","unlocked":false,"damageMultiplier":2.1,"element":"Lightning","staminaCost":30},{"id":"ab-bw-3","name":"Phantom Volley","icon":"Sparkles","description":"Rains down a barrage of 6 spectral glacial arrows dealing 330% frost damage.","unlockRequirement":"Attain Bow Mastery Level 7 (Endurance Path)","unlockMasteryLevel":7,"combatEffect":"+230% Multi-arrow Lunar Barrage (Ice Element)","unlocked":false,"damageMultiplier":3.3,"element":"Ice","staminaCost":45}]'::jsonb
    WHEN 'Magic Staffs' THEN '[{"id":"ab-st-1","name":"Arcane Pulse","icon":"Sparkles","description":"Releases a concentrated radiant shockwave dealing 160% radiant light damage.","unlockRequirement":"Attain Staff Mastery Level 2 (Focus Path)","unlockMasteryLevel":2,"combatEffect":"+60% Arcane Shock Damage (Radiant Light)","unlocked":true,"damageMultiplier":1.6,"element":"Light","staminaCost":25},{"id":"ab-st-2","name":"Mana Burst","icon":"Eye","description":"Condenses stored mental energy into an explosive sphere dealing 240% fire damage.","unlockRequirement":"Attain Staff Mastery Level 4 (Focus Path)","unlockMasteryLevel":4,"combatEffect":"+140% Arcane Burst Damage (Fire Element)","unlocked":false,"damageMultiplier":2.4,"element":"Fire","staminaCost":35},{"id":"ab-st-3","name":"Aether Storm","icon":"CloudLightning","description":"Summons a swirling celestial deluge of oceanic aether dealing 360% water damage.","unlockRequirement":"Attain Staff Mastery Level 7 (Focus Path)","unlockMasteryLevel":7,"combatEffect":"+260% Celestial Tempest Damage (Water Element)","unlocked":false,"damageMultiplier":3.6,"element":"Water","staminaCost":45}]'::jsonb
    WHEN 'Shields' THEN '[{"id":"ab-sh-1","name":"Iron Guard","icon":"Shield","description":"Brace shield firmly to absorb 40% incoming damage and counter-strike.","unlockRequirement":"Attain Shield Mastery Level 2 (Recovery Path)","unlockMasteryLevel":2,"combatEffect":"+40% Damage Absorption & Stance Guard","unlocked":true,"defenseBoost":40,"element":"Physical","staminaCost":20},{"id":"ab-sh-2","name":"Reflective Ward","icon":"ShieldAlert","description":"Ignites radiant barrier absorbing 65% damage and blinding the enemy with light.","unlockRequirement":"Attain Shield Mastery Level 4 (Recovery Path)","unlockMasteryLevel":4,"combatEffect":"+65% Damage Absorption & Reflection (Light Element)","unlocked":false,"defenseBoost":65,"damageMultiplier":1.4,"element":"Light","staminaCost":30},{"id":"ab-sh-3","name":"Divine Barrier","icon":"ShieldCheck","description":"Deploys an impervious purifying water aegis absorbing the next strikes completely.","unlockRequirement":"Attain Shield Mastery Level 7 (Recovery Path)","unlockMasteryLevel":7,"combatEffect":"+100% Defense Ward & Full Absorption (Water Element)","unlocked":false,"defenseBoost":100,"element":"Water","staminaCost":45}]'::jsonb
    ELSE '[{"id":"ab-sw-1","name":"Power Strike","icon":"Zap","description":"Deliver a devastating physical blow that pierces 10% enemy armor.","unlockRequirement":"Attain Sword Mastery Level 2 (Strength Path)","unlockMasteryLevel":2,"combatEffect":"+50% Attack Damage Strike","unlocked":true,"damageMultiplier":1.5,"element":"Physical","staminaCost":25},{"id":"ab-sw-2","name":"Berserker Slash","icon":"Flame","description":"Unleash two sweeping slashes dealing 220% damage with +15% critical momentum.","unlockRequirement":"Attain Sword Mastery Level 4 (Strength Path)","unlockMasteryLevel":4,"combatEffect":"+120% Attack Damage, +15% Crit Strike (Fire Element)","unlocked":false,"damageMultiplier":2.2,"critBonus":15,"element":"Fire","staminaCost":35},{"id":"ab-sw-3","name":"Titan''s Wrath","icon":"Swords","description":"Channel celestial titan fury for 350% colossal radiant damage and stance break.","unlockRequirement":"Attain Sword Mastery Level 7 (Strength Path)","unlockMasteryLevel":7,"combatEffect":"+250% Colossal Attack Damage (Radiant Light)","unlocked":false,"damageMultiplier":3.5,"element":"Light","staminaCost":45}]'::jsonb
  END;
$$;

REVOKE ALL ON FUNCTION public._aether_rank_tier(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._get_mastery_path_for_category(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._default_abilities_for_category(TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. SEED EXPANDED STORE GEAR (Common-Mythic ONLY) & PINNACLE WEAPON CATALOG
-- ------------------------------------------------------------------------------

INSERT INTO public.shop_items (id, item_type, name, description, rarity, price_gold, price_forge_xp, required_level, metadata, is_active)
VALUES
  ('shop-gs-titan', 'weapon', 'Ironclad Greatsword', 'Two-handed citadel claymore built to cleave through armored Void sentinels.', 'Uncommon', 210, 25, 2, '{"weaponId":"w-gs-titan","category":"Greatswords","rarity":"Uncommon","baseAttack":42,"attackPerLevel":8,"baseDefense":10,"defensePerLevel":2,"critChance":6,"critDamage":185,"speed":44,"element":"Physical","abilityPower":10,"upgradeForgeCost":75,"maxLevel":10}'::jsonb, true),
  ('shop-gs-volcanic', 'weapon', 'Volcanic Executioner', 'Obsidian slab-blade veined with glowing magma channels that sear armor on contact.', 'Epic', 490, 85, 4, '{"weaponId":"w-gs-volcanic","category":"Greatswords","rarity":"Epic","baseAttack":94,"attackPerLevel":16,"baseDefense":22,"defensePerLevel":4,"critChance":10,"critDamage":195,"speed":48,"element":"Fire","abilityPower":22,"upgradeForgeCost":180,"maxLevel":14,"evolutionTargetId":"w-asc-runeblade"}'::jsonb, true),
  ('shop-dag-shadow', 'weapon', 'Nightfang Kris', 'Wavy obsidian-edged stiletto engineered for blindingly fast critical strikes.', 'Uncommon', 185, 15, 1, '{"weaponId":"w-dag-shadow","category":"Daggers","rarity":"Uncommon","baseAttack":34,"attackPerLevel":6,"baseDefense":4,"defensePerLevel":1,"critChance":18,"critDamage":205,"speed":88,"element":"Shadow","abilityPower":12,"upgradeForgeCost":65,"maxLevel":10}'::jsonb, true),
  ('shop-dag-phantom', 'weapon', 'Phantom Viper Fang', 'Twin-serrated gale stiletto that leaves spectral wind trails on every lunge.', 'Rare', 330, 50, 3, '{"weaponId":"w-dag-phantom","category":"Daggers","rarity":"Rare","baseAttack":58,"attackPerLevel":10,"baseDefense":8,"defensePerLevel":2,"critChance":24,"critDamage":220,"speed":94,"element":"Wind","abilityPower":18,"upgradeForgeCost":115,"maxLevel":12}'::jsonb, true),
  ('shop-dual-tempest', 'weapon', 'Tempest Twinblades', 'Matched curved sabers synchronized for sweeping cyclone combinations.', 'Rare', 360, 60, 3, '{"weaponId":"w-dual-tempest","category":"Dual Blades","rarity":"Rare","baseAttack":64,"attackPerLevel":11,"baseDefense":12,"defensePerLevel":2,"critChance":16,"critDamage":200,"speed":90,"element":"Wind","abilityPower":16,"upgradeForgeCost":125,"maxLevel":12}'::jsonb, true),
  ('shop-dual-crimson', 'weapon', 'Crimson Lotus Twins', 'Petal-etched scarlet scimitars spinning rings of controlled flame.', 'Epic', 510, 95, 4, '{"weaponId":"w-dual-crimson","category":"Dual Blades","rarity":"Epic","baseAttack":88,"attackPerLevel":15,"baseDefense":16,"defensePerLevel":3,"critChance":21,"critDamage":215,"speed":92,"element":"Fire","abilityPower":24,"upgradeForgeCost":175,"maxLevel":14,"evolutionTargetId":"w-asc-dual"}'::jsonb, true),
  ('shop-xbow-arbalest', 'weapon', 'Siegewind Arbalest', 'Reinforced torsion crossbow capable of punching through obsidian scales.', 'Uncommon', 220, 25, 2, '{"weaponId":"w-xbow-arbalest","category":"Crossbows","rarity":"Uncommon","baseAttack":40,"attackPerLevel":7,"baseDefense":6,"defensePerLevel":2,"critChance":12,"critDamage":195,"speed":68,"element":"Physical","abilityPower":14,"upgradeForgeCost":75,"maxLevel":10}'::jsonb, true),
  ('shop-xbow-thunder', 'weapon', 'Stormbolt Repeater', 'Arc-coil repeating arbalest discharging whistling lightning bolts.', 'Legendary', 740, 135, 5, '{"weaponId":"w-xbow-thunder","category":"Crossbows","rarity":"Legendary","baseAttack":118,"attackPerLevel":19,"baseDefense":18,"defensePerLevel":4,"critChance":20,"critDamage":225,"speed":78,"element":"Lightning","abilityPower":28,"upgradeForgeCost":245,"maxLevel":15,"evolutionTargetId":"w-cel-xbow"}'::jsonb, true),
  ('shop-wand-ember', 'weapon', 'Emberglass Wand', 'Slender ruby-core catalyst wand ideal for crisp, rapid incantations.', 'Common', 130, 10, 1, '{"weaponId":"w-wand-ember","category":"Wands","rarity":"Common","baseAttack":26,"attackPerLevel":5,"baseDefense":4,"defensePerLevel":1,"critChance":9,"critDamage":185,"speed":82,"element":"Fire","abilityPower":18,"upgradeForgeCost":42,"maxLevel":8}'::jsonb, true),
  ('shop-wand-starweave', 'weapon', 'Starweave Scepter-Wand', 'Crowned with three hovering star-sapphires that multiply spell velocity.', 'Epic', 450, 80, 3, '{"weaponId":"w-wand-starweave","category":"Wands","rarity":"Epic","baseAttack":86,"attackPerLevel":15,"baseDefense":14,"defensePerLevel":3,"critChance":15,"critDamage":205,"speed":86,"element":"Arcane","abilityPower":32,"upgradeForgeCost":170,"maxLevel":14}'::jsonb, true),
  ('shop-spear-valkyrie', 'weapon', 'Valkyrie Partisan', 'Winged-lug steel partisan favoring disciplined stance control and long reach.', 'Rare', 350, 55, 3, '{"weaponId":"w-spear-valkyrie","category":"Spears","rarity":"Rare","baseAttack":62,"attackPerLevel":11,"baseDefense":18,"defensePerLevel":4,"critChance":13,"critDamage":195,"speed":74,"element":"Light","abilityPower":16,"upgradeForgeCost":120,"maxLevel":12}'::jsonb, true),
  ('shop-spear-storm', 'weapon', 'Tempest Pike of Skadi', 'Frost-crystalline halberd spear humming with glacial lightning.', 'Legendary', 710, 130, 5, '{"weaponId":"w-spear-storm","category":"Spears","rarity":"Legendary","baseAttack":116,"attackPerLevel":19,"baseDefense":30,"defensePerLevel":5,"critChance":18,"critDamage":215,"speed":78,"element":"Ice","abilityPower":26,"upgradeForgeCost":235,"maxLevel":15}'::jsonb, true),
  ('shop-axe-berserker', 'weapon', 'Nordic Cleaver', 'Bearded ash-haft battleaxe weighted for decisive, stamina-driven chops.', 'Uncommon', 195, 20, 2, '{"weaponId":"w-axe-berserker","category":"Axes","rarity":"Uncommon","baseAttack":40,"attackPerLevel":7,"baseDefense":7,"defensePerLevel":2,"critChance":11,"critDamage":195,"speed":58,"element":"Physical","abilityPower":14,"upgradeForgeCost":70,"maxLevel":10}'::jsonb, true),
  ('shop-axe-bloodmoon', 'weapon', 'Bloodmoon Greataxe', 'Twin-crescent eclipse greataxe pulsing with deep crimson vitality.', 'Epic', 495, 90, 4, '{"weaponId":"w-axe-bloodmoon","category":"Axes","rarity":"Epic","baseAttack":92,"attackPerLevel":16,"baseDefense":14,"defensePerLevel":3,"critChance":17,"critDamage":215,"speed":54,"element":"Shadow","abilityPower":24,"upgradeForgeCost":180,"maxLevel":14,"evolutionTargetId":"w-et-aegis-axe"}'::jsonb, true),
  ('shop-ham-granite', 'weapon', 'Granite Breaker', 'Chiseled monolith war hammer banded in bronze for crushing Void golems.', 'Rare', 340, 55, 3, '{"weaponId":"w-ham-granite","category":"War Hammers","rarity":"Rare","baseAttack":65,"attackPerLevel":12,"baseDefense":22,"defensePerLevel":5,"critChance":9,"critDamage":195,"speed":45,"element":"Earth","abilityPower":18,"upgradeForgeCost":120,"maxLevel":12}'::jsonb, true),
  ('shop-ham-thunder', 'weapon', 'Stormanvil Maul', 'Arcing dwarven-runed maul whose every impact echoes like rolling thunder.', 'Legendary', 760, 140, 5, '{"weaponId":"w-ham-thunder","category":"War Hammers","rarity":"Legendary","baseAttack":120,"attackPerLevel":20,"baseDefense":38,"defensePerLevel":7,"critChance":14,"critDamage":215,"speed":50,"element":"Lightning","abilityPower":28,"upgradeForgeCost":245,"maxLevel":15}'::jsonb, true),
  ('shop-scythe-dusk', 'weapon', 'Duskweaver Scythe', 'Long-curved twilight war scythe with silvered moon-rune tang.', 'Rare', 380, 65, 3, '{"weaponId":"w-scythe-dusk","category":"Scythes","rarity":"Rare","baseAttack":66,"attackPerLevel":12,"baseDefense":10,"defensePerLevel":2,"critChance":19,"critDamage":215,"speed":72,"element":"Shadow","abilityPower":22,"upgradeForgeCost":125,"maxLevel":12}'::jsonb, true),
  ('shop-scythe-eclipse', 'weapon', 'Eclipse Harvester', 'Mythic twin-ringed eclipse scythe rimmed with frostfire starlight.', 'Mythic', 910, 175, 6, '{"weaponId":"w-scythe-eclipse","category":"Scythes","rarity":"Mythic","baseAttack":146,"attackPerLevel":23,"baseDefense":22,"defensePerLevel":5,"critChance":24,"critDamage":230,"speed":80,"element":"Ice","abilityPower":34,"upgradeForgeCost":315,"maxLevel":15,"evolutionTargetId":"w-cel-scythe"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  price_gold = EXCLUDED.price_gold,
  price_forge_xp = EXCLUDED.price_forge_xp,
  required_level = EXCLUDED.required_level,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active;

-- Seed Beyond-Mythical Progression & Evolution Catalog (Ascendant, Divine, Celestial, Eternal)
INSERT INTO public.weapon_catalog (
  weapon_id, name, category, rarity,
  base_attack, attack_per_level, base_defense, defense_per_level,
  crit_chance, crit_damage, speed, element, ability_power,
  max_level, upgrade_forge_cost, awakened, awakening_level,
  unlockable_via_progression, source_weapon_id, evolution_target_id,
  req_player_level, req_weapon_level, req_mastery_level, req_aether_rank,
  req_kingdom_cleared, req_bosses_defeated, req_streak_days, req_workouts, req_verified_reps,
  req_forge_xp, evo_forge_xp_cost, evo_gold_cost,
  special_ability_name, description, lore
)
VALUES
  ('w-asc-runeblade', 'Aether-Runed Ascendant Blade', 'Greatswords', 'Ascendant', 172, 26, 36, 7, 20, 225, 62, 'Arcane', 38, 16, 380, true, 1, true, 'w-sword-celestial', 'w-div-solaris', 6, 10, 5, 'Ascended', 'kingdom-mountain', 2, 0, 0, 0, 250, 340, 350, 'Teal Rune Overdrive', 'Tier VII Ascendant runeblade humming with luminous teal energy and etched ancient glyphs.', 'Only manifests for champions whose real-world discipline breaks past ordinary limits.'),
  ('w-asc-spear', 'Veridian Dawn Lance', 'Spears', 'Ascendant', 164, 25, 42, 8, 22, 225, 82, 'Water', 36, 16, 370, true, 1, true, NULL, NULL, 6, 1, 1, 'Ascended', 'kingdom-ocean', 0, 0, 0, 200, 260, 0, 0, 'Tidal Ascension', 'Radiant teal-jade cavalry lance etched with spiraling oceanic tides.', 'Forged from sea-glass coral beneath the cleared Ocean of Clarity.'),
  ('w-asc-dual', 'Zephyr Sovereign Twinblades', 'Dual Blades', 'Ascendant', 160, 24, 28, 6, 26, 230, 96, 'Wind', 36, 16, 365, true, 1, true, 'w-dual-crimson', NULL, 6, 10, 5, 'Ascended', NULL, 0, 0, 10, 0, 240, 360, 380, 'Gale Sovereign', 'Awakened teal-winged dual sabers that shear resistance with effortless wind speed.', 'Earned by warriors whose daily movement never falters.'),
  ('w-div-solaris', 'Solarian Dawnbreaker', 'Swords', 'Divine', 205, 30, 48, 9, 25, 240, 76, 'Light', 45, 18, 460, true, 2, true, 'w-asc-runeblade', 'w-cel-aetherblade', 9, 12, 6, 'Mythic', 'kingdom-desert', 4, 0, 0, 0, 420, 480, 450, 'Sacred Sunfire Halo', 'Tier VIII Divine sun-forged blade encircled by sacred golden sigils and blazing light.', 'Consecrated in dawnlight by champions who conquered temptation itself.'),
  ('w-div-hammer', 'Solstice Judgment Maul', 'War Hammers', 'Divine', 210, 31, 62, 11, 20, 235, 56, 'Light', 42, 18, 470, true, 2, true, NULL, NULL, 9, 1, 1, 'Mythic', 'kingdom-desert', 4, 0, 0, 0, 440, 0, 0, 'Aegis of Solstice', 'Massive gilded war hammer inscribed with sacred sun-dial wards.', 'Each swing rings like a cathedral bell across shadowed realms.'),
  ('w-div-bow', 'Seraphim Dawn Longbow', 'Bows', 'Divine', 198, 29, 34, 7, 28, 245, 90, 'Light', 44, 18, 455, true, 2, true, NULL, NULL, 8, 1, 1, 'Mythic', NULL, 3, 7, 0, 0, 400, 0, 0, 'Sunbeam Quiver', 'Winged gold-and-ivory recurve bow firing arrows woven from solidified morning light.', 'Strung with threads of pure unbroken daily resolve.'),
  ('w-div-wand', 'Hallowed Choir Wand', 'Wands', 'Divine', 194, 28, 38, 8, 23, 235, 92, 'Arcane', 52, 18, 450, true, 2, true, NULL, NULL, 9, 1, 1, 'Mythic', 'kingdom-desert', 0, 0, 0, 0, 390, 0, 0, 'Sacred Harmonic', 'Ornate gold-winged scepter wand resonating with celestial chord harmonics.', 'Conducts disciplined focus into overwhelming beams of purity.'),
  ('w-cel-aetherblade', 'Astral Nebula Sovereign', 'Greatswords', 'Celestial', 248, 35, 56, 10, 28, 255, 74, 'Cosmic', 55, 20, 590, true, 3, true, 'w-div-solaris', 'w-et-chronosword', 12, 14, 7, 'Transcendent', 'kingdom-citadel', 5, 0, 0, 0, 600, 620, 650, 'Nebula Rift Cleave', 'Tier IX Celestial greatsword containing a miniature swirling violet nebula along its fuller.', 'Starlight forged inside the shattered dome of the Shadow Citadel.'),
  ('w-cel-staff', 'Nebula Sovereign Rod', 'Magic Staffs', 'Celestial', 242, 34, 48, 9, 25, 250, 84, 'Cosmic', 62, 20, 580, true, 3, true, 'w-staff-astral', NULL, 12, 12, 7, 'Transcendent', 'kingdom-citadel', 5, 0, 0, 0, 580, 550, 600, 'Cosmic Astrolabe', 'Orbiting amethyst and sapphire astrolabe rings crown this cosmic conduit.', 'Reads the trajectories of entire galaxies.'),
  ('w-cel-scythe', 'Void-Star Reaper', 'Scythes', 'Celestial', 246, 35, 44, 8, 32, 265, 88, 'Cosmic', 58, 20, 585, true, 3, true, 'w-scythe-eclipse', 'w-et-eclipse-scythe', 11, 12, 7, 'Transcendent', 'kingdom-citadel', 5, 0, 0, 0, 590, 540, 620, 'Singularity Crescent', 'Celestial crescent scythe rimmed with twilight nebula frost and star-shards.', 'Sunders stagnant illusions across infinite starfields.'),
  ('w-cel-xbow', 'Astral Singularity Arbalest', 'Crossbows', 'Celestial', 238, 33, 40, 8, 30, 260, 86, 'Cosmic', 52, 20, 575, true, 3, true, 'w-xbow-thunder', NULL, 12, 12, 7, 'Transcendent', 'kingdom-citadel', 0, 0, 0, 0, 560, 520, 600, 'Event Horizon Quarrel', 'Arcane-nebula limbs suspend crystalline starbolts along a weightless rail.', 'Arrows launched from its limbs arrive as shooting stars.'),
  ('w-et-chronosword', 'Chronos, Edge of Eternity', 'Swords', 'Eternal', 310, 42, 78, 14, 35, 285, 92, 'Cosmic', 75, 22, 780, true, 4, true, 'w-cel-aetherblade', NULL, 15, 16, 8, 'Transcendent', 'kingdom-citadel', 6, 0, 0, 400, 900, 850, 950, 'Timeless Prism Awakening', 'Tier X Eternal sovereign blade forged from crystallized time, prism light, and unbroken daily mastery.', 'Legends claim Chronos exists simultaneously at dawn and dusk.'),
  ('w-et-eclipse-scythe', 'Eternity''s Veil, Cosmic Scythe', 'Scythes', 'Eternal', 304, 41, 68, 12, 38, 295, 94, 'Cosmic', 78, 22, 790, true, 4, true, 'w-cel-scythe', NULL, 15, 16, 8, 'Transcendent', 'kingdom-citadel', 7, 10, 0, 0, 920, 880, 1000, 'Infinite Horizon Reap', 'Dimensional twin-arc cosmic scythe weaving aurora filaments across eternity.', 'Harvests the final echoes of the Void without ever dulling.'),
  ('w-et-aegis-axe', 'Ouroboros Worldsplitter', 'Axes', 'Eternal', 318, 43, 82, 15, 32, 280, 82, 'Earth', 72, 22, 800, true, 4, true, 'w-axe-bloodmoon', NULL, 15, 13, 8, 'Transcendent', 'kingdom-citadel', 5, 0, 25, 0, 900, 780, 900, 'Eternal Bastion Cleave', 'Colossal double-bitted eternity axe ringed by an infinite ouroboros prism coil.', 'An unstoppable monument to years of relentless real-world discipline.')
ON CONFLICT (weapon_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  rarity = EXCLUDED.rarity,
  base_attack = EXCLUDED.base_attack,
  attack_per_level = EXCLUDED.attack_per_level,
  base_defense = EXCLUDED.base_defense,
  defense_per_level = EXCLUDED.defense_per_level,
  crit_chance = EXCLUDED.crit_chance,
  crit_damage = EXCLUDED.crit_damage,
  speed = EXCLUDED.speed,
  element = EXCLUDED.element,
  ability_power = EXCLUDED.ability_power,
  max_level = EXCLUDED.max_level,
  upgrade_forge_cost = EXCLUDED.upgrade_forge_cost,
  awakened = EXCLUDED.awakened,
  awakening_level = EXCLUDED.awakening_level,
  unlockable_via_progression = EXCLUDED.unlockable_via_progression,
  source_weapon_id = EXCLUDED.source_weapon_id,
  evolution_target_id = EXCLUDED.evolution_target_id,
  req_player_level = EXCLUDED.req_player_level,
  req_weapon_level = EXCLUDED.req_weapon_level,
  req_mastery_level = EXCLUDED.req_mastery_level,
  req_aether_rank = EXCLUDED.req_aether_rank,
  req_kingdom_cleared = EXCLUDED.req_kingdom_cleared,
  req_bosses_defeated = EXCLUDED.req_bosses_defeated,
  req_streak_days = EXCLUDED.req_streak_days,
  req_workouts = EXCLUDED.req_workouts,
  req_verified_reps = EXCLUDED.req_verified_reps,
  req_forge_xp = EXCLUDED.req_forge_xp,
  evo_forge_xp_cost = EXCLUDED.evo_forge_xp_cost,
  evo_gold_cost = EXCLUDED.evo_gold_cost,
  special_ability_name = EXCLUDED.special_ability_name,
  description = EXCLUDED.description,
  lore = EXCLUDED.lore;

-- ------------------------------------------------------------------------------
-- 5. UPGRADE EXISTING SHOP, COMBAT, AND BOOTSTRAP RPCs FOR FULL ARSENAL SUPPORT
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_purchase_shop_item(
  p_item_id TEXT,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_item public.shop_items%ROWTYPE;
  v_meta JSONB;
  v_cat TEXT;
  v_w_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.player_purchases WHERE user_id = v_uid AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'profile', to_jsonb(v_prof));
  END IF;

  SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id AND is_active = true FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shop item unavailable');
  END IF;

  -- Strictly block direct shop purchases of Beyond-Mythical rarities
  IF v_item.rarity IN ('Ascendant', 'Divine', 'Celestial', 'Eternal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Beyond-Mythical relics cannot be bought with currency; earn them through trials or evolution.');
  END IF;

  IF v_prof.level < v_item.required_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Hero Level ' || v_item.required_level);
  END IF;
  IF v_prof.gold_balance < v_item.price_gold THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Gold (' || v_item.price_gold || ' Gold required)');
  END IF;
  IF v_prof.forge_xp < v_item.price_forge_xp THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Forge XP');
  END IF;

  v_meta := v_item.metadata;

  IF v_item.item_type = 'weapon' THEN
    v_w_id := v_meta->>'weaponId';
    v_cat := COALESCE(v_meta->>'category', 'Swords');
    IF EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = v_w_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already own ' || v_item.name);
    END IF;
    INSERT INTO public.player_weapons (
      user_id, weapon_id, name, category, rarity, level, max_level,
      base_attack, attack_per_level, base_defense, defense_per_level,
      crit_chance, crit_damage, speed, element, ability_power,
      evolution_target_id, unlock_source,
      upgrade_forge_cost, unlocked, equipped, evolution_stage, mastery_level, mastery_path, abilities
    )
    VALUES (
      v_uid,
      v_w_id,
      v_item.name,
      v_cat,
      v_item.rarity,
      1,
      COALESCE((v_meta->>'maxLevel')::INTEGER, 12),
      COALESCE((v_meta->>'baseAttack')::INTEGER, 45),
      COALESCE((v_meta->>'attackPerLevel')::INTEGER, 9),
      COALESCE((v_meta->>'baseDefense')::INTEGER, 10),
      COALESCE((v_meta->>'defensePerLevel')::INTEGER, 3),
      COALESCE((v_meta->>'critChance')::INTEGER, 8),
      COALESCE((v_meta->>'critDamage')::INTEGER, 185),
      COALESCE((v_meta->>'speed')::INTEGER, 65),
      COALESCE(v_meta->>'element', 'Physical'),
      COALESCE((v_meta->>'abilityPower')::INTEGER, 12),
      NULLIF(v_meta->>'evolutionTargetId', ''),
      'shop',
      COALESCE((v_meta->>'upgradeForgeCost')::INTEGER, 100),
      true,
      false,
      v_prof.aether_rank,
      2,
      public._get_mastery_path_for_category(v_cat),
      public._default_abilities_for_category(v_cat)
    );
  ELSIF v_item.item_type IN ('elixir', 'buff') AND (v_meta ? 'buffId') THEN
    INSERT INTO public.player_buffs (user_id, buff_id, name, effect_type, effect_value, duration_battles, uses_remaining, active)
    VALUES (
      v_uid,
      v_meta->>'buffId',
      v_item.name,
      COALESCE(v_meta->>'effectType', 'attack'),
      COALESCE((v_meta->>'effectValue')::INTEGER, 10),
      COALESCE((v_meta->>'uses')::INTEGER, 2),
      COALESCE((v_meta->>'uses')::INTEGER, 2),
      true
    )
    ON CONFLICT (user_id, buff_id) DO UPDATE SET
      active = true,
      uses_remaining = GREATEST(public.player_buffs.uses_remaining, 0) + COALESCE((v_meta->>'uses')::INTEGER, 2),
      updated_at = now();
  ELSIF v_item.item_type = 'catalyst' AND (v_meta ? 'grantForgeXp') THEN
    v_prof := public._credit_currencies(v_uid, 0, (v_meta->>'grantForgeXp')::INTEGER, 0, 0, 'shop_catalyst', p_item_id, 'Catalyst Transmutation: ' || v_item.name, p_idempotency_key);
  END IF;

  INSERT INTO public.player_purchases (user_id, item_id, price_gold, price_forge_xp, idempotency_key)
  VALUES (v_uid, p_item_id, v_item.price_gold, v_item.price_forge_xp, p_idempotency_key);

  v_prof := public._credit_currencies(
    v_uid, 0, -v_item.price_forge_xp, -v_item.price_gold, 0,
    'shop_purchase', p_item_id, 'Purchased: ' || v_item.name, p_idempotency_key
  );

  RETURN jsonb_build_object('success', true, 'item', to_jsonb(v_item), 'profile', to_jsonb(v_prof));
END;
$$;

-- Server-authoritative progression unlock for Beyond-Mythical weapons
CREATE OR REPLACE FUNCTION public.rpc_unlock_progression_weapon(
  p_weapon_id TEXT,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_cat_row public.weapon_catalog%ROWTYPE;
  v_new_weapon public.player_weapons%ROWTYPE;
  v_abilities JSONB;
  v_unlocked_abilities JSONB := '[]'::jsonb;
  v_ab JSONB;
  v_init_mastery INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.economy_transactions
    WHERE user_id = v_uid AND source_type = 'progression_unlock' AND idempotency_key = p_idempotency_key
  ) THEN
    SELECT * INTO v_new_weapon FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id;
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'weapon', to_jsonb(v_new_weapon), 'profile', to_jsonb(v_prof));
  END IF;

  SELECT * INTO v_cat_row FROM public.weapon_catalog WHERE weapon_id = p_weapon_id AND unlockable_via_progression = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weapon relic is not eligible for progression unlock');
  END IF;

  IF EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already own ' || v_cat_row.name);
  END IF;

  IF v_prof.level < v_cat_row.req_player_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Hero Level ' || v_cat_row.req_player_level);
  END IF;

  IF public._aether_rank_tier(v_prof.aether_rank) < public._aether_rank_tier(v_cat_row.req_aether_rank) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Aether Rank: ' || v_cat_row.req_aether_rank);
  END IF;

  IF v_cat_row.req_kingdom_cleared IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.boss_encounters
    WHERE user_id = v_uid AND kingdom_id = v_cat_row.req_kingdom_cleared AND cleared = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires clearing kingdom boss: ' || v_cat_row.req_kingdom_cleared);
  END IF;

  IF v_prof.total_bosses_defeated < v_cat_row.req_bosses_defeated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires defeating ' || v_cat_row.req_bosses_defeated || ' bosses');
  END IF;

  IF v_prof.current_streak < v_cat_row.req_streak_days THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires a ' || v_cat_row.req_streak_days || '-day habit streak');
  END IF;

  IF v_prof.total_workouts_completed < v_cat_row.req_workouts THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_cat_row.req_workouts || ' completed workouts');
  END IF;

  IF v_prof.total_verified_reps < v_cat_row.req_verified_reps THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_cat_row.req_verified_reps || ' verified AI reps');
  END IF;

  IF v_prof.forge_xp < v_cat_row.req_forge_xp THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_cat_row.req_forge_xp || ' Forge XP catalyst');
  END IF;

  IF v_cat_row.req_forge_xp > 0 THEN
    v_prof := public._credit_currencies(
      v_uid, 0, -v_cat_row.req_forge_xp, 0, 0,
      'progression_unlock', p_weapon_id, 'Pinnacle Relic Unlocked: ' || v_cat_row.name, p_idempotency_key
    );
  ELSE
    INSERT INTO public.economy_transactions (user_id, currency, delta, balance_after, source_type, source_id, description, idempotency_key)
    VALUES (v_uid, 'FORGE_XP', 0, v_prof.forge_xp, 'progression_unlock', p_weapon_id, 'Pinnacle Relic Unlocked: ' || v_cat_row.name, p_idempotency_key);
  END IF;

  v_init_mastery := CASE WHEN v_cat_row.awakened THEN 4 ELSE 2 END;
  v_abilities := public._default_abilities_for_category(v_cat_row.category);
  FOR v_ab IN SELECT * FROM jsonb_array_elements(v_abilities)
  LOOP
    v_unlocked_abilities := v_unlocked_abilities || jsonb_build_array(
      v_ab || jsonb_build_object('unlocked', v_init_mastery >= COALESCE((v_ab->>'unlockMasteryLevel')::INTEGER, 1))
    );
  END LOOP;

  INSERT INTO public.player_weapons (
    user_id, weapon_id, name, category, rarity, level, max_level,
    base_attack, attack_per_level, base_defense, defense_per_level,
    crit_chance, crit_damage, speed, element, ability_power,
    awakened, awakening_level, evolution_target_id, unlock_source,
    upgrade_forge_cost, unlocked, equipped, evolution_stage, mastery_level, mastery_path, abilities
  )
  VALUES (
    v_uid, v_cat_row.weapon_id, v_cat_row.name, v_cat_row.category, v_cat_row.rarity,
    1, v_cat_row.max_level,
    v_cat_row.base_attack, v_cat_row.attack_per_level, v_cat_row.base_defense, v_cat_row.defense_per_level,
    v_cat_row.crit_chance, v_cat_row.crit_damage, v_cat_row.speed, v_cat_row.element, v_cat_row.ability_power,
    v_cat_row.awakened, v_cat_row.awakening_level, v_cat_row.evolution_target_id, 'progression',
    v_cat_row.upgrade_forge_cost, true, false,
    CASE WHEN v_cat_row.awakened THEN 'Awakened' ELSE 'Dormant' END,
    v_init_mastery,
    public._get_mastery_path_for_category(v_cat_row.category),
    v_unlocked_abilities
  )
  RETURNING * INTO v_new_weapon;

  RETURN jsonb_build_object('success', true, 'weapon', to_jsonb(v_new_weapon), 'profile', to_jsonb(v_prof));
END;
$$;

-- Server-authoritative Weapon Rarity Evolution / Awakening Path (Mythic -> Ascendant -> Divine -> Celestial -> Eternal)
CREATE OR REPLACE FUNCTION public.rpc_ascend_weapon_rarity(
  p_weapon_id TEXT,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_cur public.player_weapons%ROWTYPE;
  v_target public.weapon_catalog%ROWTYPE;
  v_result public.player_weapons%ROWTYPE;
  v_abilities JSONB;
  v_final_abilities JSONB := '[]'::jsonb;
  v_ab JSONB;
  v_new_mastery INTEGER;
  v_was_equipped BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is required');
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.economy_transactions
    WHERE user_id = v_uid AND source_type = 'rarity_ascension' AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true, 'profile', to_jsonb(v_prof));
  END IF;

  SELECT * INTO v_cur FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = p_weapon_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source weapon not found in armory');
  END IF;

  SELECT * INTO v_target
  FROM public.weapon_catalog
  WHERE weapon_id = COALESCE(v_cur.evolution_target_id, (SELECT evolution_target_id FROM public.weapon_catalog WHERE weapon_id = p_weapon_id))
     OR source_weapon_id = p_weapon_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No further rarity evolution path defined for ' || v_cur.name);
  END IF;

  IF EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = v_target.weapon_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already possess ' || v_target.name);
  END IF;

  IF v_cur.level < v_target.req_weapon_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires weapon tempered to Level ' || v_target.req_weapon_level);
  END IF;

  IF v_cur.mastery_level < v_target.req_mastery_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Weapon Mastery Level ' || v_target.req_mastery_level);
  END IF;

  IF public._aether_rank_tier(v_prof.aether_rank) < public._aether_rank_tier(v_target.req_aether_rank) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires global Aether Rank: ' || v_target.req_aether_rank);
  END IF;

  IF v_prof.level < v_target.req_player_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires Hero Level ' || v_target.req_player_level);
  END IF;

  IF v_target.req_kingdom_cleared IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.boss_encounters
    WHERE user_id = v_uid AND kingdom_id = v_target.req_kingdom_cleared AND cleared = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires purifying kingdom boss: ' || v_target.req_kingdom_cleared);
  END IF;

  IF v_prof.total_bosses_defeated < v_target.req_bosses_defeated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_target.req_bosses_defeated || ' bosses defeated');
  END IF;

  IF v_prof.forge_xp < v_target.evo_forge_xp_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_target.evo_forge_xp_cost || ' Forge XP');
  END IF;

  IF v_prof.gold_balance < v_target.evo_gold_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requires ' || v_target.evo_gold_cost || ' Gold');
  END IF;

  v_prof := public._credit_currencies(
    v_uid, 0, -v_target.evo_forge_xp_cost, -v_target.evo_gold_cost, 40,
    'rarity_ascension', v_target.weapon_id, 'Rarity Ascension: ' || v_cur.name || ' -> ' || v_target.name, p_idempotency_key
  );

  v_was_equipped := v_cur.equipped;
  v_new_mastery := GREATEST(v_cur.mastery_level, CASE WHEN v_target.awakened THEN 4 ELSE 2 END);
  v_abilities := public._default_abilities_for_category(v_target.category);
  FOR v_ab IN SELECT * FROM jsonb_array_elements(v_abilities)
  LOOP
    v_final_abilities := v_final_abilities || jsonb_build_array(
      v_ab || jsonb_build_object('unlocked', v_new_mastery >= COALESCE((v_ab->>'unlockMasteryLevel')::INTEGER, 1))
    );
  END LOOP;

  -- Transform the source weapon atomically into its ascended form
  UPDATE public.player_weapons
  SET
    weapon_id = v_target.weapon_id,
    name = v_target.name,
    category = v_target.category,
    rarity = v_target.rarity,
    level = 1,
    max_level = v_target.max_level,
    base_attack = v_target.base_attack,
    attack_per_level = v_target.attack_per_level,
    base_defense = v_target.base_defense,
    defense_per_level = v_target.defense_per_level,
    crit_chance = v_target.crit_chance,
    crit_damage = v_target.crit_damage,
    speed = v_target.speed,
    element = v_target.element,
    ability_power = v_target.ability_power,
    awakened = v_target.awakened,
    awakening_level = v_target.awakening_level,
    evolution_target_id = v_target.evolution_target_id,
    unlock_source = 'evolution',
    upgrade_forge_cost = v_target.upgrade_forge_cost,
    mastery_level = v_new_mastery,
    mastery_path = public._get_mastery_path_for_category(v_target.category),
    abilities = v_final_abilities,
    evolution_stage = CASE
      WHEN public._aether_rank_tier(v_cur.evolution_stage) >= 4 THEN v_cur.evolution_stage
      ELSE 'Ascended'
    END,
    updated_at = now()
  WHERE user_id = v_uid AND weapon_id = p_weapon_id
  RETURNING * INTO v_result;

  IF v_was_equipped THEN
    UPDATE public.profiles SET equipped_weapon_id = v_result.weapon_id WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'previousWeaponId', p_weapon_id,
    'weapon', to_jsonb(v_result),
    'profile', to_jsonb(v_prof)
  );
END;
$$;

-- Upgrade boss combat engine to apply weapon crit_chance, crit_damage, speed, element, ability_power & awakened bonus
CREATE OR REPLACE FUNCTION public.rpc_boss_combat_turn(
  p_kingdom_id TEXT,
  p_action TEXT,
  p_ability_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_be public.boss_encounters%ROWTYPE;
  v_w public.player_weapons%ROWTYPE;
  v_action TEXT := lower(COALESCE(p_action, 'attack'));
  v_ab JSONB := NULL;
  v_ab_elem JSONB;
  v_stam_cost INTEGER := 0;
  v_atk_buff INTEGER := 0;
  v_def_buff INTEGER := 0;
  v_crit_buff INTEGER := 0;
  v_hp_ratio NUMERIC;
  v_next_ratio NUMERIC;
  v_cur_phase INTEGER := 1;
  v_new_phase INTEGER := NULL;
  v_phase_mult NUMERIC := 1.0;
  v_base_dmg NUMERIC := 0;
  v_boss_weak_elem TEXT;
  v_boss_weak_mult NUMERIC;
  v_boss_res_elem TEXT;
  v_boss_res_pct NUMERIC;
  v_boss_def_pct NUMERIC;
  v_boss_base_atk NUMERIC;
  v_sig_mult NUMERIC;
  v_ab_element TEXT;
  v_ab_dmg_mult NUMERIC;
  v_ab_crit_bonus NUMERIC;
  v_ab_def_boost NUMERIC;
  v_is_weakness BOOLEAN := false;
  v_is_crit BOOLEAN := false;
  v_crit_chance NUMERIC := 0.15;
  v_crit_mult NUMERIC := 1.8;
  v_speed_discount INTEGER := 0;
  v_player_dmg INTEGER := 0;
  v_boss_dmg INTEGER := 0;
  v_boss_raw_dmg NUMERIC;
  v_next_boss_hp INTEGER;
  v_next_player_hp INTEGER;
  v_next_stamina INTEGER;
  v_next_turn INTEGER;
  v_next_telegraph BOOLEAN := false;
  v_boss_defeated BOOLEAN := false;
  v_player_defeated BOOLEAN := false;
  v_log TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_action NOT IN ('attack', 'ability', 'defend', 'dodge') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid combat action');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  SELECT * INTO v_be FROM public.boss_encounters WHERE user_id = v_uid AND kingdom_id = p_kingdom_id FOR UPDATE;
  IF NOT FOUND OR NOT v_be.unlocked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kingdom encounter not unlocked');
  END IF;
  IF NOT v_be.battle_active OR v_be.boss_hp <= 0 OR v_be.player_hp <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active boss battle. Start or reset the encounter first.');
  END IF;

  SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND weapon_id = v_prof.equipped_weapon_id;
  IF NOT FOUND THEN
    SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid AND equipped = true LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    SELECT * INTO v_w FROM public.player_weapons WHERE user_id = v_uid ORDER BY base_attack DESC LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No weapon available in armory');
  END IF;

  -- High weapon speed (>= 70) grants authentic stamina efficiency in boss combat
  v_speed_discount := GREATEST(0, FLOOR((COALESCE(v_w.speed, 60) - 65) / 8.0)::INTEGER);

  IF v_action = 'ability' THEN
    IF p_ability_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ability ID required');
    END IF;
    IF jsonb_typeof(v_w.abilities) = 'array' THEN
      FOR v_ab_elem IN SELECT * FROM jsonb_array_elements(v_w.abilities)
      LOOP
        IF (v_ab_elem->>'id') = p_ability_id AND COALESCE((v_ab_elem->>'unlocked')::BOOLEAN, false) THEN
          v_ab := v_ab_elem;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    IF v_ab IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selected ability is not unlocked for equipped weapon');
    END IF;
    v_stam_cost := GREATEST(10, COALESCE((v_ab->>'staminaCost')::INTEGER, 30) - v_speed_discount);
  ELSIF v_action = 'dodge' THEN
    v_stam_cost := GREATEST(10, 20 - LEAST(5, v_speed_discount));
  ELSIF v_action = 'defend' THEN
    v_stam_cost := 15;
  END IF;

  IF v_be.player_stamina < v_stam_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stamina');
  END IF;

  SELECT COALESCE(MAX(effect_value), 0) INTO v_atk_buff FROM public.player_buffs WHERE user_id = v_uid AND active = true AND effect_type = 'attack' AND uses_remaining > 0;
  SELECT COALESCE(MAX(effect_value), 0) INTO v_def_buff FROM public.player_buffs WHERE user_id = v_uid AND active = true AND effect_type = 'defense' AND uses_remaining > 0;
  SELECT COALESCE(MAX(effect_value), 0) INTO v_crit_buff FROM public.player_buffs WHERE user_id = v_uid AND active = true AND effect_type = 'crit' AND uses_remaining > 0;

  CASE p_kingdom_id
    WHEN 'kingdom-forest' THEN
      v_boss_base_atk := 22; v_boss_weak_elem := 'Fire'; v_boss_weak_mult := 1.75; v_boss_res_elem := 'Nature'; v_boss_res_pct := 40; v_boss_def_pct := 35; v_sig_mult := 2.2;
    WHEN 'kingdom-mountain' THEN
      v_boss_base_atk := 40; v_boss_weak_elem := 'Water'; v_boss_weak_mult := 1.85; v_boss_res_elem := 'Fire'; v_boss_res_pct := 60; v_boss_def_pct := 40; v_sig_mult := 2.5;
    WHEN 'kingdom-ocean' THEN
      v_boss_base_atk := 62; v_boss_weak_elem := 'Lightning'; v_boss_weak_mult := 1.80; v_boss_res_elem := 'Water'; v_boss_res_pct := 50; v_boss_def_pct := 20; v_sig_mult := 2.4;
    WHEN 'kingdom-desert' THEN
      v_boss_base_atk := 90; v_boss_weak_elem := 'Ice'; v_boss_weak_mult := 1.80; v_boss_res_elem := 'Physical'; v_boss_res_pct := 35; v_boss_def_pct := 25; v_sig_mult := 2.6;
    ELSE
      v_boss_base_atk := 115; v_boss_weak_elem := 'Light'; v_boss_weak_mult := 2.00; v_boss_res_elem := 'Void'; v_boss_res_pct := 70; v_boss_def_pct := 50; v_sig_mult := 2.8;
  END CASE;

  v_hp_ratio := v_be.boss_hp::NUMERIC / GREATEST(1, v_be.boss_max_hp)::NUMERIC;
  IF v_hp_ratio <= 0.33 THEN
    v_cur_phase := 3; v_phase_mult := CASE WHEN p_kingdom_id = 'kingdom-citadel' THEN 1.6 ELSE 1.5 END;
  ELSIF v_hp_ratio <= 0.66 THEN
    v_cur_phase := 2; v_phase_mult := CASE WHEN p_kingdom_id = 'kingdom-citadel' THEN 1.3 ELSE 1.25 END;
  END IF;

  IF v_action = 'defend' THEN
    v_player_dmg := GREATEST(8, round(v_w.base_defense * 0.35)::INTEGER);
  ELSIF v_action = 'dodge' THEN
    v_player_dmg := 0;
  ELSE
    v_base_dmg := v_w.base_attack;
    IF v_w.evolution_stage = 'Awakened' THEN v_base_dmg := v_base_dmg * 1.15;
    ELSIF v_w.evolution_stage = 'Ascended' THEN v_base_dmg := v_base_dmg * 1.30;
    ELSIF v_w.evolution_stage = 'Mythic' THEN v_base_dmg := v_base_dmg * 1.50;
    ELSIF v_w.evolution_stage = 'Transcendent' THEN v_base_dmg := v_base_dmg * 1.80;
    END IF;

    -- Awakened pinnacle resonance (+8% base strike power)
    IF COALESCE(v_w.awakened, false) THEN
      v_base_dmg := v_base_dmg * 1.08;
    END IF;

    -- Weapon intrinsic element affinity on basic attack when matching boss weakness
    IF v_ab IS NULL AND COALESCE(v_w.element, 'Physical') = v_boss_weak_elem THEN
      v_is_weakness := true;
      v_base_dmg := v_base_dmg * 1.25;
    END IF;

    IF v_ab IS NOT NULL THEN
      v_ab_dmg_mult := COALESCE((v_ab->>'damageMultiplier')::NUMERIC, 1.0);
      -- Ability power scales active skill damage multiplier authentically
      v_ab_dmg_mult := v_ab_dmg_mult * (1 + COALESCE(v_w.ability_power, 0) / 100.0);
      v_ab_element := COALESCE(v_ab->>'element', COALESCE(v_w.element, 'Physical'));
      v_ab_crit_bonus := COALESCE((v_ab->>'critBonus')::NUMERIC, 0);
      v_ab_def_boost := COALESCE((v_ab->>'defenseBoost')::NUMERIC, 0);
      v_base_dmg := v_base_dmg * v_ab_dmg_mult;

      -- Cosmic & Arcane radiate universal resonance vs Citadel Void; Light pierces Citadel
      IF v_ab_element = v_boss_weak_elem OR (v_ab_element IN ('Cosmic', 'Arcane') AND p_kingdom_id = 'kingdom-citadel') THEN
        v_is_weakness := true;
        v_base_dmg := v_base_dmg * v_boss_weak_mult;
      ELSIF v_ab_element = v_boss_res_elem THEN
        v_base_dmg := v_base_dmg * (1 - v_boss_res_pct / 100.0);
      END IF;
    END IF;

    IF NOT v_is_weakness THEN
      v_base_dmg := v_base_dmg * (1 - v_boss_def_pct / 100.0);
    END IF;

    IF v_atk_buff > 0 THEN
      v_base_dmg := v_base_dmg * (1 + v_atk_buff / 100.0);
    END IF;

    v_crit_chance := 0.10 + (COALESCE(v_w.crit_chance, 5) / 100.0) + (v_crit_buff / 100.0) + COALESCE(v_ab_crit_bonus, 0) / 100.0;
    IF v_w.evolution_stage IN ('Ascended', 'Mythic', 'Transcendent') THEN
      v_crit_chance := v_crit_chance + 0.08;
    END IF;
    v_crit_chance := LEAST(0.85, v_crit_chance);
    v_crit_mult := GREATEST(1.5, COALESCE(v_w.crit_damage, 180) / 100.0);

    v_is_crit := random() < v_crit_chance;
    IF v_is_crit THEN
      v_base_dmg := v_base_dmg * v_crit_mult;
    END IF;

    v_player_dmg := GREATEST(12, round(v_base_dmg + (random() * 14 - 7))::INTEGER);
  END IF;

  v_boss_raw_dmg := v_boss_base_atk * v_phase_mult;
  IF v_be.telegraph_active THEN
    v_boss_raw_dmg := v_boss_raw_dmg * v_sig_mult;
  END IF;
  IF v_def_buff > 0 THEN
    v_boss_raw_dmg := v_boss_raw_dmg * (1 - v_def_buff / 100.0);
  END IF;
  IF COALESCE(v_ab_def_boost, 0) > 0 THEN
    v_boss_raw_dmg := v_boss_raw_dmg * GREATEST(0, 1 - v_ab_def_boost / 100.0);
  END IF;

  v_boss_dmg := GREATEST(3, round(v_boss_raw_dmg - v_w.base_defense * 0.4 + (random() * 8 - 4))::INTEGER);
  IF v_action = 'dodge' THEN
    v_boss_dmg := 0;
  ELSIF v_action = 'defend' THEN
    v_boss_dmg := GREATEST(2, round(v_boss_dmg * 0.22)::INTEGER);
  END IF;

  v_next_boss_hp := GREATEST(0, v_be.boss_hp - v_player_dmg);
  v_next_player_hp := GREATEST(0, v_be.player_hp - v_boss_dmg);
  v_boss_defeated := v_next_boss_hp <= 0;
  v_player_defeated := (NOT v_boss_defeated) AND (v_next_player_hp <= 0);

  v_next_stamina := LEAST(100, GREATEST(0, (v_be.player_stamina - v_stam_cost) + CASE WHEN v_action = 'attack' THEN 25 ELSE 15 END));
  v_next_turn := v_be.turn_count + 1;

  v_next_ratio := v_next_boss_hp::NUMERIC / GREATEST(1, v_be.boss_max_hp)::NUMERIC;
  IF v_hp_ratio > 0.66 AND v_next_ratio <= 0.66 AND NOT v_boss_defeated THEN
    v_new_phase := 2;
    v_cur_phase := 2;
  ELSIF v_hp_ratio > 0.33 AND v_next_ratio <= 0.33 AND NOT v_boss_defeated THEN
    v_new_phase := 3;
    v_cur_phase := 3;
  END IF;

  IF NOT v_be.telegraph_active AND NOT v_boss_defeated AND NOT v_player_defeated THEN
    IF (v_next_turn % 3 = 0) OR (v_cur_phase = 3 AND v_next_turn % 2 = 0) THEN
      v_next_telegraph := true;
    END IF;
  END IF;

  UPDATE public.boss_encounters
  SET
    boss_hp = v_next_boss_hp,
    player_hp = v_next_player_hp,
    player_stamina = v_next_stamina,
    current_phase = v_cur_phase,
    turn_count = v_next_turn,
    telegraph_active = v_next_telegraph,
    weakness_discovered = weakness_discovered OR v_is_weakness,
    battle_active = (NOT v_boss_defeated AND NOT v_player_defeated),
    victory_pending = v_boss_defeated,
    updated_at = now()
  WHERE user_id = v_uid AND kingdom_id = p_kingdom_id
  RETURNING * INTO v_be;

  v_log := CASE
    WHEN v_boss_defeated THEN 'VICTORY! ' || v_w.name || ' struck for ' || v_player_dmg || ' damage, cleansing the Void corruption!'
    WHEN v_action = 'dodge' THEN 'Evasive Dodge! You rolled clear of the boss''s blow (0 damage taken).'
    WHEN v_action = 'defend' THEN 'Perfect Guard! You braced and absorbed the strike for ' || v_boss_dmg || ' damage.'
    ELSE
      COALESCE(CASE WHEN v_ab IS NOT NULL THEN '[' || (v_ab->>'name') || '] ' ELSE '' END, '') ||
      CASE WHEN v_is_weakness THEN '[WEAKNESS EXPLOITED!] ' ELSE '' END ||
      'Struck with ' || v_w.name || ' for ' || v_player_dmg || ' damage' ||
      CASE WHEN v_is_crit THEN ' (CRITICAL HIT!)' ELSE '' END ||
      '. Boss retaliated for ' || v_boss_dmg || ' damage.'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'playerDamage', v_player_dmg,
    'bossDamage', v_boss_dmg,
    'isCrit', v_is_crit,
    'isWeaknessHit', v_is_weakness,
    'isDefended', v_action = 'defend',
    'isDodged', v_action = 'dodge',
    'bossDefeated', v_boss_defeated,
    'playerDefeated', v_player_defeated,
    'newPhase', v_new_phase,
    'combatLog', v_log,
    'encounter', to_jsonb(v_be)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. EXECUTE GRANTS ON NEW PUBLIC RPCs
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.rpc_unlock_progression_weapon(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_unlock_progression_weapon(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_ascend_weapon_rarity(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_ascend_weapon_rarity(TEXT, UUID) TO authenticated;

COMMIT;
