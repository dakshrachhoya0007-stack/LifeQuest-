import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import {
  FEATURE_THEMES,
  FeatureTheme,
  FeatureThemeId,
  resolveFeatureTheme,
} from '../../theme/featureTheme';

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
      className={`rounded-2xl bg-gradient-to-br from-[#102440]/95 via-[#0A1930] to-[#061225] p-5 sm:p-6 transition-all duration-300 ${className}`}
      style={{
        border: `1px solid rgba(${theme.primaryRgb}, 0.38)`,
        backgroundImage: `radial-gradient(ellipse 75% 95% at 15% 0%, rgba(${theme.primaryRgb}, 0.16), transparent 62%), radial-gradient(ellipse 65% 85% at 92% 100%, rgba(${theme.secondaryRgb}, 0.11), transparent 60%)`,
        boxShadow: `0 16px 38px -14px rgba(4, 12, 28, 0.86), 0 0 28px -18px rgba(${theme.primaryRgb}, 0.5)`,
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
      className={`rounded-2xl bg-gradient-to-br from-[#102440]/88 to-[#0A1930]/95 backdrop-blur-md transition-all duration-300 ${className}`}
      style={{
        border: `1px solid rgba(${theme.primaryRgb}, ${highlighted ? 0.58 : 0.24})`,
        boxShadow: highlighted
          ? `0 16px 34px -12px rgba(4, 12, 28, 0.88), 0 0 26px -12px rgba(${theme.primaryRgb}, 0.45)`
          : '0 12px 30px -12px rgba(4, 12, 28, 0.8)',
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
}

export function FeatureTabBar<T extends string>({
  tabs,
  activeId,
  onSelect,
  ariaLabel = 'Section navigation',
  className = '',
  themeId,
}: FeatureTabBarProps<T>) {
  const theme = useActiveFeatureTheme(themeId);
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 rounded-xl bg-[#061225]/92 overflow-x-auto max-w-full ${className}`}
      style={{ border: `1px solid rgba(${theme.primaryRgb}, 0.28)` }}
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
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
            style={
              isActive
                ? {
                    background: `linear-gradient(135deg, ${theme.primaryHex} 0%, rgba(${theme.primaryRgb}, 0.82) 100%)`,
                    color: theme.contrastTextHex,
                    border: `1px solid rgba(${theme.secondaryRgb}, 0.55)`,
                    boxShadow: `0 4px 18px rgba(${theme.primaryRgb}, 0.36)`,
                  }
                : {
                    color: '#94A8C7',
                    border: '1px solid transparent',
                  }
            }
          >
            {Icon && (
              <span
                className="shrink-0 inline-flex"
                style={{ color: isActive ? theme.contrastTextHex : theme.accentTextHex }}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums"
                style={{
                  backgroundColor: isActive ? 'rgba(6, 18, 37, 0.24)' : theme.secondaryHex,
                  color: isActive ? theme.contrastTextHex : '#061225',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
