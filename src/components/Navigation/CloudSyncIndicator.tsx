import React from 'react';
import { Cloud, CloudCheck, CloudOff, RefreshCw, AlertCircle, Database } from 'lucide-react';

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
          label: 'Cloud Saved',
          textColor: 'text-emerald-300',
          bgColor: 'bg-emerald-950/40 border-emerald-700/50',
          title: `All changes saved to Supabase Cloud (${lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'Up to date'})`,
        };
      case 'saving':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
          label: 'Syncing...',
          textColor: 'text-amber-300',
          bgColor: 'bg-amber-950/40 border-amber-700/50',
          title: 'Syncing hero progression to Supabase...',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Sync Error',
          textColor: 'text-rose-300',
          bgColor: 'bg-rose-950/40 border-rose-700/50',
          title: 'Failed to sync with Supabase Cloud. Click to view configuration and retry.',
        };
      case 'unconfigured':
        return {
          icon: <Database className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Setup Cloud',
          textColor: 'text-purple-300',
          bgColor: 'bg-purple-950/40 border-purple-700/50',
          title: 'Supabase credentials not configured. Click to connect your cloud database.',
        };
      case 'offline':
      default:
        return {
          icon: <CloudOff className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Local Mode',
          textColor: 'text-slate-400',
          bgColor: 'bg-slate-900/60 border-slate-700/40',
          title: 'Running in local persistence mode.',
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
