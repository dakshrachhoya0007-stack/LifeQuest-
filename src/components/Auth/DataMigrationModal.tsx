import React, { useState } from 'react';
import { CloudUpload, CheckCircle, ArrowRight, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { sound } from '../../utils/audio';

interface DataMigrationModalProps {
  isOpen: boolean;
  localSummary: string;
  onMigrate: () => Promise<boolean>;
  onSkip: () => void;
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  localSummary,
  onMigrate,
  onSkip,
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      sound.playClick();
      const success = await onMigrate();
      if (!success) {
        setError('Migration could not be verified by Supabase Cloud. Check your network or permissions.');
        setIsMigrating(false);
      } else {
        sound.playVictory();
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred while migrating data to the cloud.');
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0f0c1b] border border-amber-600/70 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-950/50">
        <div className="w-12 h-12 mx-auto rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
          <CloudUpload className="w-6 h-6 animate-pulse" />
        </div>

        <div className="text-center mb-5">
          <h2 className="text-xl font-black font-['Cinzel'] text-white">
            LOCAL HERO PROGRESS DETECTED
          </h2>
          <p className="text-xs text-amber-300/90 mt-1.5 font-medium">
            Migrate your device progress to your persistent Supabase Cloud account
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#140f26] border border-purple-900/60 mb-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Shield className="w-4 h-4 text-purple-400" />
            Detected Local Progress:
          </div>
          <div className="p-2.5 rounded-lg bg-black/50 border border-purple-950 text-purple-200 font-mono text-[11px]">
            {localSummary || 'Level 1+ Knight with customized character progression & habits.'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Migrating will upload your forged weapons, habits, fitness sessions, and Aether Rank to your secure cloud database. You will then be able to access your character seamlessly across all your phones and computers.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isMigrating}
            onClick={handleConfirmMigrate}
            className="w-full py-3 px-4 rounded-xl font-bold font-['Cinzel'] tracking-wider text-xs sm:text-sm bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/80 transition-all flex items-center justify-center gap-2"
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                MIGRATING TO SUPABASE...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                MIGRATE LOCAL PROGRESS TO CLOUD
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isMigrating}
            onClick={onSkip}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-purple-950/30 transition-colors"
          >
            Start with Fresh Cloud Knight (Skip Migration)
          </button>
        </div>
      </div>
    </div>
  );
};
