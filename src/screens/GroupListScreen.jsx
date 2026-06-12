import React, { useEffect, useState } from 'react';
import { createGroup, fetchGroups } from '../utils/groupService';
import { CheckIcon, UsersIcon } from '../components/Icons';

export default function GroupListScreen({ showAlert, setScreen, setSelectedGroup }) {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchGroups()
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
  }, [showAlert]);

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
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-white/90 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#146C52] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFEFE5]">My Padel Groups</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Reusable player pools</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium text-[#E8F6EF]">Create groups for recurring nights and keep player levels ready.</p>
      </section>

      <section className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-[#18211C]">Create Group</h3>
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
            className="min-h-14 flex-1 rounded-2xl border border-[#DDE7DE] bg-white px-4 text-base font-semibold text-[#18211C] outline-none focus:border-[#168A5B] focus:ring-4 focus:ring-[#E8F6EF]"
            placeholder="Group name"
          />
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={isSaving}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#168A5B] px-6 font-black text-white transition hover:bg-[#0F6F49] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UsersIcon className="h-5 w-5" />
            Create
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#18211C]">Groups</h3>
          <button type="button" onClick={() => setScreen('home')} className="rounded-2xl border border-[#DDE7DE] px-4 py-2 text-sm font-black text-[#65736A] hover:bg-[#F1F7F2]">
            Back
          </button>
        </div>
        {isLoading ? (
          <p className="rounded-3xl bg-[#F1F7F2] px-4 py-8 text-center text-sm font-bold text-[#65736A]">Loading groups...</p>
        ) : groups.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <button key={group.id} type="button" onClick={() => openGroup(group)} className="rounded-3xl border border-[#DDE7DE] bg-[#F7FAF5] p-4 text-left transition hover:border-[#BFD0C2] hover:bg-[#F1F7F2]">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#146C52]">
                  <CheckIcon className="h-4 w-4" />
                  Group
                </span>
                <span className="mt-2 block text-xl font-black text-[#18211C]">{group.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-[#BFD0C2] bg-[#F1F7F2] px-4 py-8 text-center text-sm font-bold text-[#65736A]">No groups yet.</p>
        )}
      </section>
    </div>
  );
}
