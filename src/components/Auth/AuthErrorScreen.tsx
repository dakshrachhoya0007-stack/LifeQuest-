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
    <div className="min-h-screen bg-[#100D1C] text-[#FFFFFF] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-[#24143D]/90 backdrop-blur-xl border border-[#F05B70]/45 rounded-2xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(10,6,20,0.85)]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#19122B] border border-[#6638B8]/45 text-[#FFD978] text-[10px] font-bold uppercase tracking-widest mb-3">
            <Shield className="w-3 h-3" />
            <span>LIFEQUEST · World of Aetheria</span>
          </div>
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center text-rose-300 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black font-['Cinzel'] text-[#FFFFFF] tracking-wide">
            AUTHENTICATION INTERRUPTED
          </h1>
          <p className="text-xs text-[#BEB4D6] mt-1">
            We could not finalize your sign-in session.
          </p>
        </div>

        <div className="p-3.5 mb-5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-200 leading-relaxed">
          {retryError || message}
        </div>

        <div className="p-3.5 mb-6 rounded-xl bg-[#19122B] border border-[#6638B8]/30 text-[11px] text-[#BEB4D6] space-y-1.5">
          <div className="font-semibold text-[#FFD978]">What you can do:</div>
          <ul className="list-disc pl-4 space-y-1 text-[#BEB4D6]">
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
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold text-sm shadow flex items-center justify-center gap-2 transition-all"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
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
            className="w-full py-2.5 px-4 rounded-xl bg-[#19122B] hover:bg-[#6638B8]/25 border border-[#6638B8]/45 hover:border-[#FFD978]/70 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FFD978]" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
