import { createClient } from '@supabase/supabase-js';

// These are the project's PUBLIC values (the publishable key is meant to ship
// in the browser bundle; row-level security protects the data). Env vars
// override them, so hosts like Vercel need no extra setup.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wemanujxeaxkhixcohca.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bkfPaldi_ZKdcX-_5hMkFA_9sdNm3Xb';

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error('Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
