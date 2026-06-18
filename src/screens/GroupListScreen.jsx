import React, { useCallback, useEffect, useState } from 'react';
import { createGroup, fetchGroups, subscribeToGroups } from '../utils/groupService';
import { CheckIcon, UsersIcon } from '../components/Icons';

export default function GroupListScreen({ showAlert, setScreen, setSelectedGroup }) {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadGroups = useCallback(async () => {
    return fetchGroups();
  }, []);

  useEffect(() => {
    let active = true;
    loadGroups()
      .then((items) => {
        if (active) setGroups(items);
      })
      .catch((error) => {
        console.error('Error loading groups:', error);
        showAlert('Error', 'Could not load padel groups.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadGroups, showAlert]);

  useEffect(() => {
    return subscribeToGroups((items) => setGroups(items));
  }, []);

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      showAlert('Group Name Required', 'Enter a group name first.');
      return;
    }

    try {
      setIsSaving(true);
      const group = await createGroup(name);
      setGroups((current) => [group, ...current]);
      setGroupName('');
      setSelectedGroup(group);
      setScreen('groupHome', { group });
    } catch (error) {
      console.error('Error creating group:', error);
      showAlert('Error', error.message || 'Could not create the group.');
    } finally {
      setIsSaving(false);
    }
  };

  const openGroup = (group) => {
    setSelectedGroup(group);
    setScreen('groupHome', { group });
  };

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">Groups</p>
        <h2 className="mt-1 text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">Player pools</h2>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <h3 className="text-lg font-black text-[#F7F8F7]">Create Group</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateGroup();
              }
            }}
            maxLength={60}
            className="min-h-14 flex-1 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-4 text-base font-semibold text-[#F7F8F7] outline-none placeholder:text-[#8D99A6] focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20"
            placeholder="Group name"
          />
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={isSaving}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-6 font-black text-[#020D16] transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UsersIcon className="h-5 w-5" />
            Create
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#F7F8F7]">Groups</h3>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black tabular-nums text-[#BEDC45]">{groups.length}</span>
        </div>
        {isLoading ? (
          <p className="rounded-3xl bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">Loading groups...</p>
        ) : groups.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <button key={group.id} type="button" onClick={() => openGroup(group)} className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-4 text-left transition hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B]">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#BEDC45]">
                  <CheckIcon className="h-4 w-4" />
                  Group
                </span>
                <span className="mt-2 block text-xl font-black text-[#F7F8F7]">{group.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">No groups yet.</p>
        )}
      </section>
    </div>
  );
}
