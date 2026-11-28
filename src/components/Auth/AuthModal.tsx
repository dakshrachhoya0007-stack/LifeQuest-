import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { RpgModalWrapper } from '../Motion/RpgMotionPrimitives';
import {
  X,
  Shield,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  canClose?: boolean;
  onClose: () => void;
  onSuccessRegister: () => void;
  onOpenSupabaseConfig?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  canClose = true,
  onClose,
  onSuccessRegister,
}) => {
  const {
    loginWithSupabase,
    loginWithGoogleWithSupabase,
    registerWithSupabase,
    resetPasswordWithSupabase,
    authError,
    clearAuthError,
  } = useGame();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    setMode(initialMode);
    setError(authError || null);
    setSuccessMessage(null);
  }, [initialMode, isOpen, authError]);

  useEffect(() => {
    if (!isOpen || !canClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, canClose, onClose]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    clearAuthError();
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogleWithSupabase();
      if (!res.success) {
        setIsGoogleLoading(false);
        setError(res.error || 'Could not start Google sign-in. Please try again in a moment.');
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setError(err?.message || 'Unable to connect to Google authentication.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid realm email address.');
      return;
    }

    if (mode === 'forgot_password') {
      setIsSubmitting(true);
      try {
        const res = await resetPasswordWithSupabase(email.trim());
        setIsSubmitting(false);
        if (res.success) {
          setSuccessMessage(
            'Password reset link has been dispatched to your email! Please check your inbox and follow the instructions to restore your account.'
          );
        } else {
          setError(
            res.error ||
              'Could not send password reset email. Please verify your email address and try again.'
          );
        }
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'An error occurred during password reset.');
      }
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (mode === 'register') {
      if (!username.trim()) {
        setError('Please choose a hero username for your champion.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter them carefully.');
        return;
      }
      if (!agreeTerms) {
        setError('Please accept the Realm Terms and Privacy Charter to proceed.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await registerWithSupabase({
          email: email.trim(),
          password,
          username: username.trim(),
        });
        setIsSubmitting(false);

        if (res.success) {
          if (res.requiresEmailConfirmation) {
            setSuccessMessage(
              'Your LifeQuest account was created! An email verification link has been sent to ' +
                email +
                '. Confirm your email to finalize activation, or log in if confirmation is disabled.'
            );
          } else {
            onSuccessRegister();
            onClose();
          }
        } else {
          setError(res.error || 'Registration failed. Please check credentials and try again.');
        }
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'Registration failed due to a network error.');
      }
      return;
    }

    if (mode === 'login') {
      setIsSubmitting(true);
      try {
        const res = await loginWithSupabase(email.trim(), password);
        setIsSubmitting(false);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'Invalid realm email or password.');
        }
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'Login failed. Please check your network connection.');
      }
    }
  };

  return (
    <RpgModalWrapper
      isOpen={isOpen}
      onClose={canClose ? onClose : undefined}
      panelClassName="w-full max-w-md"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full lq-card-gold p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
      >
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 p-2 text-[#94A8C7] hover:text-[#F2F7FF] rounded-lg hover:bg-[#102440] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[#38D9F5] text-[11px] font-semibold uppercase tracking-widest mb-3">
            <GoldenWorldTreeEmblem className="w-4 h-4" />
            <span className="font-['Cinzel'] text-[#F2F7FF]">LIFEQUEST</span>
            <span aria-hidden="true" className="text-[#647A9E]">·</span>
            <span>World of Aetheria</span>
          </div>
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#1677FF]/25 border border-[#00D9FF]/50 flex items-center justify-center text-[#38D9F5] mb-3 shadow-[0_8px_20px_rgba(22,119,255,0.3)]">
            <Shield className="w-6 h-6" />
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl sm:text-2xl font-bold font-['Cinzel'] text-[#F2F7FF]"
          >
            {mode === 'login'
              ? 'Sign In to LifeQuest'
              : mode === 'register'
              ? 'Enlist in Aetheria'
              : 'Restore Passkey'}
          </h2>
          <p className="text-xs text-[#94A8C7] mt-1 max-w-xs mx-auto leading-relaxed">
            {mode === 'login'
              ? 'Authenticate to access your training, habits, and quest progress.'
              : mode === 'register'
              ? 'Create your adventurer account to save habits, workouts, and realm progress.'
              : 'Enter your account email to receive a password recovery dispatch.'}
          </p>
        </div>

        {/* Tab switch for Login / Register */}
        {mode !== 'forgot_password' && (
          <div className="flex p-1 mb-5 bg-[#061225] rounded-xl border border-[#1E3A63]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-[#1677FF] text-[#F2F7FF] border border-[#00D9FF]/35 shadow-[0_4px_12px_rgba(22,119,255,0.4)]'
                  : 'text-[#94A8C7] hover:text-[#F2F7FF]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-[#1677FF] text-[#F2F7FF] border border-[#00D9FF]/35 shadow-[0_4px_12px_rgba(22,119,255,0.4)]'
                  : 'text-[#94A8C7] hover:text-[#F2F7FF]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3.5 mb-4 text-xs text-[#10B981] bg-[#10B981]/12 border border-[#10B981]/45 rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[#F2F7FF]">{successMessage}</div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 mb-4 text-xs text-[#F43F5E] bg-[#F43F5E]/12 border border-[#F43F5E]/45 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[#F2F7FF]">{error}</div>
          </div>
        )}

        {/* Continue with Google OAuth */}
        {mode !== 'forgot_password' && (
          <div className="mb-5 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F2F7FF] hover:bg-white disabled:opacity-60 text-[#061225] font-semibold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all whitespace-nowrap"
            >
              {isGoogleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#061225]" />
                  <span>Redirecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {isInIframe && (
              <p className="text-[11px] text-[#38D9F5]/85 text-center leading-snug">
                Tip: If Google sign-in is blocked in this frame, open the app in a full browser tab.
              </p>
            )}

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#1E3A63]" />
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-[#94A8C7]">
                or continue with email
              </span>
              <div className="flex-grow border-t border-[#1E3A63]" />
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                Hero Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#647A9E] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. IronVanguard"
                  className="lq-input pl-9"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#94A8C7] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#647A9E] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="champion@aetheria.realm"
                className="lq-input pl-9"
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#94A8C7]">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-[#38D9F5] hover:text-[#F2F7FF] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#647A9E] absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="lq-input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#647A9E] hover:text-[#F2F7FF] focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#647A9E] absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="lq-input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-[#647A9E] hover:text-[#F2F7FF] focus:outline-none"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auth-terms"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-1 accent-[#1677FF] rounded"
                />
                <label htmlFor="auth-terms" className="text-[11px] text-[#94A8C7] leading-tight">
                  I agree to the Realm Terms &amp; Privacy Charter (camera video processed strictly
                  locally on-device).
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="lq-btn lq-btn-gold w-full py-3 px-4 text-sm font-['Cinzel'] tracking-wider"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : mode === 'login' ? (
              'Enter the Realm'
            ) : mode === 'register' ? (
              'Start Character Creation'
            ) : (
              'Send Reset Link'
            )}
          </button>

          {mode === 'forgot_password' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full py-2 text-xs text-[#38D9F5] hover:text-[#F2F7FF] flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}
        </form>
      </div>
    </RpgModalWrapper>
  );
};
