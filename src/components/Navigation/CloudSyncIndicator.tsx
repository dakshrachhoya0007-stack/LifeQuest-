import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';

export type CloudSyncStatus = 'saved' | 'saving' | 'error' | 'offline' | 'unconfigured';

interface CloudSyncIndicatorProps {
  status: CloudSyncStatus;
  lastSavedAt?: Date | null;
  onClickConfig: () => void;
  onRetrySave?: () => void;
}

export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({
  status,
  lastSavedAt,
  onClickConfig,
  onRetrySave,
}) => {
  const getBadge = () => {
    switch (status) {
      case 'saved':
        return {
          icon: <Cloud className="w-3.5 h-3.5 text-[#49B88A]" />,
          label: 'Saved',
          textColor: 'text-[#49B88A]',
          bgColor: 'bg-[#171220] border-[#49B88A]/40',
          title: `Progress saved (${lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'Up to date'})`,
        };
      case 'saving':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-[#E8C777] animate-spin" />,
          label: 'Saving...',
          textColor: 'text-[#E8C777]',
          bgColor: 'bg-[#171220] border-[#D6A84B]/45',
          title: 'Saving hero progression...',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#D65C66]" />,
          label: 'Sync Issue',
          textColor: 'text-[#D65C66]',
          bgColor: 'bg-[#171220] border-[#D65C66]/45',
          title: 'Unable to sync right now. Click to retry.',
        };
      case 'unconfigured':
      case 'offline':
      default:
        return {
          icon: <CloudOff className="w-3.5 h-3.5 text-[#A69AAF]" />,
          label: 'Offline',
          textColor: 'text-[#A69AAF]',
          bgColor: 'bg-[#171220] border-[#362B45]',
          title: 'Saving progress locally on this device.',
        };
    }
  };

  const badge = getBadge();

  return (
    <button
      onClick={status === 'error' && onRetrySave ? onRetrySave : onClickConfig}
      title={badge.title}
      className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:brightness-125 focus:outline-none ${badge.bgColor}`}
    >
      {badge.icon}
      <span className={`text-[11px] font-semibold ${badge.textColor}`}>{badge.label}</span>
    </button>
  );
};
