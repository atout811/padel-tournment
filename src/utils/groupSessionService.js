import { supabase } from './supabaseClient';

export const GROUP_SESSIONS_STORAGE_KEY = 'padel-group-sessions-data';

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

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
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createGroupSession = async ({ groupId, participantMeta }) => {
  const timestamp = nowIso();
  const session = { id: createId(), groupId, tournamentId: null, participantMeta, createdAt: timestamp, updatedAt: timestamp };

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

  const { error } = await supabase.from('group_sessions').update({ tournament_id: tournamentId, updated_at: timestamp }).eq('id', sessionId);
  if (error) throw new Error(`Failed to link group session: ${error.message}`);
};
