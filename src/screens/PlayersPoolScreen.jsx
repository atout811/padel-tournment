import React, { useCallback, useEffect, useState } from 'react';
import { addGroupPlayer, deactivateGroupPlayer, fetchGroupPlayers, updateGroupPlayer } from '../utils/groupPlayerService';
import { CheckIcon, TrashIcon, UsersIcon } from '../components/Icons';

export default function PlayersPoolScreen({ group, showAlert, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(3);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(3);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlayers = useCallback(async () => {
    if (!group?.id) return;
    const items = await fetchGroupPlayers(group.id);
    setPlayers(items);
  }, [group?.id]);

  useEffect(() => {
    loadPlayers().catch((error) => {
      console.error('Error loading players:', error);
      showAlert('Error', 'Could not load players.');
    });
  }, [loadPlayers, showAlert]);

  const handleAdd = async () => {
    try {
      setIsSaving(true);
      await addGroupPlayer({ groupId: group.id, name, level });
      setName('');
      setLevel(3);
      await loadPlayers();
    } catch (error) {
      console.error('Error adding player:', error);
      showAlert('Player Not Saved', error.message || 'Could not add this player.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (player) => {
    setEditingId(player.id);
    setEditName(player.name);
    setEditLevel(player.level);
  };

  const saveEdit = async () => {
    try {
      setIsSaving(true);
      await updateGroupPlayer(editingId, { name: editName, level: editLevel });
      setEditingId(null);
      await loadPlayers();
    } catch (error) {
      console.error('Error updating player:', error);
      showAlert('Player Not Saved', error.message || 'Could not update this player.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (playerId) => {
    try {
      setIsSaving(true);
      await deactivateGroupPlayer(playerId);
      await loadPlayers();
    } catch (error) {
      console.error('Error deactivating player:', error);
      showAlert('Error', 'Could not deactivate this player.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) {
    return (
      <div className="rounded-b-3xl border-x border-b border-club-border bg-white/90 p-6">
        <button type="button" onClick={() => setScreen('groups')} className="rounded-2xl bg-[#168A5B] px-5 py-3 font-black text-white">
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-white/90 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#146C52] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFEFE5]">Players Pool</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{group?.name || 'Group'}</h2>
        <p className="mt-2 text-sm font-medium text-[#E8F6EF]">Active players are available for new group nights.</p>
      </section>

      <section className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-[#18211C]">Add Player</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
            maxLength={28}
            className="min-h-14 rounded-2xl border border-[#DDE7DE] px-4 font-semibold outline-none focus:border-[#168A5B] focus:ring-4 focus:ring-[#E8F6EF]"
            placeholder="Player name"
          />
          <LevelSelect value={level} onChange={(event) => setLevel(Number(event.target.value))} disabled={isSaving} />
          <button type="button" onClick={handleAdd} disabled={isSaving} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#168A5B] px-6 font-black text-white disabled:opacity-60">
            <UsersIcon className="h-5 w-5" />
            Add
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#18211C]">Active Players</h3>
          <button type="button" onClick={() => setScreen('groupHome')} className="rounded-2xl border border-[#DDE7DE] px-4 py-2 text-sm font-black text-[#65736A] hover:bg-[#F1F7F2]">
            Back
          </button>
        </div>
        {players.length ? (
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="rounded-3xl border border-[#DDE7DE] bg-[#F7FAF5] p-3">
                {editingId === player.id ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
                    <input value={editName} onChange={(event) => setEditName(event.target.value)} className="min-h-12 rounded-2xl border border-[#DDE7DE] px-3 font-semibold outline-none focus:border-[#168A5B]" />
                    <LevelSelect value={editLevel} onChange={(event) => setEditLevel(Number(event.target.value))} disabled={isSaving} />
                    <button type="button" onClick={saveEdit} disabled={isSaving} className="rounded-2xl bg-[#168A5B] px-4 font-black text-white disabled:opacity-60">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-2xl border border-[#DDE7DE] px-4 font-black text-[#65736A]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-black text-[#18211C]">
                        <CheckIcon className="h-5 w-5 text-[#146C52]" />
                        {player.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#65736A]">Level {player.level}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(player)} className="rounded-2xl border border-[#DDE7DE] bg-white px-4 py-2 font-black text-[#18211C] hover:bg-[#F1F7F2]">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDeactivate(player.id)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 font-black text-red-700 disabled:opacity-60">
                        <TrashIcon className="h-4 w-4" />
                        Deactivate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-[#BFD0C2] bg-[#F1F7F2] px-4 py-8 text-center text-sm font-bold text-[#65736A]">No active players yet.</p>
        )}
      </section>
    </div>
  );
}

function LevelSelect({ value, onChange, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className="min-h-12 rounded-2xl border border-[#DDE7DE] bg-white px-3 font-black text-[#18211C] outline-none focus:border-[#168A5B] disabled:opacity-60">
      {[1, 2, 3, 4, 5].map((item) => (
        <option key={item} value={item}>
          Level {item}
        </option>
      ))}
    </select>
  );
}
