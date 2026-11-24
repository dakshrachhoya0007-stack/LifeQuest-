import React from 'react';
import { getHeroArtwork } from '../../assets/images';
import { COSMETICS_CATALOG } from '../../data/expansionData';
import type {
  CharacterAppearance,
  CollectibleCardDef,
  PlayableHeroId,
  PresenceStatus,
} from '../../types/game';
import { PresenceBadge } from '../Brand/PresenceBadge';

interface Character2DAvatarProps {
  heroId?: PlayableHeroId | string | null;
  characterClass?: string | null;
  appearance?: CharacterAppearance | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  presenceStatus?: PresenceStatus;
  prestigeTier?: number;
  showBannerBackdrop?: boolean;
  className?: string;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', { box: string; radius: string; badge: 'xs' | 'sm' | 'md' }> = {
  sm: { box: 'w-12 h-12', radius: 'rounded-xl', badge: 'xs' },
  md: { box: 'w-20 h-20', radius: 'rounded-2xl', badge: 'sm' },
  lg: { box: 'w-28 h-28', radius: 'rounded-2xl', badge: 'md' },
  xl: { box: 'w-40 h-40', radius: 'rounded-3xl', badge: 'md' },
};

const PRESTIGE_ROMANS = ['', 'I', 'II', 'III', 'IV', 'V'];

export const Character2DAvatar: React.FC<Character2DAvatarProps> = ({
  heroId,
  characterClass,
  appearance,
  size = 'lg',
  presenceStatus,
  prestigeTier = 0,
  showBannerBackdrop = false,
  className = '',
}) => {
  const artwork = getHeroArtwork(heroId, characterClass);
  const frameItem = appearance?.frameId
    ? COSMETICS_CATALOG.find(c => c.id === appearance.frameId)
    : COSMETICS_CATALOG.find(c => c.id === 'frame_bronze_crest');
  const auraItem = appearance?.auraId
    ? COSMETICS_CATALOG.find(c => c.id === appearance.auraId)
    : null;
  const bannerItem = appearance?.bannerId
    ? COSMETICS_CATALOG.find(c => c.id === appearance.bannerId)
    : null;
  const outfitItem = appearance?.outfitId
    ? COSMETICS_CATALOG.find(c => c.id === appearance.outfitId)
    : null;
  const colorItem = appearance?.colorId
    ? COSMETICS_CATALOG.find(c => c.id === appearance.colorId)
    : null;
  const hairItem = appearance?.hairstyleId
    ? COSMETICS_CATALOG.find(c => c.id === appearance.hairstyleId)
    : null;

  const dims = SIZE_MAP[size];
  const frameColor = frameItem?.accentHex || '#8B5CF6';
  const frameSecondary = frameItem?.primaryHex || '#141420';
  const auraColor = auraItem?.primaryHex || '#D6A84B';
  const colorAccent = colorItem?.accentHex || outfitItem?.accentHex || '#8B5CF6';
  const romanTier = prestigeTier > 0 ? PRESTIGE_ROMANS[Math.min(5, prestigeTier)] || `P${prestigeTier}` : null;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {showBannerBackdrop && bannerItem && (
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-3xl opacity-85 border border-white/10"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${bannerItem.accentHex}30, transparent 58%), linear-gradient(135deg, ${bannerItem.primaryHex}, ${bannerItem.secondaryHex})`,
          }}
        />
      )}

      {auraItem && (
        <svg
          viewBox="0 0 120 120"
          aria-hidden="true"
          className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none"
        >
          <circle
            cx="60"
            cy="60"
            r="56"
            fill="none"
            stroke={auraColor}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
          <circle
            cx="60"
            cy="60"
            r="51"
            fill="none"
            stroke={auraItem.accentHex}
            strokeWidth="0.9"
            opacity="0.45"
          />
        </svg>
      )}

      <div
        className={`relative overflow-hidden ${dims.box} ${dims.radius} bg-[#090910] shadow-xl`}
        style={{
          border: `2px solid ${frameColor}`,
          boxShadow: `0 0 0 1px ${frameSecondary}, 0 10px 25px -8px ${auraItem ? `${auraColor}55` : 'rgba(9,9,16,0.8)'}`,
        }}
      >
        {colorItem && (
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
            style={{
              background: `linear-gradient(160deg, ${colorItem.secondaryHex}55, transparent 60%, ${colorAccent}45)`,
            }}
          />
        )}

        <img
          src={artwork}
          alt={characterClass ? `${characterClass} portrait` : 'Hero portrait'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top"
        />

        {/* Subtle 2D shoulder cloak & crown trim overlay reflecting outfit & hairstyle cosmetics */}
        {(outfitItem || hairItem) && (
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {hairItem && (hairItem.patternTag === 'circlet' || hairItem.patternTag === 'astral') && (
              <path
                d="M34 15 L50 8 L66 15"
                fill="none"
                stroke={hairItem.accentHex}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            )}
            {outfitItem && (
              <>
                <path
                  d="M0 94 Q25 81 50 88 Q75 81 100 94 L100 100 L0 100 Z"
                  fill={outfitItem.primaryHex}
                  opacity="0.72"
                />
                <path
                  d="M4 93 Q26 82 50 89 Q74 82 96 93"
                  fill="none"
                  stroke={outfitItem.accentHex}
                  strokeWidth="1.6"
                  opacity="0.88"
                />
              </>
            )}
          </svg>
        )}

        {/* Corner filigree markers matching frame aesthetic */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path d="M5 18 V5 H18" fill="none" stroke={frameColor} strokeWidth="2" opacity="0.85" />
          <path d="M82 5 H95 V18" fill="none" stroke={frameColor} strokeWidth="2" opacity="0.85" />
          <path d="M5 82 V95 H18" fill="none" stroke={frameColor} strokeWidth="2" opacity="0.85" />
          <path d="M82 95 H95 V82" fill="none" stroke={frameColor} strokeWidth="2" opacity="0.85" />
        </svg>
      </div>

      {romanTier && (
        <span
          title={`Prestige Tier ${romanTier}`}
          className="absolute -top-2 -left-2 z-20 px-1.5 py-0.5 rounded-md bg-[#141420] border border-[#D6A84B]/70 font-['Cinzel'] font-black text-[10px] text-[#D6A84B] shadow-[0_0_12px_rgba(214,168,75,0.35)] tabular-nums"
        >
          {romanTier}
        </span>
      )}

      {presenceStatus && (
        <PresenceBadge
          status={presenceStatus}
          size={dims.badge}
          className="absolute -bottom-1 -right-1 z-20"
        />
      )}
    </div>
  );
};

interface CollectibleCardArtworkProps {
  card: CollectibleCardDef;
  size?: 'sm' | 'md' | 'lg';
}

export const CollectibleCardArtwork: React.FC<CollectibleCardArtworkProps> = ({
  card,
  size = 'md',
}) => {
  const h = size === 'sm' ? 'h-20' : size === 'lg' ? 'h-44' : 'h-32';
  const renderMotif = () => {
    switch (card.motif) {
      case 'crown':
        return (
          <path
            d="M26 68 L32 34 L48 50 L60 26 L72 50 L88 34 L94 68 Z M26 74 H94"
            fill="none"
            stroke={card.accentHex}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        );
      case 'blade':
        return (
          <g stroke={card.accentHex} strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M60 18 L66 64 L60 72 L54 64 Z" />
            <path d="M44 68 H76" />
            <path d="M60 72 V84" />
          </g>
        );
      case 'shield':
        return (
          <path
            d="M60 20 L86 30 V54 C86 70 72 80 60 86 C48 80 34 70 34 54 V30 Z"
            fill="none"
            stroke={card.accentHex}
            strokeWidth="3"
          />
        );
      case 'flame':
        return (
          <path
            d="M60 20 C74 36 82 50 76 66 C71 78 60 84 60 84 C60 84 44 76 44 58 C44 45 53 34 60 20 Z"
            fill="none"
            stroke={card.accentHex}
            strokeWidth="3"
          />
        );
      case 'canopy':
        return (
          <g stroke={card.accentHex} strokeWidth="2.8" fill="none" strokeLinecap="round">
            <path d="M60 82 V40" />
            <circle cx="60" cy="36" r="18" />
            <path d="M46 60 Q60 50 74 60" />
            <path d="M46 82 H74" />
          </g>
        );
      case 'wave':
        return (
          <g stroke={card.accentHex} strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M24 44 Q42 30 60 44 T96 44" />
            <path d="M24 62 Q42 48 60 62 T96 62" />
          </g>
        );
      case 'titan':
        return (
          <g stroke={card.accentHex} strokeWidth="3" fill="none">
            <polygon points="60,18 88,42 78,80 42,80 32,42" />
            <path d="M44 46 L56 52 M76 46 L64 52 M48 66 H72" />
          </g>
        );
      case 'fist':
        return (
          <g stroke={card.accentHex} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="38" y="34" width="44" height="32" rx="8" />
            <path d="M49 34 V46 M60 34 V46 M71 34 V46" />
            <path d="M46 66 L44 82 H76 L74 66" />
          </g>
        );
      case 'stride':
        return (
          <g stroke={card.accentHex} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M26 70 L50 54 L62 62 L88 30" />
            <path d="M74 30 H88 V44" />
            <path d="M26 78 H92" opacity="0.5" />
          </g>
        );
      case 'star':
      default:
        return (
          <polygon
            points="60,18 68,42 94,42 73,57 81,82 60,67 39,82 47,57 26,42 52,42"
            fill="none"
            stroke={card.accentHex}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
        );
    }
  };

  return (
    <div
      className={`relative w-full ${h} rounded-xl overflow-hidden flex items-center justify-center border`}
      style={{
        borderColor: `${card.accentHex}55`,
        background: `radial-gradient(circle at 50% 35%, ${card.accentHex}26, transparent 62%), linear-gradient(160deg, ${card.primaryHex}, ${card.secondaryHex})`,
      }}
    >
      <svg viewBox="0 0 120 100" className="w-full h-full max-w-[140px]" aria-hidden="true">
        <circle cx="60" cy="50" r="38" fill="none" stroke={card.accentHex} strokeOpacity="0.2" strokeWidth="1" />
        <circle cx="60" cy="50" r="44" fill="none" stroke={card.accentHex} strokeOpacity="0.12" strokeDasharray="4 4" strokeWidth="1" />
        {renderMotif()}
      </svg>
    </div>
  );
};
