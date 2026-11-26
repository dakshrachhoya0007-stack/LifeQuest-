import React from 'react';
import type { PresenceStatus } from '../../types/game';
import { PRESENCE_STATUS_META, normalizePresenceStatus } from '../../utils/presence';

interface PresenceBadgeProps {
  status?: PresenceStatus | string | null;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  status,
  showLabel = false,
  size = 'sm',
  className = '',
}) => {
  const normalized = normalizePresenceStatus(status);
  const meta = PRESENCE_STATUS_META[normalized];
  const dotSize =
    size === 'xs' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  if (!showLabel) {
    return (
      <span
        className={`inline-block rounded-full shrink-0 border border-[#100D1C] ${dotSize} ${className}`}
        style={{
          backgroundColor: meta.dotColor,
          boxShadow: meta.glowShadow,
        }}
        title={meta.label}
        aria-label={`Status: ${meta.label}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
        size === 'xs' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-[11px]'
      } ${className}`}
      style={{ color: meta.textColor }}
    >
      <span
        className={`inline-block rounded-full shrink-0 ${dotSize}`}
        style={{
          backgroundColor: meta.dotColor,
          boxShadow: meta.glowShadow,
        }}
        aria-hidden="true"
      />
      <span>{meta.label}</span>
    </span>
  );
};
