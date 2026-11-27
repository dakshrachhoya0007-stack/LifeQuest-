import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Shield } from 'lucide-react';

interface AuthErrorScreenProps {
  message: string;
  onRetryGoogle: () => Promise<{ success: boolean; error?: string }>;
  onBackToLogin: () => void;
}

export const AuthErrorScreen: React.FC<AuthErrorScreenProps> = ({
  message,
  onRetryGoogle,
  onBackToLogin,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetryGoogle = async () => {
    setRetryError(null);
    setIsRetrying(true);
    try {
      const res = await onRetryGoogle();
      if (!res.success) {
        setIsRetrying(false);
        setRetryError(res.error || 'Could not restart Google sign-in.');
      }
    } catch (err: any) {
      setIsRetrying(false);
      setRetryError(err?.message || 'Unable to start Google authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-[#100D18] text-[#F2EDF7] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md lq-card p-6 sm:p-8 border-[#D65C66]/45">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[#E8C777] text-[11px] font-semibold uppercase tracking-widest mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>LIFEQUEST · World of Aetheria</span>
          </div>
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#D65C66]/15 border border-[#D65C66]/50 flex items-center justify-center text-[#D65C66] mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-['Cinzel'] text-[#F2EDF7] tracking-wide">
            Authentication Interrupted
          </h1>
          <p className="text-xs text-[#A69AAF] mt-1">
            We could not finalize your sign-in session.
          </p>
        </div>

        <div className="p-3.5 mb-5 rounded-xl bg-[#D65C66]/12 border border-[#D65C66]/45 text-xs text-[#F2EDF7] leading-relaxed">
          {retryError || message}
        </div>

        <div className="p-3.5 mb-6 rounded-xl bg-[#100D18] border border-[#362B45] text-[11px] text-[#A69AAF] space-y-1.5">
          <div className="font-semibold text-[#E8C777]">What you can do:</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Try signing in with Google again if consent was cancelled or timed out.</li>
            <li>Ensure cookies and storage are enabled in this browser tab.</li>
            <li>Sign in with your realm email and password instead.</li>
          </ul>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleRetryGoogle}
            disabled={isRetrying}
            className="w-full py-2.5 px-4 rounded-xl bg-[#F2EDF7] hover:bg-white disabled:opacity-60 text-[#100D18] font-semibold text-sm shadow flex items-center justify-center gap-2 transition-all"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#100D18]" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <span>Retry with Google</span>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            disabled={isRetrying}
            className="lq-btn lq-btn-secondary w-full py-2.5 px-4 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#E8C777]" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
