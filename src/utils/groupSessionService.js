import { supabase } from './supabaseClient';
import { GROUP_SESSIONS_STORAGE_KEY } from './groupStorageKeys';
import { createUuid } from './storage';

export { GROUP_SESSIONS_STORAGE_KEY };

const nowIso = () => new Date().toISOString();

const loadLocalSessions = () => {
  try {
    return JSON.parse(localStorage.getItem(GROUP_SESSIONS_STORAGE_KEY) || '[]');
  } catch (error) {
    console.error('Error loading group sessions:', error);
    return [];
  }
};

const saveLocalSessions = (sessions) => {
  localStorage.setItem(GROUP_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
};

const fromRow = (row) => ({
  id: row.id,
  groupId: row.group_id,
  tournamentId: row.tournament_id,
  participantMeta: row.participant_meta || [],
  statsApplied: row.stats_applied || false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createGroupSession = async ({ groupId, participantMeta }) => {
  const timestamp = nowIso();
  const session = { id: createUuid(), groupId, tournamentId: null, participantMeta, statsApplied: false, createdAt: timestamp, updatedAt: timestamp };

  if (!supabase) {
    saveLocalSessions([session, ...loadLocalSessions()]);
    return session;
  }

  const { data, error } = await supabase
    .from('group_sessions')
    .insert({
      id: session.id,
      group_id: groupId,
      tournament_id: null,
      participant_meta: participantMeta,
      stats_applied: false,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create group session: ${error.message}`);
  return fromRow(data);
};

export const linkGroupSessionTournament = async (sessionId, tournamentId) => {
  const timestamp = nowIso();

  if (!supabase) {
    const sessions = loadLocalSessions();
    saveLocalSessions(sessions.map((session) => (session.id === sessionId ? { ...session, tournamentId, updatedAt: timestamp } : session)));
    return;
  }

  const { error } = await supabase
    .from('group_sessions')
    .update({ tournament_id: tournamentId, updated_at: timestamp })
    .eq('id', sessionId)
    .select('id')
    .single();
  if (error) throw new Error(`Failed to link group session: ${error.message}`);
};
