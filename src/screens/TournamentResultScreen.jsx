import React, { useEffect, useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import { CheckIcon, ListIcon, TrophyIcon } from '../components/Icons';
import { fetchGroups } from '../utils/groupService';
import { reopenTournamentRecord } from '../utils/tournamentService';
import { buildLeaderboard, emptyTeamStats } from '../utils/tournamentRules';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const getTeamName = (team) => team.players.join(' & ');

export default function TournamentResultScreen({ tournament, showAlert, onResumeTournament, canManageTournament = false }) {
  const [groupName, setGroupName] = useState('');
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const { leaderboard, teamStats } = useMemo(() => buildLeaderboard(tournament), [tournament]);
  const completedMatches = useMemo(() => tournament.matches.filter((match) => match.status === 'completed'), [tournament.matches]);
  const pendingMatches = useMemo(() => tournament.matches.filter((match) => match.status !== 'completed'), [tournament.matches]);
  const isEnded = tournament.status === 'ended';
  const isComplete = tournament.matches.length > 0 && completedMatches.length === tournament.matches.length;
  const formatLabel = tournament.format === 'league' ? 'League' : 'Cup';
  const title = groupName || (tournament.groupId ? 'Group night' : `Quick ${formatLabel} night`);
  const dateLabel = formatDate(tournament.endedAt || tournament.createdAt || tournament.updatedAt);
  const statusLabel = isEnded ? 'Ended' : isComplete ? 'Complete' : 'Live';
  const champion = getChampion(tournament, leaderboard);

  useEffect(() => {
    if (!tournament.groupId) {
      setGroupName('');
      return undefined;
    }

    let active = true;
    fetchGroups()
      .then((groups) => {
        if (!active) return;
        setGroupName(groups.find((group) => group.id === tournament.groupId)?.name || '');
      })
      .catch((error) => {
        console.error('Error loading result group name:', error);
        if (active) setGroupName('');
      });

    return () => {
      active = false;
    };
  }, [tournament.groupId]);

  const confirmReopenTournament = async () => {
    try {
      setIsReopening(true);
      const savedTournament = await reopenTournamentRecord(tournament);
      setShowReopenConfirm(false);
      onResumeTournament(savedTournament);
      showAlert('Tournament Reopened', 'You can edit scores and teams again.');
    } catch (error) {
      console.error('Error reopening tournament:', error);
      showAlert('Error', 'Could not reopen tournament.');
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 pb-24 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6 sm:pb-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#BEDC45]/14 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#BEDC45]">{statusLabel}</span>
          <span className="rounded-full bg-[#07111B] px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{formatLabel}</span>
          <span className="text-xs font-bold text-[#8D99A6]">{dateLabel}</span>
        </div>
        <h2 className="mt-3 text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-[#8D99A6]">
          {completedMatches.length}/{tournament.matches.length} matches completed
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-4">
        <ResultStat label="Teams" value={tournament.teams.length} />
        <ResultStat label="Done" value={completedMatches.length} />
        <ResultStat label="Waiting" value={pendingMatches.length} />
        <ResultStat label="Courts" value={Math.max(1, Number(tournament.courtCount || 1))} />
      </section>

      <section className="rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#BEDC45]">
              <TrophyIcon className="h-5 w-5" />
              Result
            </p>
            <h3 className="mt-2 truncate text-2xl font-black text-[#F7F8F7]">{champion ? getTeamName(champion) : 'Result pending'}</h3>
            <p className="mt-1 text-sm font-semibold text-[#8D99A6]">{champion ? 'Top team by the current standings.' : 'No winner is available yet.'}</p>
          </div>
          {!isEnded ? (
            <button
              type="button"
              onClick={() => onResumeTournament(tournament)}
              className="min-h-11 shrink-0 rounded-2xl bg-[#BEDC45] px-4 text-sm font-black text-[#020D16] transition hover:bg-[#D3F05A]"
            >
              Resume
            </button>
          ) : canManageTournament ? (
            <button
              type="button"
              onClick={() => setShowReopenConfirm(true)}
              disabled={isReopening}
              className="min-h-11 shrink-0 rounded-2xl bg-[#BEDC45] px-4 text-sm font-black text-[#020D16] transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reopen
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#8D99A6]">
          <ListIcon className="h-5 w-5 text-[#BEDC45]" />
          Final Ranking
        </h3>
        <div className="space-y-2">
          {leaderboard.map((team, index) => {
            const stats = teamStats.get(team.id) || emptyTeamStats();
            return <RankingRow key={team.id} team={team} rank={index + 1} stats={stats} />;
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#8D99A6]">
          <CheckIcon className="h-5 w-5 text-[#BEDC45]" />
          Matches
        </h3>
        <div className="space-y-2">
          {tournament.matches.map((match) => (
            <MatchCard key={match.id} match={match} isCurrent={false} />
          ))}
        </div>
      </section>

      {showReopenConfirm && (
        <ConfirmationModal
          title="Reopen Tournament?"
          message="This opens the live tournament screen and makes editing available again."
          onConfirm={confirmReopenTournament}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 text-center">
      <p className="text-2xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-1 truncate text-[0.62rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
    </div>
  );
}

function RankingRow({ team, rank, stats }) {
  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl text-sm font-black ${rank === 1 ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{rank}</span>
      <div className="min-w-0">
        <p className="truncate font-black text-[#F7F8F7]">{getTeamName(team)}</p>
        <p className="mt-0.5 text-xs font-bold text-[#8D99A6]">
          {stats.wins}-{stats.losses} / {stats.diff > 0 ? '+' : ''}
          {stats.diff}
        </p>
      </div>
      <p className="text-lg font-black tabular-nums text-[#BEDC45]">{stats.points}</p>
    </div>
  );
}

function getChampion(tournament, leaderboard) {
  if (tournament.format === 'league') return leaderboard[0] || null;
  const finalMatch = tournament.matches.find((match) => match.matchType === 'final' && match.status === 'completed');
  return finalMatch ? tournament.teams.find((team) => team.id === finalMatch.winnerId) || null : leaderboard[0] || null;
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : 'No date';
}
