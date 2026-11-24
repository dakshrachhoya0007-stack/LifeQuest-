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
          icon: <Cloud className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Saved',
          textColor: 'text-emerald-300',
          bgColor: 'bg-emerald-950/40 border-emerald-700/50',
          title: `Progress saved (${lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'Up to date'})`,
        };
      case 'saving':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
          label: 'Saving...',
          textColor: 'text-amber-300',
          bgColor: 'bg-amber-950/40 border-amber-700/50',
          title: 'Saving hero progression...',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Sync Issue',
          textColor: 'text-rose-300',
          bgColor: 'bg-rose-950/40 border-rose-700/50',
          title: 'Unable to sync right now. Click to retry.',
        };
      case 'unconfigured':
      case 'offline':
      default:
        return {
          icon: <CloudOff className="w-3.5 h-3.5 text-[#A1A1B8]" />,
          label: 'Offline',
          textColor: 'text-[#A1A1B8]',
          bgColor: 'bg-[#141420] border-[#8B5CF6]/30',
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
