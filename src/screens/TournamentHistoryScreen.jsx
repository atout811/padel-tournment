import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmationModal } from '../components/Alert';
import { ListIcon, TrashIcon, TrophyIcon } from '../components/Icons';
import { fetchGroups } from '../utils/groupService';
import { fetchTournamentHistory, removeTournamentRecord } from '../utils/tournamentService';
import { buildLeaderboard } from '../utils/tournamentRules';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const filters = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'ended', label: 'Ended' },
  { id: 'cup', label: 'Cup' },
  { id: 'league', label: 'League' },
  { id: 'group', label: 'Group' },
  { id: 'quick', label: 'Quick' },
];

export default function TournamentHistoryScreen({ showAlert, onOpenTournamentResult }) {
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
          showAlert('History Not Loaded', 'Could not load your tournament history.');
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
  }, [showAlert]);

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
      showAlert('Remove Failed', 'Could not remove this tournament from history.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 pb-24 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6 sm:pb-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">History</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="min-w-0 truncate text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">Tournament history</h2>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black tabular-nums text-[#BEDC45]">{filteredTournaments.length}</span>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-2">
        {filters.map((filter) => (
          <FilterButton key={filter.id} active={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>
            {filter.label}
          </FilterButton>
        ))}
      </section>

      <section className="space-y-2">
        {isLoading ? (
          <HistoryState title="Loading history..." detail="Fetching your tournaments." />
        ) : filteredTournaments.length ? (
          filteredTournaments.map((tournament) => (
            <HistoryRow
              key={tournament.id}
              tournament={tournament}
              groupName={groupNames.get(tournament.groupId)}
              isRemoving={removingId === tournament.id}
              onOpen={() => openTournament(tournament)}
              onRemove={() => setDeleteCandidate(tournament)}
            />
          ))
        ) : (
          <HistoryState title={tournaments.length ? 'No tournaments match' : 'No tournaments yet'} detail={tournaments.length ? 'Choose another filter.' : 'Started tournaments will appear here.'} />
        )}
      </section>

      {deleteCandidate && (
        <ConfirmationModal
          title="Remove Tournament?"
          message="This removes the tournament from your history and deletes its saved record."
          onConfirm={confirmRemoveTournament}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-xl px-3 text-sm font-black transition ${
        active ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6] hover:bg-[#0D1823] hover:text-[#F7F8F7]'
      }`}
    >
      {children}
    </button>
  );
}

function HistoryRow({ tournament, groupName, isRemoving, onOpen, onRemove }) {
  const summary = getTournamentSummary(tournament, groupName);
  const Icon = tournament.format === 'league' ? ListIcon : TrophyIcon;

  return (
    <div className="grid min-h-24 grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] shadow-sm transition hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B]">
      <button type="button" onClick={onOpen} className="grid min-w-0 grid-cols-[48px_1fr_auto] items-center gap-3 p-3 text-left active:scale-[0.99]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#BEDC45]/14 text-[#BEDC45]">
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#07111B] px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#BEDC45]">{summary.status}</span>
            <span className="text-xs font-bold text-[#8D99A6]">{summary.date}</span>
          </span>
          <span className="mt-2 block truncate text-lg font-black text-[#F7F8F7]">{summary.title}</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-[#8D99A6]">{summary.detail}</span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="block text-lg font-black tabular-nums text-[#F7F8F7]">{summary.completedMatches}/{summary.totalMatches}</span>
          <span className="block text-xs font-bold uppercase tracking-wide text-[#8D99A6]">matches</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        aria-label={`Remove ${summary.title}`}
        className="grid w-12 place-items-center border-l border-[rgba(255,255,255,0.08)] text-[#DB4145] transition hover:bg-[#DB4145]/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function HistoryState({ title, detail }) {
  return (
    <div className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#0A141E] px-4 py-8 text-center">
      <p className="text-base font-black text-[#F7F8F7]">{title}</p>
      <p className="mt-1 text-sm font-semibold text-[#8D99A6]">{detail}</p>
    </div>
  );
}

function getTournamentSummary(tournament, groupName) {
  const matches = tournament.matches || [];
  const completedMatches = matches.filter((match) => match.status === 'completed').length;
  const totalMatches = matches.length;
  const isComplete = totalMatches > 0 && completedMatches === totalMatches;
  const status = tournament.status === 'ended' ? 'Ended' : isComplete ? 'Complete' : 'Live';
  const format = tournament.format === 'league' ? 'League' : 'Cup';
  const teamCount = tournament.teams?.length || 0;
  const date = formatTournamentDate(tournament.endedAt || tournament.createdAt || tournament.updatedAt);
  const winner = getWinnerName(tournament, isComplete);
  const title = groupName || (tournament.groupId ? 'Group night' : `Quick ${format} night`);
  const detailParts = [groupName ? `${format} night` : null, winner || `${teamCount} team${teamCount === 1 ? '' : 's'}`].filter(Boolean);

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

function getWinnerName(tournament, isComplete) {
  if (!isComplete && tournament.status !== 'ended') return '';

  if (tournament.format === 'league') {
    const { leaderboard } = buildLeaderboard(tournament);
    return leaderboard[0] ? `Leader: ${getTeamName(leaderboard[0])}` : '';
  }

  const finalMatch = tournament.matches?.find((match) => match.matchType === 'final' && match.status === 'completed');
  const winner = finalMatch ? tournament.teams?.find((team) => team.id === finalMatch.winnerId) : null;
  return winner ? `Winner: ${getTeamName(winner)}` : '';
}

function getTeamName(team) {
  return team.players.join(' & ');
}

function formatTournamentDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : 'No date';
}
