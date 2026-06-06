import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { removeTournamentRecord, updateTournamentRecord } from '../utils/tournamentService';
import { distributeMatchesFairly } from '../utils/scheduling';
import CurrentMatchCard from '../components/CurrentMatchCard';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import EditTeamsModal from '../screens/modals/EditTeamsModal';
import GameHistoryModal from '../screens/modals/GameHistoryModal';
import { normalizeScoringSettings } from '../utils/padelScoring';

const getTeamName = (team) => team.players.join(' & ');
const getPadelSetTotals = (score, teamAId, teamBId) => {
  if (!score?.sets) return null;
  return score.sets.filter((set) => set.winnerId).reduce(
    (totals, set) => ({
      teamA: totals.teamA + (set.winnerId === teamAId ? 1 : 0),
      teamB: totals.teamB + (set.winnerId === teamBId ? 1 : 0),
    }),
    { teamA: 0, teamB: 0 }
  );
};

const emptyStats = () => ({
  wins: 0,
  losses: 0,
  scored: 0,
  conceded: 0,
  diff: 0,
});

export default function TournamentScreen({ tournament, setTournament, showAlert, setScreen, shareLink }) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const scoringSettings = useMemo(() => normalizeScoringSettings(tournament.scoringSettings), [tournament.scoringSettings]);

  const handleCopyShareLink = async () => {
    if (!shareLink) {
      return;
    }
    if (!navigator?.clipboard?.writeText) {
      showAlert('Copy Unavailable', 'Your browser does not support automatic copying. Please copy the link manually.');
      return;
    }
    try {
      setIsCopyingLink(true);
      await navigator.clipboard.writeText(shareLink);
      setCopyFeedback('Link copied');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
      setCopyFeedback('');
      showAlert('Copy Failed', 'Unable to copy the share link automatically. Please copy it manually.');
    } finally {
      setIsCopyingLink(false);
    }
  };

  useEffect(() => {
    setCopyFeedback('');
    setIsCopyingLink(false);
  }, [shareLink]);

  const handleUpdateMatchScore = async (match, score) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === match.id);
    if (matchIndex === -1 || updatedTournament.matches[matchIndex].status === 'completed') {
      return;
    }

    updatedTournament.matches[matchIndex].score = score;
    setTournament(updatedTournament);

    try {
      await updateTournamentRecord(updatedTournament);
    } catch (error) {
      console.error('Error saving live score:', error);
      showAlert('Error', 'Could not save the live score. Please try again.');
    }
  };

  const handleDeclareWinner = async (match, result) => {
    const winnerId = typeof result === 'string' ? result : result?.winnerId;
    if (!winnerId) {
      showAlert('Score Required', 'Enter a winning score before saving the match.');
      return;
    }

    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === match.id);
    if (matchIndex === -1) {
      showAlert('Error', 'Could not find this match.');
      return;
    }

    const previousWinnerId = updatedTournament.matches[matchIndex].winnerId || null;
    updatedTournament.matches[matchIndex].winnerId = winnerId;
    updatedTournament.matches[matchIndex].status = 'completed';

    if (result?.score) {
      updatedTournament.matches[matchIndex].score = result.score.sets
        ? result.score
        : {
            teamA: Number(result.score.teamA || 0),
            teamB: Number(result.score.teamB || 0),
          };
    }

    if (previousWinnerId && previousWinnerId !== winnerId) {
      const oldWinnerIndex = updatedTournament.teams.findIndex((t) => t.id === previousWinnerId);
      if (oldWinnerIndex > -1) {
        updatedTournament.teams[oldWinnerIndex].points = Math.max(0, (updatedTournament.teams[oldWinnerIndex].points || 0) - 3);
      }
    }

    if (previousWinnerId !== winnerId) {
      const teamIndex = updatedTournament.teams.findIndex((t) => t.id === winnerId);
      if (teamIndex > -1) {
        updatedTournament.teams[teamIndex].points = (updatedTournament.teams[teamIndex].points || 0) + 3;
      }
    }

    if (updatedTournament.currentMatchId === match.id) {
      const nextPendingInRound = updatedTournament.matches.find(
        (m) => m.round === updatedTournament.currentRound && m.status === 'pending' && m.id !== match.id
      );
      updatedTournament.currentMatchId = nextPendingInRound ? nextPendingInRound.id : null;
    }

    const currentRoundMatches = updatedTournament.matches.filter((m) => m.round === updatedTournament.currentRound);
    const completedCurrentRound = currentRoundMatches.filter((m) => m.status === 'completed');

    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);

      if (completedCurrentRound.length === currentRoundMatches.length && savedTournament.currentRound === 1) {
        if (savedTournament.format === 'league') {
          setTimeout(() => advanceToLeagueRound2(savedTournament), 1000);
        } else {
          setTimeout(() => advanceToRound2(savedTournament), 1000);
        }
      }
    } catch (error) {
      console.error('Error saving score:', error);
      showAlert('Error', 'Could not save the score. Please try again.');
    }
  };

  const setAsCurrentMatch = async (match) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    updatedTournament.currentMatchId = match.id;
    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
    } catch (error) {
      console.error('Error updating current match:', error);
      showAlert('Error', 'Could not set the current match. Please try again.');
    }
  };

  const advanceToRound2 = async (tournamentData) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
    const sortedTeams = [...updatedTournament.teams].sort((a, b) => (b.points || 0) - (a.points || 0));
    const top4Teams = sortedTeams.slice(0, 4);
    if (top4Teams.length < 4) {
      showAlert('Error', 'Not enough teams for Round 2. Need at least 4 teams.');
      return;
    }

    const semifinal1 = { id: 'round2_semifinal_1', round: 2, matchType: 'semifinal', teamA: top4Teams[0], teamB: top4Teams[3], winnerId: null, status: 'pending' };
    const semifinal2 = { id: 'round2_semifinal_2', round: 2, matchType: 'semifinal', teamA: top4Teams[1], teamB: top4Teams[2], winnerId: null, status: 'pending' };
    updatedTournament.matches.push(semifinal1, semifinal2);
    updatedTournament.currentRound = 2;
    updatedTournament.currentMatchId = semifinal1.id;

    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      showAlert('Round 2', 'Top 4 teams advance to semifinals.');
    } catch (error) {
      console.error('Error advancing to Round 2:', error);
      showAlert('Error', 'Could not advance to Round 2. Please try again.');
    }
  };

  const advanceToLeagueRound2 = async (tournamentData) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
    updatedTournament.currentRound = 2;
    const firstPendingRound2 = updatedTournament.matches.find((m) => m.round === 2 && m.status === 'pending');
    updatedTournament.currentMatchId = firstPendingRound2 ? firstPendingRound2.id : null;
    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      showAlert('Round 2', 'Starting second round of league play.');
    } catch (error) {
      console.error('Error advancing to League Round 2:', error);
      showAlert('Error', 'Could not advance to Round 2. Please try again.');
    }
  };

  const createFinals = useCallback(
    async (tournamentData) => {
      const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
      const semifinalMatches = updatedTournament.matches.filter((m) => m.round === 2 && m.matchType === 'semifinal' && m.status === 'completed');
      if (semifinalMatches.length !== 2) return;
      const semifinal1Winner = updatedTournament.teams.find((t) => t.id === semifinalMatches[0].winnerId);
      const semifinal2Winner = updatedTournament.teams.find((t) => t.id === semifinalMatches[1].winnerId);
      if (!semifinal1Winner || !semifinal2Winner) return;
      const finals = { id: 'round2_finals', round: 2, matchType: 'final', teamA: semifinal1Winner, teamB: semifinal2Winner, winnerId: null, status: 'pending' };
      updatedTournament.matches.push(finals);
      updatedTournament.currentMatchId = finals.id;
      try {
        const savedTournament = await updateTournamentRecord(updatedTournament);
        setTournament(savedTournament);
        showAlert('Finals', 'Championship match is ready.');
      } catch (error) {
        console.error('Error creating finals:', error);
        showAlert('Error', 'Could not create finals. Please try again.');
      }
    },
    [setTournament, showAlert]
  );

  useEffect(() => {
    if (tournament.currentRound === 2) {
      const semifinalMatches = tournament.matches.filter((m) => m.round === 2 && m.matchType === 'semifinal');
      const completedSemifinals = semifinalMatches.filter((m) => m.status === 'completed');
      const finalsExists = tournament.matches.some((m) => m.matchType === 'final');
      if (completedSemifinals.length === 2 && !finalsExists) {
        setTimeout(() => createFinals(tournament), 1000);
      }
    }
  }, [tournament, createFinals]);

  const confirmEndTournament = async () => {
    setShowEndConfirm(false);
    try {
      await removeTournamentRecord(tournament.id);
      setTournament(null);
      setScreen('setup');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      showAlert('Error', 'Could not delete tournament.');
    }
  };

  const teamStats = useMemo(() => {
    const stats = new Map(tournament.teams.map((team) => [team.id, emptyStats()]));

    tournament.matches.forEach((match) => {
      if (match.status !== 'completed' || !match.winnerId) return;

      const teamAStats = stats.get(match.teamA.id);
      const teamBStats = stats.get(match.teamB.id);
      if (!teamAStats || !teamBStats) return;

      if (match.winnerId === match.teamA.id) {
        teamAStats.wins += 1;
        teamBStats.losses += 1;
      } else if (match.winnerId === match.teamB.id) {
        teamBStats.wins += 1;
        teamAStats.losses += 1;
      }

      const padelSetTotals = getPadelSetTotals(match.score, match.teamA.id, match.teamB.id);
      const teamAScore = padelSetTotals ? padelSetTotals.teamA : Number(match.score?.teamA);
      const teamBScore = padelSetTotals ? padelSetTotals.teamB : Number(match.score?.teamB);
      if (Number.isFinite(teamAScore) && Number.isFinite(teamBScore)) {
        teamAStats.scored += teamAScore;
        teamAStats.conceded += teamBScore;
        teamBStats.scored += teamBScore;
        teamBStats.conceded += teamAScore;
      }
    });

    stats.forEach((value) => {
      value.diff = value.scored - value.conceded;
    });

    return stats;
  }, [tournament.matches, tournament.teams]);

  const leaderboard = useMemo(() => {
    if (!tournament || !tournament.teams) return [];
    return [...tournament.teams].sort((a, b) => {
      const statsA = teamStats.get(a.id) || emptyStats();
      const statsB = teamStats.get(b.id) || emptyStats();
      return (b.points || 0) - (a.points || 0) || statsB.wins - statsA.wins || statsB.diff - statsA.diff;
    });
  }, [teamStats, tournament]);

  const currentRoundMatches = useMemo(() => tournament.matches.filter((m) => m.round === tournament.currentRound), [tournament.matches, tournament.currentRound]);
  const pendingMatches = useMemo(() => currentRoundMatches.filter((m) => m.status === 'pending'), [currentRoundMatches]);
  const completedMatches = useMemo(() => tournament.matches.filter((m) => m.status === 'completed'), [tournament.matches]);
  const courtCount = useMemo(() => Math.max(1, Math.min(Number(tournament.courtCount || 1), 3)), [tournament.courtCount]);
  const currentMatch = useMemo(() => {
    if (tournament.currentMatchId) {
      return pendingMatches.find((m) => m.id === tournament.currentMatchId) || pendingMatches[0];
    }
    return pendingMatches[0];
  }, [pendingMatches, tournament.currentMatchId]);
  const activeMatches = useMemo(() => {
    if (!currentMatch) return [];
    const rest = pendingMatches.filter((m) => !currentMatch || m.id !== currentMatch.id);
    return [currentMatch, ...distributeMatchesFairly(rest).slice(0, courtCount - 1)];
  }, [courtCount, pendingMatches, currentMatch]);
  const upcomingMatches = useMemo(() => {
    const activeIds = new Set(activeMatches.map((match) => match.id));
    return distributeMatchesFairly(pendingMatches.filter((match) => !activeIds.has(match.id)));
  }, [activeMatches, pendingMatches]);

  const finalMatch = useMemo(() => tournament.matches.find((m) => m.matchType === 'final' && m.status === 'completed'), [tournament.matches]);
  const isTournamentFinished =
    tournament.format === 'league'
      ? tournament.currentRound === 2 && tournament.matches.filter((m) => m.round === 2).every((m) => m.status === 'completed')
      : Boolean(finalMatch);
  const champion =
    tournament.format === 'league'
      ? leaderboard[0]
      : finalMatch
        ? tournament.teams.find((team) => team.id === finalMatch.winnerId)
        : null;

  const getRoundTitle = () => {
    if (tournament.format === 'league') {
      if (tournament.currentRound === 1) return 'Round 1 - First League Round';
      if (tournament.currentRound === 2) return 'Round 2 - Second League Round';
      return `Round ${tournament.currentRound} - League`;
    }

    if (tournament.currentRound === 1) return 'Round 1 - Group Stage';
    if (tournament.currentRound === 2) {
      const finalsExists = tournament.matches.some((m) => m.matchType === 'final');
      return finalsExists ? 'Round 2 - Final' : 'Round 2 - Semifinals';
    }
    return `Round ${tournament.currentRound}`;
  };

  const completedInRound = currentRoundMatches.filter((m) => m.status === 'completed').length;

  return (
    <div className="space-y-4 rounded-b-lg border-x border-b border-slate-800 bg-slate-950 p-3 sm:space-y-5 sm:p-6">
      <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{getRoundTitle()}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {completedInRound} of {currentRoundMatches.length} matches completed
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Best of {scoringSettings.maxSets} · {scoringSettings.deuceMode === 'golden' ? 'golden point' : 'advantage'} at deuce
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <StatPill label="Teams" value={tournament.teams.length} />
            <StatPill label="Courts" value={courtCount} />
            <StatPill label="Pending" value={pendingMatches.length} />
            <StatPill label="Done" value={completedMatches.length} />
          </div>
        </div>
      </section>

      {shareLink && (
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">Share Tournament</h2>
              <p className="text-sm text-slate-400">Share this link so everyone sees live updates.</p>
              <p className="mt-2 break-all rounded bg-slate-950 p-2 text-xs text-slate-500">{shareLink}</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:w-36">
              <button
                type="button"
                onClick={handleCopyShareLink}
                disabled={isCopyingLink}
                className="min-h-11 rounded-lg bg-sky-600 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCopyingLink ? 'Copying...' : 'Copy Link'}
              </button>
              {copyFeedback && <span className="text-center text-xs font-semibold text-emerald-300">{copyFeedback}</span>}
            </div>
          </div>
        </section>
      )}

      {isTournamentFinished && <FinishedSummary champion={champion} leaderboard={leaderboard} completedMatches={completedMatches} />}

      {activeMatches.length > 0 ? (
        <section className="-mx-3 border-y border-emerald-400/40 bg-slate-950 p-3 shadow-2xl sm:mx-0 sm:rounded-lg sm:border sm:p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Active Courts</p>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                {activeMatches.length} court{activeMatches.length > 1 ? 's' : ''} playing
              </h2>
            </div>
            <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300">Point Scoring</span>
          </div>
          <div className="space-y-4">
            {activeMatches.map((match, index) => (
              <div key={match.id} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Court {index + 1}</p>
                    <h3 className="text-base font-bold text-white">
                      {match.matchType === 'final' ? 'Championship Final' : match.matchType === 'semifinal' ? 'Semifinal' : 'Now Playing'}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-400">
                    {getTeamName(match.teamA)} vs {getTeamName(match.teamB)}
                  </p>
                </div>
                <CurrentMatchCard
                  match={match}
                  onDeclareWinner={handleDeclareWinner}
                  onScoreChange={handleUpdateMatchScore}
                  scoringSettings={scoringSettings}
                />
              </div>
            ))}
          </div>
        </section>
      ) : !isTournamentFinished ? (
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-5 text-center">
          {tournament.currentRound === 1 ? (
            <h2 className="text-xl font-bold text-sky-300">Advancing to Round 2...</h2>
          ) : (
            <h2 className="text-xl font-bold text-emerald-300">Preparing next match...</h2>
          )}
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Leaderboard</h2>
          <span className="text-xs font-semibold text-slate-400">Pts / W-L / Diff</span>
        </div>
        <div className="space-y-2">
          {leaderboard.map((team, index) => {
            const isTop4 = index < 4 && tournament.currentRound === 1 && tournament.format !== 'league';
            const isChampion = champion?.id === team.id && isTournamentFinished;
            const stats = teamStats.get(team.id) || emptyStats();
            return (
              <div
                key={team.id}
                className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-lg border p-3 ${
                  isChampion
                    ? 'border-amber-300 bg-amber-400 text-slate-950'
                    : isTop4
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800'
                }`}
              >
                <span className={`text-center text-sm font-black ${isChampion ? 'text-slate-950' : 'text-slate-400'}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="break-words font-bold leading-tight">{getTeamName(team)}</p>
                  {isTop4 && !isChampion && <p className="mt-1 text-xs font-bold text-emerald-300">Qualified position</p>}
                  {isChampion && <p className="mt-1 text-xs font-black text-slate-900">Champion</p>}
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black tabular-nums ${isChampion ? 'text-slate-950' : 'text-emerald-300'}`}>{team.points || 0}</p>
                  <p className={`text-xs font-semibold tabular-nums ${isChampion ? 'text-slate-900' : 'text-slate-400'}`}>
                    {stats.wins}-{stats.losses} / {stats.diff > 0 ? '+' : ''}
                    {stats.diff}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {upcomingMatches.length > 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-3 text-xl font-bold">Upcoming Matches</h2>
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} onSetCurrent={setAsCurrentMatch} isCurrent={tournament.currentMatchId === match.id} />
            ))}
          </div>
        </section>
      )}

      {completedMatches.length > 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-3 text-xl font-bold">Completed Matches</h2>
          <div className="space-y-3">
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} isCurrent={false} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setShowEditTeams(true)} className="min-h-12 rounded-lg bg-sky-600 py-3 font-bold text-white transition-colors hover:bg-sky-500">
          Edit Teams
        </button>
        <button onClick={() => setShowGameHistory(true)} className="min-h-12 rounded-lg bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-500">
          Match History
        </button>
      </section>

      <button onClick={() => setShowEndConfirm(true)} className="min-h-12 w-full rounded-lg border border-red-500/50 bg-red-600/20 py-3 font-bold text-red-200 transition-colors hover:bg-red-600 hover:text-white">
        End Tournament
      </button>

      {showEndConfirm && (
        <ConfirmationModal title="End Tournament?" message="Are you sure you want to end and delete this tournament? This action cannot be undone." onConfirm={confirmEndTournament} onCancel={() => setShowEndConfirm(false)} />
      )}

      {showEditTeams && (
        <EditTeamsModal tournament={tournament} setTournament={setTournament} onClose={() => setShowEditTeams(false)} showAlert={showAlert} />
      )}

      {showGameHistory && (
        <GameHistoryModal tournament={tournament} setTournament={setTournament} onClose={() => setShowGameHistory(false)} showAlert={showAlert} />
      )}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
      <p className="text-lg font-black tabular-nums text-white">{value}</p>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

function FinishedSummary({ champion, leaderboard, completedMatches }) {
  const topTeams = leaderboard.slice(0, 3);

  return (
    <section className="rounded-lg border border-amber-300/60 bg-amber-400/10 p-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Tournament Finished</p>
        <h2 className="mt-1 text-2xl font-black text-white">Champion</h2>
        <p className="mt-2 text-xl font-black text-amber-200">{champion ? getTeamName(champion) : 'Champion pending'}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Final Ranking</h3>
          <div className="space-y-2">
            {topTeams.map((team, index) => (
              <div key={team.id} className="flex items-center gap-3 rounded-lg bg-slate-900 p-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-sm font-black text-slate-950">{index + 1}</span>
                <span className="min-w-0 flex-1 break-words font-bold text-white">{getTeamName(team)}</span>
                <span className="font-black text-emerald-300">{team.points || 0} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-center sm:min-w-36">
          <p className="text-3xl font-black tabular-nums text-white">{completedMatches.length}</p>
          <p className="text-sm font-semibold text-slate-400">matches played</p>
        </div>
      </div>
    </section>
  );
}
