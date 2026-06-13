import React, { useCallback, useEffect, useState } from 'react';
import { addGroupPlayer, deactivateGroupPlayer, fetchGroupPlayers, updateGroupPlayer } from '../utils/groupPlayerService';
import { getPlayerWinRate } from '../utils/playerProgressionService';
import { CheckIcon, TrashIcon, UsersIcon } from '../components/Icons';

export default function PlayersPoolScreen({ group, showAlert, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(1);
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
      setLevel(1);
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
    setEditLevel(player.initialLevel || player.level);
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
      <div className="rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-6">
        <button type="button" onClick={() => setScreen('groups')} className="rounded-2xl bg-[#BEDC45] px-5 py-3 font-black text-[#020D16]">
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#19232B] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFD2D3]">Players Pool</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{group?.name || 'Group'}</h2>
        <p className="mt-2 text-sm font-medium text-[#BEDC45]">Active players are available for new group nights.</p>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <h3 className="text-lg font-black text-[#F7F8F7]">Add Player</h3>
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
            className="min-h-14 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-4 font-semibold text-[#F7F8F7] outline-none placeholder:text-[#8D99A6] focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20"
            placeholder="Player name"
          />
          <LevelSelect value={level} onChange={(event) => setLevel(Number(event.target.value))} disabled={isSaving} />
          <button type="button" onClick={handleAdd} disabled={isSaving} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-6 font-black text-[#020D16] disabled:opacity-60">
            <UsersIcon className="h-5 w-5" />
            Add
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#F7F8F7]">Active Players</h3>
          <button type="button" onClick={() => setScreen('groupHome')} className="rounded-2xl border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-black text-[#8D99A6] hover:bg-[#07111B]">
            Back
          </button>
        </div>
        {players.length ? (
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
                {editingId === player.id ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
                    <input value={editName} onChange={(event) => setEditName(event.target.value)} className="min-h-12 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-3 font-semibold text-[#F7F8F7] outline-none focus:border-[#BEDC45]" />
                    <LevelSelect value={editLevel} onChange={(event) => setEditLevel(Number(event.target.value))} disabled={isSaving} />
                    <button type="button" onClick={saveEdit} disabled={isSaving} className="rounded-2xl bg-[#BEDC45] px-4 font-black text-[#020D16] disabled:opacity-60">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-2xl border border-[rgba(255,255,255,0.08)] px-4 font-black text-[#8D99A6]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-black text-[#F7F8F7]">
                        <CheckIcon className="h-5 w-5 text-[#BEDC45]" />
                        {player.name}
                      </p>
                      <PlayerStats player={player} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(player)} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-4 py-2 font-black text-[#F7F8F7] hover:bg-[#07111B]">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDeactivate(player.id)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl border border-[#DB4145]/30 bg-[#DB4145]/10 px-4 py-2 font-black text-[#DB4145] disabled:opacity-60">
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
          <p className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">No active players yet.</p>
        )}
      </section>
    </div>
  );
}

function PlayerStats({ player }) {
  const matchesPlayed = Math.max(0, Number(player.matchesPlayed || 0));
  const wins = Math.max(0, Number(player.wins || 0));
  const losses = Math.max(0, Number(player.losses || 0));
  const winRate = getPlayerWinRate(player);

  return (
    <div className="mt-1 space-y-0.5 text-sm font-bold text-[#8D99A6]">
      <p>
        Level {player.level} <span className="text-[#CFD2D3]">Rating {player.rating}</span>
      </p>
      {matchesPlayed ? (
        <p>
          {wins}W / {losses}L <span className="text-[#CFD2D3]">{winRate}% win rate</span> <span>{matchesPlayed} match{matchesPlayed === 1 ? '' : 'es'}</span>
        </p>
      ) : (
        <p>No matches yet</p>
      )}
    </div>
  );
}

function LevelSelect({ value, onChange, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className="min-h-14 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-3 font-black text-[#F7F8F7] outline-none focus:border-[#BEDC45] disabled:opacity-60">
      {[1, 2, 3, 4, 5].map((item) => (
        <option key={item} value={item}>
          Level {item}
        </option>
      ))}
    </select>
  );
}
