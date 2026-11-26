import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_THEMES,
  GLOBAL_BRAND,
  resolveFeatureTheme,
  resolveFeatureThemeId,
} from '../src/theme/featureTheme.ts';

test('GLOBAL_BRAND defines the AAA dark-fantasy midnight purple, royal violet, and gold tokens', () => {
  assert.equal(GLOBAL_BRAND.bgBase, '#100D1C');
  assert.equal(GLOBAL_BRAND.bgSurface, '#24143D');
  assert.equal(GLOBAL_BRAND.brandPrimary, '#6638B8');
  assert.equal(GLOBAL_BRAND.brandBright, '#A875FF');
  assert.equal(GLOBAL_BRAND.brandSecondary, '#E7B94F');
  assert.equal(GLOBAL_BRAND.brandGoldGlow, '#FFD978');
  assert.equal(GLOBAL_BRAND.accentCyan, '#38D9F5');
  assert.equal(GLOBAL_BRAND.accentEmerald, '#35D69A');
  assert.equal(GLOBAL_BRAND.accentRuby, '#F05B70');
  assert.equal(GLOBAL_BRAND.accentIce, '#65A9FF');
  assert.equal(GLOBAL_BRAND.accentAmber, '#FFAA45');
});

test('All 12 feature themes have distinct, non-navy AAA dark-fantasy hex palettes', () => {
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

  const bannedHexes = new Set(['#061225', '#0A1930', '#102440', '#1677FF', '#00D9FF', '#0099FF']);
  for (const theme of Object.values(FEATURE_THEMES)) {
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(theme.primaryHex), `${theme.id} primaryHex valid`);
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(theme.secondaryHex), `${theme.id} secondaryHex valid`);
    assert.equal(bannedHexes.has(theme.primaryHex.toUpperCase()), false);
    assert.equal(bannedHexes.has(theme.secondaryHex.toUpperCase()), false);
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
  assert.equal(resolveFeatureThemeId({ activeTab: 'progression', progressionSubTab: 'achievements' }), 'achievements');
  assert.equal(resolveFeatureThemeId({ activeTab: 'progression', progressionSubTab: 'quests' }), 'quests');
  assert.equal(resolveFeatureThemeId({ activeTab: 'boss-battles' }), 'boss-battles');
  assert.equal(resolveFeatureThemeId({ activeTab: 'rivals' }), 'rivals');
  assert.equal(resolveFeatureThemeId({ activeTab: 'social' }), 'social');
  assert.equal(resolveFeatureThemeId({ activeTab: 'activity-feed' }), 'social');
  assert.equal(resolveFeatureThemeId({ activeTab: 'events' }), 'events');
  assert.equal(resolveFeatureThemeId({ activeTab: 'mentor' }), 'mentor');
  assert.equal(resolveFeatureThemeId({ activeTab: 'museum' }), 'museum');
  assert.equal(resolveFeatureThemeId({ activeTab: 'character' }), 'character');

  assert.equal(resolveFeatureTheme({ activeTab: 'boss-battles' }).primaryHex, '#F05B70');
  assert.equal(resolveFeatureTheme({ activeTab: 'fitness' }).primaryHex, '#35D69A');
  assert.equal(resolveFeatureTheme({ activeTab: 'skill-tree' }).primaryHex, '#38D9F5');
  assert.equal(resolveFeatureTheme({ activeTab: 'social' }).primaryHex, '#65A9FF');
  assert.equal(resolveFeatureTheme({ activeTab: 'quests' }).primaryHex, '#E7B94F');
});
