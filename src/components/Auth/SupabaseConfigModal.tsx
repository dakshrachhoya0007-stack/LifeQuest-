import React, { useState } from 'react';
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
  Terminal,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../../lib/supabase';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#100D1C]/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#24143D]/95 backdrop-blur-xl border border-[#6638B8]/45 rounded-2xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(10,6,20,0.85)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#BEB4D6] hover:text-white rounded-lg hover:bg-[#19122B] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#6638B8]/20 border border-[#FFD978]/45 flex items-center justify-center text-[#FFD978]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black font-['Cinzel'] text-white">
              SUPABASE CLOUD PERSISTENCE
            </h2>
            <p className="text-xs text-[#BEB4D6]">
              Connect your PostgreSQL & Supabase Auth database for cross-device progression
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 mb-5 bg-[#100D1C] rounded-xl border border-[#6638B8]/30">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'credentials'
                ? 'bg-[#6638B8] text-white shadow'
                : 'text-[#BEB4D6] hover:text-white'
            }`}
          >
            Credentials & Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'sql'
                ? 'bg-[#6638B8] text-white shadow'
                : 'text-[#BEB4D6] hover:text-white'
            }`}
          >
            SQL Database Schema
          </button>
        </div>

        {activeTab === 'credentials' ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/35 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isSupabaseConfigured() ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">
                    {isSupabaseConfigured() ? 'Supabase Credentials Configured' : 'Credentials Needed'}
                  </div>
                  <div className="text-[11px] text-[#BEB4D6]">
                    Source: {currentConfig.source === 'env' ? 'Environment Variables (.env)' : currentConfig.source === 'storage' ? 'Custom In-App Storage' : 'Not Configured'}
                  </div>
                </div>
              </div>

              {isSupabaseConfigured() && (
                <button
                  onClick={handleTestExisting}
                  disabled={testing}
                  className="px-3 py-1.5 rounded-lg border border-[#6638B8]/45 bg-[#24143D] text-[#FFD978] hover:border-[#FFD978] text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  Test
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-700 text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">{testResult.message}</div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#BEB4D6] mb-1">
                  Supabase Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-[#19122B] border border-[#6638B8]/35 rounded-xl px-3 py-2 text-xs text-white placeholder-[#BEB4D6]/50 font-mono focus:outline-none focus:border-[#FFD978]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#BEB4D6] mb-1">
                  Supabase Anon Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-[#19122B] border border-[#6638B8]/35 rounded-xl px-3 py-2 text-xs text-white placeholder-[#BEB4D6]/50 font-mono focus:outline-none focus:border-[#FFD978]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6638B8] to-[#A875FF] hover:from-[#7A49CF] hover:to-[#E7B94F] border border-[#FFD978]/45 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(102,56,184,0.4)]"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Save & Verify Connection
                    </>
                  )}
                </button>

                {currentConfig.source === 'storage' && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-2.5 rounded-xl border border-rose-800/60 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            <div className="text-[11px] text-[#BEB4D6] bg-[#19122B] border border-[#6638B8]/25 rounded-xl p-3">
              <span className="font-semibold text-[#FFD978]">Tip:</span> You can also add credentials directly to your{' '}
              <code className="text-amber-300 font-mono">.env</code> file:
              <pre className="mt-1.5 p-2 bg-[#100D1C] rounded border border-[#6638B8]/25 font-mono text-[10px] text-[#BEB4D6]">
                VITE_SUPABASE_URL="https://your-project.supabase.co"{"\n"}
                VITE_SUPABASE_ANON_KEY="your-anon-key"
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-[#BEB4D6] leading-relaxed">
              Run this SQL script in your Supabase project's{' '}
              <span className="text-[#FFD978] font-semibold">SQL Editor</span> to automatically provision the required tables, Row Level Security policies, and user triggers:
            </div>

            <div className="relative">
              <div className="p-3 bg-[#100D1C] rounded-xl border border-[#6638B8]/35 font-mono text-[10px] text-[#BEB4D6] max-h-60 overflow-y-auto whitespace-pre">
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
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#6638B8]/30 border border-[#6638B8]/50 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied SQL!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#FFD978]" />
                    Copy Full Migration SQL
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[#BEB4D6]">
              <span>SQL file saved locally at <code className="text-[#FFD978] font-mono">/supabase/schema.sql</code></span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[#FFD978] hover:text-white flex items-center gap-1 font-semibold"
              >
                Open Supabase Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
