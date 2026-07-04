import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmationModal } from '../components/Alert';
import { ListIcon, TrashIcon, TrophyIcon } from '../components/Icons';
import { SkeletonRows } from '../components/Skeleton.jsx';
import { EmptyState, PageHeader, Panel, Pill, ScreenShell } from '../components/Ui.jsx';
import { fetchGroups } from '../utils/groupService';
import { fetchTournamentHistory, removeTournamentRecord } from '../utils/tournamentService';
import { buildLeaderboard } from '../utils/tournamentRules';
import { useI18n } from '../i18n/useI18n.js';

const filters = [
  { id: 'all', labelKey: 'history.all' },
  { id: 'live', labelKey: 'history.live' },
  { id: 'ended', labelKey: 'history.ended' },
  { id: 'cup', labelKey: 'history.cup' },
  { id: 'league', labelKey: 'history.league' },
  { id: 'group', labelKey: 'history.group' },
  { id: 'quick', labelKey: 'history.quick' },
];

export default function TournamentHistoryScreen({ showAlert, onOpenTournamentResult }) {
  const { t, formatDate, isRtl } = useI18n();
  const [tournaments, setTournaments] = useState([]);
  const [groupNames, setGroupNames] = useState(new Map());
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.allSettled([fetchTournamentHistory(), fetchGroups()])
      .then(([historyResult, groupsResult]) => {
        if (!active) return;

        if (historyResult.status === 'fulfilled') {
          setTournaments(historyResult.value);
        } else {
          console.error('Error loading tournament history:', historyResult.reason);
          setTournaments([]);
          showAlert(t('history.loadErrorTitle'), t('history.loadErrorMessage'));
        }

        if (groupsResult.status === 'fulfilled') {
          setGroupNames(new Map(groupsResult.value.map((group) => [group.id, group.name])));
        } else {
          console.error('Error loading group names:', groupsResult.reason);
          setGroupNames(new Map());
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showAlert, t]);

  const filteredTournaments = useMemo(
    () => tournaments.filter((tournament) => matchesFilter(tournament, activeFilter)),
    [activeFilter, tournaments]
  );

  const openTournament = (tournament) => {
    onOpenTournamentResult(tournament);
  };

  const confirmRemoveTournament = async () => {
    if (!deleteCandidate) return;

    try {
      setRemovingId(deleteCandidate.id);
      await removeTournamentRecord(deleteCandidate.id);
      setTournaments((current) => current.filter((tournament) => tournament.id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch (error) {
      console.error('Error removing tournament:', error);
      showAlert(t('history.removeErrorTitle'), t('history.removeErrorMessage'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <ScreenShell withBottomNav>
      <PageHeader
        eyebrow={t('history.eyebrow')}
        title={t('history.title')}
        detail={t('history.detail')}
        meta={<Pill tone="greenSoft">{filteredTournaments.length} nights</Pill>}
      />

      <Panel className="flex flex-wrap gap-2 p-2">
        {filters.map((filter) => (
          <FilterButton key={filter.id} active={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>
            {t(filter.labelKey)}
          </FilterButton>
        ))}
      </Panel>

      <section className="space-y-2">
        {isLoading ? (
          <SkeletonRows count={4} />
        ) : filteredTournaments.length ? (
          filteredTournaments.map((tournament) => (
            <HistoryRow
              key={tournament.id}
              tournament={tournament}
              groupName={groupNames.get(tournament.groupId)}
              t={t}
              formatDate={formatDate}
              isRtl={isRtl}
              isRemoving={removingId === tournament.id}
              onOpen={() => openTournament(tournament)}
              onRemove={() => setDeleteCandidate(tournament)}
            />
          ))
        ) : (
          <EmptyState title={tournaments.length ? t('history.noMatch') : t('history.empty')} detail={tournaments.length ? t('history.noMatchDetail') : t('history.emptyDetail')} />
        )}
      </section>

      {deleteCandidate && (
        <ConfirmationModal
          title={t('history.removeTitle')}
          message={t('history.removeMessage')}
          onConfirm={confirmRemoveTournament}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </ScreenShell>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md px-3 text-sm font-black transition ${
        active ? 'bg-club-green text-club-greenDeep' : 'bg-club-wash text-club-muted hover:bg-club-soft hover:text-club-ink'
      }`}
    >
      {children}
    </button>
  );
}

function HistoryRow({ tournament, groupName, t, formatDate, isRtl, isRemoving, onOpen, onRemove }) {
  const summary = getTournamentSummary(tournament, groupName, t, formatDate);
  const Icon = tournament.format === 'league' ? ListIcon : TrophyIcon;

  return (
    <div className="grid min-h-24 grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-club-border bg-club-surface shadow-sm transition hover:border-club-borderStrong hover:bg-club-soft">
      <button type="button" onClick={onOpen} className={`grid min-w-0 grid-cols-[48px_1fr_auto] items-center gap-3 p-3 active:scale-[0.99] ${isRtl ? 'text-right' : 'text-left'}`}>
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-club-green/12 text-club-green">
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone="greenSoft">{summary.status}</Pill>
            <span className="text-xs font-bold text-club-muted">{summary.date}</span>
          </span>
          <span className="mt-2 block truncate text-lg font-black text-club-ink">{summary.title}</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-club-muted">{summary.detail}</span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="block text-lg font-black tabular-nums text-club-ink">{summary.completedMatches}/{summary.totalMatches}</span>
          <span className="block text-xs font-bold uppercase tracking-wide text-club-muted">{t('common.matches')}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        aria-label={`Remove ${summary.title}`}
        className="grid w-12 place-items-center border-l border-club-border text-[#DB4145] transition hover:bg-[#DB4145]/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function getTournamentSummary(tournament, groupName, t, formatDate) {
  const matches = tournament.matches || [];
  const completedMatches = matches.filter((match) => match.status === 'completed').length;
  const totalMatches = matches.length;
  const isComplete = totalMatches > 0 && completedMatches === totalMatches;
  const status = tournament.status === 'ended' ? t('history.ended') : isComplete ? t('history.complete') : t('history.live');
  const format = tournament.format === 'league' ? t('common.league') : t('common.cup');
  const teamCount = tournament.teams?.length || 0;
  const date = formatDate(tournament.endedAt || tournament.createdAt || tournament.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' });
  const winner = getWinnerName(tournament, isComplete, t);
  const title = groupName || (tournament.groupId ? t('format.groupNight') : tournament.format === 'league' ? t('format.quickLeagueNight') : t('format.quickCupNight'));
  const detailParts = [groupName ? `${format} ${t('format.groupNight')}` : null, winner || `${teamCount} ${t('common.teams')}`].filter(Boolean);

  return {
    status,
    date,
    title,
    detail: detailParts.join(' - '),
    completedMatches,
    totalMatches,
  };
}

function matchesFilter(tournament, activeFilter) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'live') return tournament.status !== 'ended';
  if (activeFilter === 'ended') return tournament.status === 'ended';
  if (activeFilter === 'cup') return tournament.format === 'cup';
  if (activeFilter === 'league') return tournament.format === 'league';
  if (activeFilter === 'group') return Boolean(tournament.groupId);
  if (activeFilter === 'quick') return !tournament.groupId;
  return true;
}

function getWinnerName(tournament, isComplete, t) {
  if (!isComplete && tournament.status !== 'ended') return '';

  if (tournament.format === 'league') {
    const { leaderboard } = buildLeaderboard(tournament);
    return leaderboard[0] ? t('history.leader', { team: getTeamName(leaderboard[0]) }) : '';
  }

  const finalMatch = tournament.matches?.find((match) => match.matchType === 'final' && match.status === 'completed');
  const winner = finalMatch ? tournament.teams?.find((team) => team.id === finalMatch.winnerId) : null;
  return winner ? t('history.winner', { team: getTeamName(winner) }) : '';
}

function getTeamName(team) {
  return team.players.join(' & ');
}
