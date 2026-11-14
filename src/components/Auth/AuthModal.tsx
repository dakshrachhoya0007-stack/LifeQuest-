import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
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
  Database,
  ArrowLeft,
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

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
  onOpenSupabaseConfig,
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

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    clearAuthError();
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogleWithSupabase();
      if (!res.success) {
        setIsGoogleLoading(false);
        setError(res.error || 'Could not start Google sign-in. Verify Supabase Google OAuth provider settings.');
      }
      // On success, browser redirects to Google OAuth consent screen
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

    // 1. Forgot Password Flow
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
          setError(res.error || 'Failed to dispatch password reset email. Verify your email or Supabase Auth settings.');
        }
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'An error occurred during password reset.');
      }
      return;
    }

    // Password validation for login & register
    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    // 2. Register Flow
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

    // 3. Login Flow
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#0f0c1b] border border-purple-900/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/70 max-h-[92vh] overflow-y-auto">
        {canClose && (
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-purple-950/40"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-700/40 text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-3">
            <span>⚔ LIFEQUEST</span>
            <span className="text-purple-500">·</span>
            <span>World of Aetheria</span>
          </div>
          <div className="w-12 h-12 mx-auto rounded-xl bg-purple-900/40 border border-purple-500/50 flex items-center justify-center text-purple-300 mb-3 shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-['Cinzel'] text-slate-100">
            {mode === 'login'
              ? 'SIGN IN TO LIFEQUEST'
              : mode === 'register'
              ? 'ENLIST IN AETHERIA'
              : 'RESTORE PASSKEY'}
          </h2>
          <p className="text-xs text-purple-300/80 mt-1 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Authenticate to access your forged weapons, habits, and quest progress.'
              : mode === 'register'
              ? 'Create a cloud-backed account to build real habits and RPG power.'
              : 'Enter your account email to receive a password recovery dispatch.'}
          </p>
        </div>

        {/* Tab switch for Login / Register */}
        {mode !== 'forgot_password' && (
          <div className="flex p-1 mb-5 bg-[#090712] rounded-xl border border-purple-950">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-purple-800/80 text-white shadow'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-purple-800/80 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3.5 mb-4 text-xs text-emerald-200 bg-emerald-950/70 border border-emerald-700/60 rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 mb-4 text-xs text-rose-200 bg-rose-950/70 border border-rose-800/60 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Continue with Google OAuth (visible in both Sign In and Create Account) */}
        {mode !== 'forgot_password' && (
          <div className="mb-5 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all whitespace-nowrap"
            >
              {isGoogleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
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
              <p className="text-[11px] text-amber-300/80 text-center leading-snug">
                Embedded preview detected: Google OAuth works best in a full browser tab on the published domain.
              </p>
            )}

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-purple-900/70" />
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400">
                or continue with email
              </span>
              <div className="flex-grow border-t border-purple-900/70" />
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hero Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. IronVanguard"
                  className="w-full bg-[#140f26] border border-purple-900/60 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="champion@aetheria.realm"
                className="w-full bg-[#140f26] border border-purple-900/60 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#140f26] border border-purple-900/60 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#140f26] border border-purple-900/60 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auth-terms"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-1 accent-purple-600 rounded"
                />
                <label htmlFor="auth-terms" className="text-[11px] text-slate-400 leading-tight">
                  I agree to the Realm Terms & Privacy Charter (camera video processed strictly locally on-device).
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 font-semibold text-sm rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-violet-800 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-950/80 transition-all font-['Cinzel'] tracking-wider flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                CONNECTING TO REALM...
              </>
            ) : mode === 'login' ? (
              'ENTER THE REALM'
            ) : mode === 'register' ? (
              'START CHARACTER CREATION'
            ) : (
              'SEND RESET LINK'
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
              className="w-full py-2 text-xs text-purple-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          )}
        </form>

        {/* Database Cloud Configuration Link */}
        {onOpenSupabaseConfig && (
          <div className="mt-4 pt-3 border-t border-purple-950/70 text-center">
            <button
              type="button"
              onClick={onOpenSupabaseConfig}
              className="text-[11px] text-slate-400 hover:text-purple-300 inline-flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>
                {isSupabaseConfigured()
                  ? 'Supabase Cloud Connected'
                  : 'Configure Supabase Database'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
