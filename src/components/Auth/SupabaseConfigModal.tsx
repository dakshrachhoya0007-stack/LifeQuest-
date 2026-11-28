import React, { useEffect, useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../../lib/supabase';
import { RpgModalWrapper } from '../Motion/RpgMotionPrimitives';
import { FeatureTabBar } from '../Theme/FeatureThemePrimitives';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both the Supabase URL and the Anon public key.',
      });
      return;
    }

    saveSupabaseConfig(url.trim(), anonKey.trim());
    setTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection();
    setTesting(false);
    setTestResult(res);

    if (res.success && onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const handleTestExisting = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTesting(false);
    setTestResult(res);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({
      success: false,
      message: 'Cleared custom Supabase configuration. Reverting to environment variables.',
    });
    if (onConfigUpdated) onConfigUpdated();
  };

  const copyMigrationSql = () => {
    const sql = `-- LIFEQUEST SUPABASE SCHEMA
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  game_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  logged_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own game state" ON public.game_states FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game state" ON public.game_states FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own game state" ON public.game_states FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own workouts" ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own nutrition" ON public.nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition" ON public.nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own habit logs" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <RpgModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass="z-[60]"
      panelClassName="w-full max-w-xl"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supabase-config-title"
        className="relative w-full lq-card-gold p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Supabase configuration modal"
          className="absolute top-4 right-4 p-2 text-[#94A8C7] hover:text-[#F2F7FF] rounded-lg hover:bg-[#102440] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1677FF]/25 border border-[#00D9FF]/45 flex items-center justify-center text-[#38D9F5]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="supabase-config-title"
              className="text-xl font-bold font-['Cinzel'] text-[#F2F7FF]"
            >
              Supabase Cloud Persistence
            </h2>
            <p className="text-xs text-[#94A8C7]">
              Connect your PostgreSQL &amp; Supabase Auth database for cross-device progression
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mb-5">
          <FeatureTabBar
            themeId="dashboard"
            layoutId="supabase-config-tab-pill"
            ariaLabel="Supabase configuration tabs"
            activeId={activeTab}
            onSelect={setActiveTab}
            tabs={[
              { id: 'credentials', label: 'Credentials & Status' },
              { id: 'sql', label: 'SQL Database Schema' },
            ]}
          />
        </div>

        {activeTab === 'credentials' ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isSupabaseConfigured() ? (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[#FBBF24] shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-[#F2F7FF]">
                    {isSupabaseConfigured()
                      ? 'Supabase Credentials Configured'
                      : 'Credentials Needed'}
                  </div>
                  <div className="text-[11px] text-[#94A8C7]">
                    Source:{' '}
                    {currentConfig.source === 'env'
                      ? 'Environment Variables (.env)'
                      : currentConfig.source === 'storage'
                      ? 'Custom In-App Storage'
                      : 'Not Configured'}
                  </div>
                </div>
              </div>

              {isSupabaseConfigured() && (
                <button
                  type="button"
                  onClick={handleTestExisting}
                  disabled={testing}
                  className="lq-btn lq-btn-secondary px-3 py-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>Test</span>
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-[#10B981]/12 border-[#10B981]/45 text-[#F2F7FF]'
                    : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F2F7FF]'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">{testResult.message}</div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                  Supabase Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="lq-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                  Supabase Anon Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="lq-input font-mono text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="lq-btn lq-btn-gold flex-1 py-2.5 text-xs"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save &amp; Verify Connection</span>
                    </>
                  )}
                </button>

                {currentConfig.source === 'storage' && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="lq-btn lq-btn-danger px-3 py-2.5 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            <div className="text-[11px] text-[#94A8C7] bg-[#061225] border border-[#1E3A63] rounded-xl p-3">
              <span className="font-semibold text-[#38D9F5]">Tip:</span> You can also add
              credentials directly to your{' '}
              <code className="text-[#38D9F5] font-mono">.env</code> file:
              <pre className="mt-1.5 p-2 bg-[#0A1930] rounded border border-[#1E3A63] font-mono text-[10px] text-[#94A8C7] overflow-x-auto">
                VITE_SUPABASE_URL=&quot;https://your-project.supabase.co&quot;{'\n'}
                VITE_SUPABASE_ANON_KEY=&quot;your-anon-key&quot;
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-[#94A8C7] leading-relaxed">
              Run this SQL script in your Supabase project&apos;s{' '}
              <span className="text-[#38D9F5] font-semibold">SQL Editor</span> to automatically
              provision the required tables, Row Level Security policies, and user triggers:
            </div>

            <div className="relative">
              <div className="p-3 bg-[#061225] rounded-xl border border-[#1E3A63] font-mono text-[10px] text-[#94A8C7] max-h-60 overflow-y-auto whitespace-pre">
                {`-- LIFEQUEST CLOUD SCHEMA TABLES
1. profiles (id, username, avatar_url, updated_at)
2. game_states (id, user_id, game_data JSONB, updated_at)
3. workout_sessions (id, user_id, workout_data JSONB)
4. nutrition_logs (id, user_id, meal_data JSONB)
5. habit_logs (id, user_id, habit_data JSONB)

-- Row Level Security (RLS) enabled on all tables
-- Auto-created profile trigger on auth.users`}
              </div>

              <button
                type="button"
                onClick={copyMigrationSql}
                className="lq-btn lq-btn-secondary absolute top-2 right-2 px-3 py-1.5 text-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Copied SQL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#38D9F5]" />
                    <span>Copy Full Migration SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[#94A8C7]">
              <span>
                SQL file saved locally at{' '}
                <code className="text-[#38D9F5] font-mono">/supabase/schema.sql</code>
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[#38D9F5] hover:text-[#F2F7FF] flex items-center gap-1 font-semibold"
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </RpgModalWrapper>
  );
};
