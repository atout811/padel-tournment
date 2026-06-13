import { createClient } from '@supabase/supabase-js';
import { getOrCreateUserId } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
} else {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-owner-id': getOrCreateUserId(),
      },
    },
  });
}

export const supabase = client;

export const getCurrentOwnerId = async () => {
  if (!supabase) return getOrCreateUserId();

  const { data, error } = await supabase.auth.getUser();
  if (!error && data?.user?.id) return data.user.id;

  return getOrCreateUserId();
};
