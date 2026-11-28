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
          icon: <Cloud className="w-3.5 h-3.5 text-[#10B981]" />,
          label: 'Saved',
          textColor: 'text-[#10B981]',
          bgColor: 'bg-[#0A1930] border-[#10B981]/40',
          title: `Progress saved (${lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'Up to date'})`,
        };
      case 'saving':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-[#00D9FF] animate-spin" />,
          label: 'Saving...',
          textColor: 'text-[#00D9FF]',
          bgColor: 'bg-[#0A1930] border-[#00D9FF]/45',
          title: 'Saving hero progression...',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#F43F5E]" />,
          label: 'Sync Issue',
          textColor: 'text-[#F43F5E]',
          bgColor: 'bg-[#0A1930] border-[#F43F5E]/45',
          title: 'Unable to sync right now. Click to retry.',
        };
      case 'unconfigured':
      case 'offline':
      default:
        return {
          icon: <CloudOff className="w-3.5 h-3.5 text-[#94A8C7]" />,
          label: 'Offline',
          textColor: 'text-[#94A8C7]',
          bgColor: 'bg-[#0A1930] border-[#1E3A63]',
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
