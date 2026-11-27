import React, { useState } from 'react';
import { CloudUpload, CheckCircle, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { sound } from '../../utils/audio';
import { RpgModalWrapper } from '../Motion/RpgMotionPrimitives';

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

  const handleConfirmMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      sound.playClick();
      const success = await onMigrate();
      if (!success) {
        setError(
          'Progress transfer could not be completed right now. Please check your connection and try again.'
        );
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
    <RpgModalWrapper isOpen={isOpen} panelClassName="w-full max-w-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-migration-title"
        className="relative w-full lq-card-gold p-6 sm:p-8"
      >
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#7045A0]/25 border border-[#D6A84B]/50 flex items-center justify-center text-[#E8C777] mb-4">
          <CloudUpload className="w-6 h-6" />
        </div>

        <div className="text-center mb-5">
          <h2 id="data-migration-title" className="text-xl font-bold font-['Cinzel'] text-[#F2EDF7]">
            Local Hero Progress Detected
          </h2>
          <p className="text-xs text-[#E8C777] mt-1.5 font-medium">
            Save your device progress to your LifeQuest account
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] mb-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#F2EDF7] font-semibold">
            <Shield className="w-4 h-4 text-[#E8C777]" />
            <span>Detected Local Progress:</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#171220] border border-[#362B45] text-[#A69AAF] font-mono text-[11px]">
            {localSummary || 'Level 1+ Knight with customized character progression & habits.'}
          </div>
          <p className="text-[11px] text-[#A69AAF] leading-relaxed pt-1">
            Transferring will securely link your bodyweight strength, habits, fitness sessions, and
            Aether Rank to your account so you can continue seamlessly across all your devices.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-[#D65C66]/12 border border-[#D65C66]/45 text-xs text-[#F2EDF7] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D65C66] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isMigrating}
            onClick={handleConfirmMigrate}
            className="lq-btn lq-btn-gold w-full py-3 px-4 text-xs sm:text-sm"
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Account...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Save Progress to Account</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isMigrating}
            onClick={onSkip}
            className="lq-btn lq-btn-secondary w-full py-2.5 px-4 text-xs"
          >
            Start Fresh (Skip Transfer)
          </button>
        </div>
      </div>
    </RpgModalWrapper>
  );
};
