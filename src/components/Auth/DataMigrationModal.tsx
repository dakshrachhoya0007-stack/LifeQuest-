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
        setError('Progress transfer could not be completed right now. Please check your connection and try again.');
        setIsMigrating(false);
      } else {
        sound.playVictory();
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred while saving progress to your account.');
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061225]/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#102440]/95 backdrop-blur-xl border border-[#FFD978]/45 rounded-2xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(4,12,28,0.85)]">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#1677FF]/25 border border-[#FFD978]/50 flex items-center justify-center text-[#FFD978] mb-4 shadow-[0_0_20px_rgba(231,185,79,0.25)]">
          <CloudUpload className="w-6 h-6 animate-pulse" />
        </div>

        <div className="text-center mb-5">
          <h2 className="text-xl font-black font-['Cinzel'] text-white">
            LOCAL HERO PROGRESS DETECTED
          </h2>
          <p className="text-xs text-[#FFD978] mt-1.5 font-medium">
            Save your device progress to your LifeQuest account
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 mb-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Shield className="w-4 h-4 text-[#FFD978]" />
            Detected Local Progress:
          </div>
          <div className="p-2.5 rounded-lg bg-[#061225] border border-[#1677FF]/25 text-[#94A8C7] font-mono text-[11px]">
            {localSummary || 'Level 1+ Knight with customized character progression & habits.'}
          </div>
          <p className="text-[11px] text-[#94A8C7] leading-relaxed pt-1">
            Transferring will securely link your bodyweight strength, habits, fitness sessions, and Aether Rank to your account so you can continue seamlessly across all your devices.
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
            className="w-full py-3 px-4 rounded-xl font-bold font-['Cinzel'] tracking-wider text-xs sm:text-sm bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 border border-[#FFD978]/45 text-white shadow-[0_6px_22px_rgba(22,119,255,0.45)] hover:shadow-[0_0_24px_rgba(255,217,120,0.45)] transition-all flex items-center justify-center gap-2"
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                SAVING TO ACCOUNT...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-[#FFD978]" />
                SAVE PROGRESS TO ACCOUNT
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isMigrating}
            onClick={onSkip}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-[#94A8C7] hover:text-white bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/25 transition-all"
          >
            Start Fresh (Skip Transfer)
          </button>
        </div>
      </div>
    </div>
  );
};
