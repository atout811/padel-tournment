import { supabase } from './supabaseClient';
import { normalizePlayerName } from './tournamentRules';

export const GROUP_PLAYERS_STORAGE_KEY = 'padel-group-players-data';

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const loadLocalPlayers = () => {
  try {
    return JSON.parse(localStorage.getItem(GROUP_PLAYERS_STORAGE_KEY) || '[]');
  } catch (error) {
    console.error('Error loading group players:', error);
    return [];
  }
};

const saveLocalPlayers = (players) => {
  localStorage.setItem(GROUP_PLAYERS_STORAGE_KEY, JSON.stringify(players));
};

const normalizeLevel = (level) => {
  const numericLevel = Number(level);
  if (!Number.isInteger(numericLevel) || numericLevel < 1 || numericLevel > 5) {
    throw new Error('Player level must be from 1 to 5.');
  }
  return numericLevel;
};

const validateName = (name) => {
  const normalizedName = normalizePlayerName(name);
  if (!normalizedName) throw new Error('Player name is required.');
  return normalizedName;
};

const ensureUniqueName = (players, groupId, name, currentPlayerId) => {
  const exists = players.some(
    (player) => player.groupId === groupId && player.id !== currentPlayerId && player.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) throw new Error('That player already exists in this group.');
};

const fromRow = (row) => ({
  id: row.id,
  groupId: row.group_id,
  name: row.name,
  level: row.level,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchGroupPlayers = async (groupId, { includeInactive = false } = {}) => {
  if (!supabase) {
    return loadLocalPlayers().filter((player) => player.groupId === groupId && (includeInactive || player.active !== false));
  }

  let query = supabase.from('group_players').select('*').eq('group_id', groupId).order('name', { ascending: true });
  if (!includeInactive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load players: ${error.message}`);
  return (data || []).map(fromRow);
};

export const addGroupPlayer = async ({ groupId, name, level }) => {
  const normalizedName = validateName(name);
  const normalizedLevel = normalizeLevel(level);
  const timestamp = nowIso();

  if (!supabase) {
    const players = loadLocalPlayers();
    ensureUniqueName(players, groupId, normalizedName);
    const player = { id: createId(), groupId, name: normalizedName, level: normalizedLevel, active: true, createdAt: timestamp, updatedAt: timestamp };
    saveLocalPlayers([...players, player]);
    return player;
  }

  const { data, error } = await supabase
    .from('group_players')
    .insert({ id: createId(), group_id: groupId, name: normalizedName, level: normalizedLevel, active: true, created_at: timestamp, updated_at: timestamp })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('That player already exists in this group.');
    throw new Error(`Failed to add player: ${error.message}`);
  }
  return fromRow(data);
};

export const updateGroupPlayer = async (playerId, updates) => {
  const timestamp = nowIso();
  const normalizedName = updates.name !== undefined ? validateName(updates.name) : undefined;
  const normalizedLevel = updates.level !== undefined ? normalizeLevel(updates.level) : undefined;

  if (!supabase) {
    const players = loadLocalPlayers();
    const current = players.find((player) => player.id === playerId);
    if (!current) throw new Error('Player not found.');
    if (normalizedName) ensureUniqueName(players, current.groupId, normalizedName, playerId);
    const nextPlayers = players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            ...(normalizedName ? { name: normalizedName } : {}),
            ...(normalizedLevel ? { level: normalizedLevel } : {}),
            ...(updates.active !== undefined ? { active: Boolean(updates.active) } : {}),
            updatedAt: timestamp,
          }
        : player
    );
    saveLocalPlayers(nextPlayers);
    return nextPlayers.find((player) => player.id === playerId);
  }

  const payload = { updated_at: timestamp };
  if (normalizedName) payload.name = normalizedName;
  if (normalizedLevel) payload.level = normalizedLevel;
  if (updates.active !== undefined) payload.active = Boolean(updates.active);
  const { data, error } = await supabase.from('group_players').update(payload).eq('id', playerId).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('That player already exists in this group.');
    throw new Error(`Failed to update player: ${error.message}`);
  }
  return fromRow(data);
};

export const deactivateGroupPlayer = async (playerId) => {
  return updateGroupPlayer(playerId, { active: false });
};
