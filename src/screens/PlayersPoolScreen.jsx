import React, { useCallback, useEffect, useState } from 'react';
import { addGroupPlayer, deactivateGroupPlayer, fetchGroupPlayers, subscribeToGroupPlayers, updateGroupPlayer } from '../utils/groupPlayerService';
import { getPlayerWinRate } from '../utils/playerProgressionService';
import { TrashIcon, UsersIcon } from '../components/Icons';
import { Button, EmptyState, PageHeader, Panel, ScreenShell, SectionHeading, TextInput } from '../components/Ui.jsx';
import { useI18n } from '../i18n/useI18n.js';

export default function PlayersPoolScreen({ group, showAlert, setScreen }) {
  const { t, formatDate } = useI18n();
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const loadPlayers = useCallback(async () => {
    if (!group?.id) return;
    const items = await fetchGroupPlayers(group.id);
    setPlayers(items);
  }, [group?.id]);

  useEffect(() => {
    loadPlayers().catch((error) => {
      console.error('Error loading players:', error);
      showAlert(t('alerts.error'), t('pool.loadError'));
    });
  }, [loadPlayers, showAlert, t]);

  useEffect(() => {
    if (!group?.id) return undefined;
    return subscribeToGroupPlayers(group.id, (items) => setPlayers(items));
  }, [group?.id]);

  const handleAdd = async () => {
    try {
      setIsSaving(true);
      await addGroupPlayer({ groupId: group.id, name, level });
      setName('');
      setLevel(1);
      setShowAddPlayer(false);
      await loadPlayers();
    } catch (error) {
      console.error('Error adding player:', error);
      showAlert(t('pool.saveErrorTitle'), error.message || t('pool.addError'));
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
      showAlert(t('pool.saveErrorTitle'), error.message || t('pool.updateError'));
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
      showAlert(t('alerts.error'), t('pool.deactivateError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) {
    return (
      <ScreenShell>
        <Button onClick={() => setScreen('groups')}>
          {t('startNight.backToGroups')}
        </Button>
      </ScreenShell>
    );
  }

  const rankedPlayers = sortPlayersForCards(players);
  const totalMatches = players.reduce((sum, player) => sum + Number(player.matchesPlayed || 0), 0);
  const topPlayer = rankedPlayers[0] || null;
  const isAddOpen = showAddPlayer || players.length === 0;

  return (
    <ScreenShell withBottomNav>
      <PageHeader
        eyebrow={t('pool.tag')}
        title={group?.name || t('nav.group')}
        detail={t('pool.detail')}
      />

      <FriendCardsSummary players={players} totalMatches={totalMatches} topPlayer={topPlayer} t={t} />

      <Panel>
        {players.length > 0 && (
          <button type="button" onClick={() => setShowAddPlayer((current) => !current)} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
            <span className="inline-flex items-center gap-2 text-base font-black text-club-ink">
              <UsersIcon className="h-5 w-5 text-club-muted" />
              {t('pool.addPlayer')}
            </span>
            <span className="text-xs font-black uppercase tracking-wide text-club-muted">{isAddOpen ? t('common.hide') : t('common.open')}</span>
          </button>
        )}
        {isAddOpen && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              maxLength={28}
              placeholder={t('pool.playerName')}
              autoCapitalize="words"
              autoComplete="name"
              enterKeyHint="done"
            />
            <LevelSelect value={level} onChange={setLevel} disabled={isSaving} t={t} />
            <Button onClick={handleAdd} disabled={isSaving} size="lg">
              {t('common.add')}
            </Button>
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeading title={t('pool.friendCards')} count={players.length} />
        {players.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {rankedPlayers.map((player, index) => (
              <div key={player.id} className="rounded-lg border border-club-border bg-club-surface p-3">
                {editingId === player.id ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
                    <TextInput
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      autoCapitalize="words"
                      autoComplete="name"
                      enterKeyHint="done"
                    />
                    <LevelSelect value={editLevel} onChange={setEditLevel} disabled={isSaving} t={t} />
                    <Button onClick={saveEdit} disabled={isSaving}>
                      {t('common.save')}
                    </Button>
                    <Button tone="secondary" onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <PlayerProfileCard
                    player={player}
                    rank={index + 1}
                    onEdit={() => startEdit(player)}
                    onDeactivate={() => handleDeactivate(player.id)}
                    isSaving={isSaving}
                    t={t}
                    formatDate={formatDate}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t('pool.addFirst')} detail={t('pool.addFirstDetail')} action={<Button onClick={() => setShowAddPlayer(true)}>{t('pool.addPlayer')}</Button>} />
        )}
      </Panel>
    </ScreenShell>
  );
}

function FriendCardsSummary({ players, totalMatches, topPlayer, t }) {
  const summary = [
    `${players.length} ${t('pool.players').toLowerCase()}`,
    `${totalMatches} ${t('pool.matches').toLowerCase()}`,
    topPlayer ? `#1 ${topPlayer.name}` : t('pool.addFirst'),
  ];

  return (
    <Panel className="py-3">
      <p className="truncate text-sm font-bold text-club-muted">{summary.join(' / ')}</p>
    </Panel>
  );
}

function PlayerProfileCard({ player, rank, onEdit, onDeactivate, isSaving, t, formatDate }) {
  const matchesPlayed = Math.max(0, Number(player.matchesPlayed || 0));
  const wins = Math.max(0, Number(player.wins || 0));
  const losses = Math.max(0, Number(player.losses || 0));
  const winRate = getPlayerWinRate(player);
  const currentStreak = Math.max(0, Number(player.currentStreak || 0));
  const bestStreak = Math.max(0, Number(player.bestStreak || 0));
  const status = getPlayerStatusLine(player, t);

  return (
    <div>
      <div className="grid grid-cols-[44px_1fr_auto] items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-club-border bg-club-wash text-sm font-black text-club-ink">
          {getInitials(player.name)}
        </div>
        <div className="min-w-0">
          <h4 className="break-words text-lg font-black leading-tight text-club-ink">{player.name}</h4>
          <p className="mt-1 text-sm font-bold text-club-muted">
            {t('common.level')} {player.level} / {t('pool.rating', { rating: player.rating })}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-club-muted">{status}</p>
        </div>
        <span className="rounded-md bg-club-wash px-2 py-1 text-xs font-black text-club-muted">#{rank}</span>
      </div>

      <details className="mt-3 rounded-lg bg-club-wash px-3 py-2">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-club-muted">{t('pool.stats')}</summary>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <StatLine label={t('pool.record')} value={matchesPlayed ? `${wins}-${losses}` : '0-0'} />
          <StatLine label={t('pool.winRate')} value={`${winRate}%`} />
          <StatLine label={t('pool.currentStreak')} value={currentStreak} />
          <StatLine label={t('pool.bestStreak')} value={bestStreak} />
          <StatLine label={t('pool.lastPlayed')} value={formatLastPlayed(player.lastPlayedAt, formatDate, t)} className="col-span-2" />
        </div>
      </details>

      <div className="mt-3 flex gap-2">
        <Button tone="secondary" size="sm" onClick={onEdit} className="flex-1">
          {t('common.edit')}
        </Button>
        <Button tone="danger" size="sm" onClick={onDeactivate} disabled={isSaving} aria-label={`${t('pool.deactivate')} ${player.name}`} className="px-3">
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">{t('pool.deactivate')}</span>
        </Button>
      </div>
    </div>
  );
}

function StatLine({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="truncate text-[0.62rem] font-black uppercase tracking-wide text-club-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black tabular-nums text-club-ink">{value}</p>
    </div>
  );
}

function sortPlayersForCards(players) {
  return [...players].sort(
    (left, right) =>
      Number(right.level || 0) - Number(left.level || 0) ||
      Number(right.rating || 0) - Number(left.rating || 0) ||
      getPlayerWinRate(right) - getPlayerWinRate(left) ||
      Number(right.wins || 0) - Number(left.wins || 0) ||
      left.name.localeCompare(right.name)
  );
}

function getPlayerStatusLine(player, t) {
  if (Number(player.currentStreak || 0) >= 3) return t('pool.hotStreak');
  if (Number(player.matchesPlayed || 0) === 0) return t('pool.freshSigning');
  return `${Number(player.matchesPlayed || 0)} ${t('pool.matches').toLowerCase()} / ${getPlayerWinRate(player)}%`;
}

function getInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatLastPlayed(value, formatDate, t) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? formatDate(value) : t('pool.notYet');
}

function LevelSelect({ value, onChange, disabled, t }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-club-muted">{t('common.level')}</p>
      <div className="grid grid-cols-5 gap-1 rounded-lg border border-club-border bg-club-wash p-1">
        {[1, 2, 3, 4, 5].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            disabled={disabled}
            aria-pressed={value === item}
            className={`min-h-12 rounded-md text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value === item ? 'motion-soft-pop bg-club-green text-club-greenDeep' : 'text-club-muted hover:bg-club-soft hover:text-club-ink'
          }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
