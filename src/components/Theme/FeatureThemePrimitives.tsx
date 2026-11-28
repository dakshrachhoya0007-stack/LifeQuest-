import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import {
  FEATURE_THEMES,
  FeatureTheme,
  FeatureThemeId,
  resolveFeatureTheme,
} from '../../theme/featureTheme';
import { LQ_EASE } from '../Motion/RpgMotionPrimitives';

export function useActiveFeatureTheme(explicitId?: FeatureThemeId): FeatureTheme {
  const {
    activeTab,
    progressionSubTab,
    socialSubTab,
    characterSubTab,
    storeSubTab,
    eventsSubTab,
    guildsSubTab,
  } = useGame();

  return useMemo(() => {
    if (explicitId) return FEATURE_THEMES[explicitId];
    return resolveFeatureTheme({
      activeTab,
      progressionSubTab,
      socialSubTab,
      characterSubTab,
      storeSubTab,
      eventsSubTab,
      guildsSubTab,
    });
  }, [
    explicitId,
    activeTab,
    progressionSubTab,
    socialSubTab,
    characterSubTab,
    storeSubTab,
    eventsSubTab,
    guildsSubTab,
  ]);
}

interface FeatureBannerProps {
  children: React.ReactNode;
  className?: string;
  themeId?: FeatureThemeId;
  'data-tutorial-id'?: string;
}

export const FeatureBanner: React.FC<FeatureBannerProps> = ({
  children,
  className = '',
  themeId,
  ...rest
}) => {
  const theme = useActiveFeatureTheme(themeId);
  return (
    <div
      {...rest}
      className={`rounded-2xl bg-[#0A1930] p-5 sm:p-6 transition-colors duration-200 ${className}`}
      style={{
        border: `1px solid rgba(${theme.primaryRgb}, 0.34)`,
        backgroundImage: `radial-gradient(ellipse 75% 95% at 12% 0%, rgba(${theme.primaryRgb}, 0.16), transparent 62%), radial-gradient(ellipse 65% 85% at 92% 100%, rgba(${theme.secondaryRgb}, 0.10), transparent 60%)`,
        boxShadow: '0 16px 38px -14px rgba(2, 8, 20, 0.88), inset 0 1px 0 rgba(242, 247, 255, 0.06)',
      }}
    >
      {children}
    </div>
  );
};

interface FeatureSurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  themeId?: FeatureThemeId;
  highlighted?: boolean;
}

export const FeatureSurfaceCard: React.FC<FeatureSurfaceCardProps> = ({
  children,
  className = '',
  themeId,
  highlighted = false,
}) => {
  const theme = useActiveFeatureTheme(themeId);
  return (
    <div
      className={`rounded-2xl bg-[#0A1930] transition-all duration-200 ${className}`}
      style={{
        border: `1px solid rgba(${theme.primaryRgb}, ${highlighted ? 0.56 : 0.28})`,
        boxShadow: highlighted
          ? `0 16px 34px -14px rgba(2, 8, 20, 0.9), 0 0 22px -12px rgba(${theme.primaryRgb}, 0.42)`
          : '0 12px 30px -14px rgba(2, 8, 20, 0.84)',
      }}
    >
      {children}
    </div>
  );
};

export interface FeatureTabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface FeatureTabBarProps<T extends string> {
  tabs: FeatureTabOption<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  ariaLabel?: string;
  className?: string;
  themeId?: FeatureThemeId;
  layoutId?: string;
}

export function FeatureTabBar<T extends string>({
  tabs,
  activeId,
  onSelect,
  ariaLabel = 'Section navigation',
  className = '',
  themeId,
  layoutId = 'feature-tab-pill',
}: FeatureTabBarProps<T>) {
  const theme = useActiveFeatureTheme(themeId);
  const prefersReduced = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap sm:flex-nowrap items-center gap-1 p-1.5 rounded-xl bg-[#061225] border border-[#1E3A63] overflow-x-auto max-w-full ${className}`}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelect(tab.id)}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              color: isActive ? '#F2F7FF' : '#94A8C7',
            }}
          >
            {isActive && (
              <motion.span
                layoutId={prefersReduced ? undefined : layoutId}
                transition={{ duration: 0.22, ease: LQ_EASE }}
                aria-hidden="true"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#1677FF] to-[#0099FF] border border-[#00D9FF]/45 shadow-[0_4px_16px_rgba(22,119,255,0.45)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {Icon && (
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#00D9FF]' : 'text-[#94A8C7]'
                  }`}
                />
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums"
                  style={{
                    backgroundColor: isActive ? '#061225' : theme.secondaryHex,
                    color: isActive ? '#00D9FF' : '#061225',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
