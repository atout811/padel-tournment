import { supabase } from './supabaseClient';
import { getOrCreateUserId } from './storage';

const getRedirectUrl = () => {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
};

export const isAuthAvailable = () => Boolean(supabase);

export const getAuthSession = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Failed to load session: ${error.message}`);
  return data.session || null;
};

export const onAuthStateChanged = (handler) => {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session));
  return () => data.subscription.unsubscribe();
};

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
    },
  });
  if (error) throw new Error(error.message);
};

export const signInWithEmail = async ({ email, password }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
};

export const signUpWithEmail = async ({ email, password }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });
  if (error) throw new Error(error.message);
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

export const claimLegacyOwnerData = async (authUserId) => {
  if (!supabase || !authUserId) return;

  const legacyOwnerId = getOrCreateUserId();
  if (legacyOwnerId === authUserId) return;

  const timestamp = new Date().toISOString();

  const { error: groupsError } = await supabase
    .from('padel_groups')
    .update({ owner_id: authUserId, updated_at: timestamp })
    .eq('owner_id', legacyOwnerId);

  if (groupsError) throw new Error(`Failed to claim groups: ${groupsError.message}`);

  const { data: tournaments, error: tournamentsError } = await supabase
    .from('tournaments')
    .select('id, data')
    .eq('owner_id', legacyOwnerId);

  if (tournamentsError) throw new Error(`Failed to load legacy tournaments: ${tournamentsError.message}`);

  for (const tournament of tournaments || []) {
    const nextData = tournament.data ? { ...tournament.data, ownerId: authUserId } : tournament.data;
    const { error } = await supabase
      .from('tournaments')
      .update({ owner_id: authUserId, data: nextData, updated_at: timestamp })
      .eq('id', tournament.id);

    if (error) throw new Error(`Failed to claim tournament: ${error.message}`);
  }
};
