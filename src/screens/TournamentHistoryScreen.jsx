import React, { useEffect, useMemo, useState } from 'react';
import { ListIcon, TrophyIcon } from '../components/Icons';
import { fetchTournamentHistory } from '../utils/tournamentService';
import { buildLeaderboard } from '../utils/tournamentRules';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function TournamentHistoryScreen({ showAlert, setTournament, setScreen }) {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    fetchTournamentHistory()
      .then((items) => {
        if (active) setTournaments(items);
      })
      .catch((error) => {
        console.error('Error loading tournament history:', error);
        if (active) {
          setTournaments([]);
          showAlert('History Not Loaded', 'Could not load your tournament history.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showAlert]);

  const totalMatches = useMemo(
    () => tournaments.reduce((total, tournament) => total + (tournament.matches?.filter((match) => match.status === 'completed').length || 0), 0),
    [tournaments]
  );

  const openTournament = (tournament) => {
    setTournament(tournament);
    setScreen('tournament');
  };

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 pb-24 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6 sm:pb-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">History</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="min-w-0 truncate text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">Tournament history</h2>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black tabular-nums text-[#BEDC45]">{tournaments.length}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SummaryTile label="Tournaments" value={tournaments.length} />
        <SummaryTile label="Matches Done" value={totalMatches} />
        <SummaryTile label="Sort" value="Newest" textValue />
      </section>

      <section className="space-y-2">
        {isLoading ? (
          <HistoryState title="Loading history..." detail="Fetching your tournaments." />
        ) : tournaments.length ? (
          tournaments.map((tournament) => <HistoryRow key={tournament.id} tournament={tournament} onOpen={() => openTournament(tournament)} />)
        ) : (
          <HistoryState title="No tournaments yet" detail="Started tournaments will appear here." />
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value, textValue = false }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 text-center">
      <p className={`${textValue ? 'text-lg' : 'text-2xl'} font-black tabular-nums text-[#F7F8F7]`}>{value}</p>
      <p className="mt-1 truncate text-[0.62rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
    </div>
  );
}

function HistoryRow({ tournament, onOpen }) {
  const summary = getTournamentSummary(tournament);
  const Icon = tournament.format === 'league' ? ListIcon : TrophyIcon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid min-h-24 w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 text-left shadow-sm transition hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B] active:scale-[0.99]"
    >
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
      <span className="text-right">
        <span className="block text-lg font-black tabular-nums text-[#F7F8F7]">{summary.completedMatches}/{summary.totalMatches}</span>
        <span className="block text-xs font-bold uppercase tracking-wide text-[#8D99A6]">matches</span>
      </span>
    </button>
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

function getTournamentSummary(tournament) {
  const matches = tournament.matches || [];
  const completedMatches = matches.filter((match) => match.status === 'completed').length;
  const totalMatches = matches.length;
  const isComplete = totalMatches > 0 && completedMatches === totalMatches;
  const status = tournament.status === 'ended' ? 'Ended' : isComplete ? 'Complete' : 'Live';
  const format = tournament.format === 'league' ? 'League' : 'Cup';
  const teamCount = tournament.teams?.length || 0;
  const date = formatTournamentDate(tournament.createdAt || tournament.updatedAt || tournament.endedAt);
  const winner = getWinnerName(tournament, isComplete);

  return {
    status,
    date,
    title: `${format} night`,
    detail: winner || `${teamCount} team${teamCount === 1 ? '' : 's'}`,
    completedMatches,
    totalMatches,
  };
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
