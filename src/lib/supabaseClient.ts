import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info.tsx';

// Construct Supabase URL from project ID
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && projectId);

// Create Supabase client with session persistence
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'mnemosyne_supabase_auth',
      }
    })
  : null;

// Helper function to check if Supabase is ready
export const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please check your Supabase credentials.'
    );
  }
  return supabase;
};

// Helper to get current auth session
export const getCurrentSession = async () => {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
};

// Helper to sign in and create Supabase auth session
export const createAuthSession = async (email: string, userId: string, userRole: string) => {
  if (!supabase) return null;
  
  // Store session metadata
  const sessionData = {
    user_id: userId,
    email: email,
    role: userRole,
    created_at: new Date().toISOString(),
  };
  
  localStorage.setItem('mnemosyne_auth_metadata', JSON.stringify(sessionData));
  
  console.log('✅ [Supabase] Auth metadata stored for', userRole);
  return sessionData;
};