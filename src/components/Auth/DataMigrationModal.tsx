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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090910]/88 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#141420]/95 backdrop-blur-xl border border-[#38BDF8]/45 rounded-2xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(9,9,16,0.9)]">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/50 flex items-center justify-center text-[#38BDF8] mb-4 shadow-[0_0_20px_rgba(56,189,248,0.22)]">
          <CloudUpload className="w-6 h-6 animate-pulse" />
        </div>

        <div className="text-center mb-5">
          <h2 className="text-xl font-black font-['Cinzel'] text-white">
            LOCAL HERO PROGRESS DETECTED
          </h2>
          <p className="text-xs text-[#38BDF8] mt-1.5 font-medium">
            Save your device progress to your LifeQuest account
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/35 mb-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Shield className="w-4 h-4 text-[#D6A84B]" />
            Detected Local Progress:
          </div>
          <div className="p-2.5 rounded-lg bg-[#090910] border border-[#8B5CF6]/25 text-[#A1A1B8] font-mono text-[11px]">
            {localSummary || 'Level 1+ Knight with customized character progression & habits.'}
          </div>
          <p className="text-[11px] text-[#A1A1B8] leading-relaxed pt-1">
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
            className="w-full py-3 px-4 rounded-xl font-bold font-['Cinzel'] tracking-wider text-xs sm:text-sm bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#38BDF8] hover:brightness-110 border border-[#38BDF8]/45 text-white shadow-[0_6px_22px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2"
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                SAVING TO ACCOUNT...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-[#34D399]" />
                SAVE PROGRESS TO ACCOUNT
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isMigrating}
            onClick={onSkip}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-[#A1A1B8] hover:text-white bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/25 transition-all"
          >
            Start Fresh (Skip Transfer)
          </button>
        </div>
      </div>
    </div>
  );
};
