import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_THEMES,
  GLOBAL_BRAND,
  resolveFeatureTheme,
  resolveFeatureThemeId,
} from '../src/theme/featureTheme.ts';

test('GLOBAL_BRAND defines the obsidian, royal purple, antique gold, and semantic tokens', () => {
  assert.equal(GLOBAL_BRAND.bgBase, '#100D18');
  assert.equal(GLOBAL_BRAND.bgSecondary, '#171220');
  assert.equal(GLOBAL_BRAND.bgSurface, '#21152F');
  assert.equal(GLOBAL_BRAND.bgDeepPurple, '#362B45');
  assert.equal(GLOBAL_BRAND.brandPrimary, '#7045A0');
  assert.equal(GLOBAL_BRAND.brandBright, '#9A72CC');
  assert.equal(GLOBAL_BRAND.brandSecondary, '#D6A84B');
  assert.equal(GLOBAL_BRAND.brandGoldGlow, '#E8C777');
  assert.equal(GLOBAL_BRAND.accentEmerald, '#49B88A');
  assert.equal(GLOBAL_BRAND.accentRuby, '#D65C66');
  assert.equal(GLOBAL_BRAND.accentAmber, '#D6A84B');
});

test('All 12 feature themes define valid hex palettes without legacy navy/cyan slop', () => {
  const expectedIds = [
    'dashboard',
    'fitness',
    'skill-tree',
    'quests',
    'achievements',
    'boss-battles',
    'rivals',
    'social',
    'events',
    'mentor',
    'museum',
    'character',
  ];

  assert.deepEqual(Object.keys(FEATURE_THEMES), expectedIds);

  const bannedLegacyHexes = new Set(['#061225', '#0A1930', '#102440', '#1677FF', '#00D9FF']);
  for (const theme of Object.values(FEATURE_THEMES)) {
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(theme.primaryHex), `${theme.id} primaryHex valid`);
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(theme.secondaryHex), `${theme.id} secondaryHex valid`);
    assert.equal(bannedLegacyHexes.has(theme.primaryHex.toUpperCase()), false);
    assert.equal(bannedLegacyHexes.has(theme.secondaryHex.toUpperCase()), false);
  }
});

test('resolveFeatureThemeId maps primary tabs and progression sub-tabs to their assigned color identities', () => {
  assert.equal(resolveFeatureThemeId({ activeTab: 'dashboard' }), 'dashboard');
  assert.equal(resolveFeatureThemeId({ activeTab: 'fitness' }), 'fitness');
  assert.equal(resolveFeatureThemeId({ activeTab: 'nutrition' }), 'fitness');
  assert.equal(resolveFeatureThemeId({ activeTab: 'aether-vision' }), 'fitness');
  assert.equal(resolveFeatureThemeId({ activeTab: 'skill-tree' }), 'skill-tree');
  assert.equal(resolveFeatureThemeId({ activeTab: 'quests' }), 'quests');
  assert.equal(resolveFeatureThemeId({ activeTab: 'achievements' }), 'achievements');
  assert.equal(resolveFeatureThemeId({ activeTab: 'progression', progressionSubTab: 'skill-tree' }), 'skill-tree');
  assert.equal(resolveFeatureThemeId({ activeTab: 'progression', progressionSubTab: 'achievements' }), 'quests');
  assert.equal(resolveFeatureThemeId({ activeTab: 'progression', progressionSubTab: 'quests' }), 'quests');
  assert.equal(resolveFeatureThemeId({ activeTab: 'boss-battles' }), 'boss-battles');
  assert.equal(resolveFeatureThemeId({ activeTab: 'rivals' }), 'rivals');
  assert.equal(resolveFeatureThemeId({ activeTab: 'social' }), 'social');
  assert.equal(resolveFeatureThemeId({ activeTab: 'activity-feed' }), 'social');
  assert.equal(resolveFeatureThemeId({ activeTab: 'events' }), 'events');
  assert.equal(resolveFeatureThemeId({ activeTab: 'mentor' }), 'mentor');
  assert.equal(resolveFeatureThemeId({ activeTab: 'museum' }), 'museum');
  assert.equal(resolveFeatureThemeId({ activeTab: 'character' }), 'character');

  assert.equal(resolveFeatureTheme({ activeTab: 'dashboard' }).primaryHex, '#7045A0');
  assert.equal(resolveFeatureTheme({ activeTab: 'boss-battles' }).primaryHex, '#D65C66');
  assert.equal(resolveFeatureTheme({ activeTab: 'fitness' }).primaryHex, '#49B88A');
  assert.equal(resolveFeatureTheme({ activeTab: 'skill-tree' }).primaryHex, '#7045A0');
  assert.equal(resolveFeatureTheme({ activeTab: 'social' }).primaryHex, '#7045A0');
  assert.equal(resolveFeatureTheme({ activeTab: 'quests' }).primaryHex, '#D6A84B');
});
