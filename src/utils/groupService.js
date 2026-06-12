import { supabase } from './supabaseClient';
import { getOrCreateUserId } from './storage';

export const GROUPS_STORAGE_KEY = 'padel-groups-data';

const nowIso = () => new Date().toISOString();

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const loadLocalGroups = () => {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_STORAGE_KEY) || '[]');
  } catch (error) {
    console.error('Error loading groups:', error);
    return [];
  }
};

const saveLocalGroups = (groups) => {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
};

const fromRow = (row) => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchGroups = async () => {
  const ownerId = getOrCreateUserId();

  if (!supabase) {
    return loadLocalGroups().filter((group) => group.ownerId === ownerId);
  }

  const { data, error } = await supabase.from('padel_groups').select('*').eq('owner_id', ownerId).order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to load groups: ${error.message}`);
  return (data || []).map(fromRow);
};

export const createGroup = async (name) => {
  const trimmedName = String(name || '').trim().replace(/\s+/g, ' ');
  if (!trimmedName) throw new Error('Group name is required.');

  const ownerId = getOrCreateUserId();
  const timestamp = nowIso();
  const group = { id: createId('group'), ownerId, name: trimmedName, createdAt: timestamp, updatedAt: timestamp };

  if (!supabase) {
    const groups = loadLocalGroups();
    saveLocalGroups([group, ...groups]);
    return group;
  }

  const { data, error } = await supabase
    .from('padel_groups')
    .insert({ id: group.id, owner_id: ownerId, name: group.name, created_at: group.createdAt, updated_at: group.updatedAt })
    .select()
    .single();

  if (error) throw new Error(`Failed to create group: ${error.message}`);
  return fromRow(data);
};

export const updateGroup = async (groupId, updates) => {
  const timestamp = nowIso();
  const name = updates.name ? String(updates.name).trim().replace(/\s+/g, ' ') : undefined;
  if (updates.name !== undefined && !name) throw new Error('Group name is required.');

  if (!supabase) {
    const groups = loadLocalGroups();
    const nextGroups = groups.map((group) => (group.id === groupId ? { ...group, ...updates, ...(name ? { name } : {}), updatedAt: timestamp } : group));
    saveLocalGroups(nextGroups);
    return nextGroups.find((group) => group.id === groupId) || null;
  }

  const payload = { updated_at: timestamp };
  if (name) payload.name = name;
  const { data, error } = await supabase.from('padel_groups').update(payload).eq('id', groupId).select().single();
  if (error) throw new Error(`Failed to update group: ${error.message}`);
  return fromRow(data);
};

export const deleteGroup = async (groupId) => {
  if (!supabase) {
    saveLocalGroups(loadLocalGroups().filter((group) => group.id !== groupId));
    return;
  }

  const { error } = await supabase.from('padel_groups').delete().eq('id', groupId);
  if (error) throw new Error(`Failed to delete group: ${error.message}`);
};
