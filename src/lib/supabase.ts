import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const STORAGE_KEY_URL = 'lifequest_supabase_url';
const STORAGE_KEY_ANON_KEY = 'lifequest_supabase_anon_key';

let cachedClient: SupabaseClient<Database> | null = null;
let currentConfiguredUrl = '';
let currentConfiguredKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'storage' | 'none';
}

/**
 * Retrieves the currently active Supabase configuration from environment variables
 * or saved custom credentials.
 */
export const getSupabaseConfig = (): SupabaseConfig => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey && !envUrl.includes('your-project-id') && !envKey.includes('your-anon-key')) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
    };
  }

  try {
    const storedUrl = localStorage.getItem(STORAGE_KEY_URL)?.trim();
    const storedKey = localStorage.getItem(STORAGE_KEY_ANON_KEY)?.trim();
    if (storedUrl && storedKey) {
      return {
        url: storedUrl,
        anonKey: storedKey,
        source: 'storage',
      };
    }
  } catch (e) {
    console.warn('Could not read custom Supabase config from storage:', e);
  }

  return {
    url: envUrl || '',
    anonKey: envKey || '',
    source: 'none',
  };
};

/**
 * Checks if valid Supabase configuration is present.
 */
export const isSupabaseConfigured = (): boolean => {
  const config = getSupabaseConfig();
  return Boolean(
    config.url &&
    config.anonKey &&
    config.url.startsWith('https://') &&
    config.anonKey.length > 20
  );
};

/**
 * Saves custom Supabase credentials to allow immediate live testing
 * without requiring environment rebuild.
 */
export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();
  localStorage.setItem(STORAGE_KEY_URL, trimmedUrl);
  localStorage.setItem(STORAGE_KEY_ANON_KEY, trimmedKey);
  cachedClient = null; // Invalidate cached client to force re-instantiation
};

/**
 * Clears custom saved Supabase credentials.
 */
export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON_KEY);
  cachedClient = null;
};

/**
 * Returns the active Supabase client instance, or null if not yet configured.
 */
export const getSupabase = (): SupabaseClient<Database> | null => {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !isSupabaseConfigured()) {
    return null;
  }

  if (cachedClient && currentConfiguredUrl === config.url && currentConfiguredKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    currentConfiguredUrl = config.url;
    currentConfiguredKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

/**
 * Tests connection to Supabase Auth & public schema.
 */
export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase credentials are not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Test Auth endpoint
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        success: false,
        message: `Auth check failed: ${sessionError.message}`,
        details: sessionError,
      };
    }

    // 2. Test database query on profiles table (or check if accessible)
    const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
    
    // Note: If no rows exist or RLS denies anon read, an error like PGRST116 or empty array is normal.
    // If table doesn't exist, code is 42P01.
    if (dbError && dbError.code === '42P01') {
      return {
        success: false,
        message: 'Connected to Supabase, but the database tables have not been created yet. Execute the SQL schema migration!',
        details: dbError,
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase Cloud and verified database tables!',
      details: sessionData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || 'Unknown network error'}`,
      details: err,
    };
  }
};
