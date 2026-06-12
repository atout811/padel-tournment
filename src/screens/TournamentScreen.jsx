import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { removeTournamentRecord, updateTournamentRecord } from '../utils/tournamentService';
import { distributeMatchesFairly } from '../utils/scheduling';
import CurrentMatchCard from '../components/CurrentMatchCard';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import EditTeamsModal from '../screens/modals/EditTeamsModal';
import GameHistoryModal from '../screens/modals/GameHistoryModal';
import { normalizeScoringSettings } from '../utils/padelScoring';
import { buildLeaderboard, emptyTeamStats, selectActiveMatches, syncTeamPointsFromMatches } from '../utils/tournamentRules';

const getTeamName = (team) => team.players.join(' & ');

export default function TournamentScreen({ tournament, setTournament, showAlert, setScreen, shareLink }) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const scoringSettings = useMemo(() => normalizeScoringSettings(tournament.scoringSettings), [tournament.scoringSettings]);

  const { leaderboard, teamStats } = useMemo(() => buildLeaderboard(tournament), [tournament]);
  const currentRoundMatches = useMemo(() => tournament.matches.filter((match) => match.round === tournament.currentRound), [tournament.matches, tournament.currentRound]);
  const pendingMatches = useMemo(() => currentRoundMatches.filter((match) => match.status === 'pending'), [currentRoundMatches]);
  const completedMatches = useMemo(() => tournament.matches.filter((match) => match.status === 'completed'), [tournament.matches]);
  const courtCount = useMemo(() => Math.max(1, Math.min(Number(tournament.courtCount || 1), 3)), [tournament.courtCount]);
  const activeMatches = useMemo(
    () => selectActiveMatches(pendingMatches, courtCount, tournament.currentMatchId),
    [courtCount, pendingMatches, tournament.currentMatchId]
  );
  const courtSlots = useMemo(() => Array.from({ length: courtCount }, (_, index) => activeMatches[index] || null), [activeMatches, courtCount]);
  const upcomingMatches = useMemo(() => {
    const activeIds = new Set(activeMatches.map((match) => match.id));
    return distributeMatchesFairly(pendingMatches.filter((match) => !activeIds.has(match.id)));
  }, [activeMatches, pendingMatches]);

  const finalMatch = useMemo(() => tournament.matches.find((match) => match.matchType === 'final' && match.status === 'completed'), [tournament.matches]);
  const round2LeagueMatches = useMemo(() => tournament.matches.filter((match) => match.round === 2), [tournament.matches]);
  const isTournamentFinished =
    tournament.format === 'league'
      ? round2LeagueMatches.length > 0 && round2LeagueMatches.every((match) => match.status === 'completed')
      : Boolean(finalMatch);
  const champion =
    tournament.format === 'league'
      ? leaderboard[0]
      : finalMatch
        ? tournament.teams.find((team) => team.id === finalMatch.winnerId)
        : null;

  const completedInRound = currentRoundMatches.filter((match) => match.status === 'completed').length;
  const roundProgress = currentRoundMatches.length ? Math.round((completedInRound / currentRoundMatches.length) * 100) : 0;

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    if (!navigator?.clipboard?.writeText) {
      showAlert('Copy Unavailable', 'Your browser does not support automatic copying. Please copy the link manually.');
      return;
    }

    try {
      setIsCopyingLink(true);
      await navigator.clipboard.writeText(shareLink);
      setCopyFeedback('Copied');
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

  const handleDeclareWinner = async (match, result) => {
    const winnerId = typeof result === 'string' ? result : result?.winnerId;
    if (!winnerId) {
      showAlert('Winner Required', 'Choose which team won before saving the match.');
      return;
    }

    let updatedTournament = JSON.parse(JSON.stringify(tournament));
    const matchIndex = updatedTournament.matches.findIndex((item) => item.id === match.id);
    if (matchIndex === -1) {
      showAlert('Error', 'Could not find this match.');
      return;
    }

    updatedTournament.matches[matchIndex].winnerId = winnerId;
    updatedTournament.matches[matchIndex].status = 'completed';
    updatedTournament.matches[matchIndex].score = result?.score || {
      teamA: winnerId === match.teamA.id ? 1 : 0,
      teamB: winnerId === match.teamB.id ? 1 : 0,
    };
    updatedTournament = syncTeamPointsFromMatches(updatedTournament);

    if (updatedTournament.currentMatchId === match.id) {
      const nextPendingInRound = updatedTournament.matches.find(
        (item) => item.round === updatedTournament.currentRound && item.status === 'pending' && item.id !== match.id
      );
      updatedTournament.currentMatchId = nextPendingInRound ? nextPendingInRound.id : null;
    }

    const updatedRoundMatches = updatedTournament.matches.filter((item) => item.round === updatedTournament.currentRound);
    const updatedCompletedInRound = updatedRoundMatches.filter((item) => item.status === 'completed').length;
    const winnerTeam = updatedTournament.teams.find((team) => team.id === winnerId);

    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      setLastResult({
        title: `${winnerTeam ? getTeamName(winnerTeam) : 'Winner'} saved`,
        detail:
          updatedCompletedInRound === updatedRoundMatches.length
            ? `${getStageTitle(savedTournament)} complete. Preparing the next stage.`
            : `${updatedRoundMatches.length - updatedCompletedInRound} match${updatedRoundMatches.length - updatedCompletedInRound === 1 ? '' : 'es'} left in this stage.`,
      });

      if (updatedCompletedInRound === updatedRoundMatches.length && savedTournament.currentRound === 1) {
        if (savedTournament.format === 'league') {
          setTimeout(() => advanceToLeagueRound2(savedTournament), 700);
        } else {
          setTimeout(() => advanceToRound2(savedTournament), 700);
        }
      }
    } catch (error) {
      console.error('Error saving score:', error);
      showAlert('Error', 'Could not save the result. Please try again.');
    }
  };

  const setAsCurrentMatch = async (match) => {
    const updatedTournament = { ...tournament, currentMatchId: match.id };
    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
    } catch (error) {
      console.error('Error updating current match:', error);
      showAlert('Error', 'Could not set the current match. Please try again.');
    }
  };

  const advanceToRound2 = async (tournamentData) => {
    let updatedTournament = syncTeamPointsFromMatches(JSON.parse(JSON.stringify(tournamentData)));
    const semifinalsExist = updatedTournament.matches.some((match) => match.round === 2 && match.matchType === 'semifinal');
    if (semifinalsExist) return;

    const { leaderboard: rankedTeams } = buildLeaderboard(updatedTournament);
    const top4Teams = rankedTeams.slice(0, 4);
    if (top4Teams.length < 4) {
      showAlert('Cup Needs More Teams', 'Cup format needs at least 4 teams for semifinals. Add at least 8 players or choose League next time.');
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
      setLastResult({ title: 'Semifinals are ready', detail: 'Top 4 teams advanced from the Cup group stage.' });
    } catch (error) {
      console.error('Error advancing to Round 2:', error);
      showAlert('Error', 'Could not advance to semifinals. Please try again.');
    }
  };

  const advanceToLeagueRound2 = async (tournamentData) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
    updatedTournament.currentRound = 2;
    const firstPendingRound2 = updatedTournament.matches.find((match) => match.round === 2 && match.status === 'pending');
    updatedTournament.currentMatchId = firstPendingRound2 ? firstPendingRound2.id : null;
    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      setLastResult({ title: 'League Round 2 started', detail: 'Second-leg matches are now ready.' });
    } catch (error) {
      console.error('Error advancing to League Round 2:', error);
      showAlert('Error', 'Could not advance to Round 2. Please try again.');
    }
  };

  const createFinals = useCallback(
    async (tournamentData) => {
      const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
      const semifinalMatches = updatedTournament.matches.filter((match) => match.round === 2 && match.matchType === 'semifinal' && match.status === 'completed');
      if (semifinalMatches.length !== 2) return;
      if (updatedTournament.matches.some((match) => match.matchType === 'final')) return;

      const semifinal1Winner = updatedTournament.teams.find((team) => team.id === semifinalMatches[0].winnerId);
      const semifinal2Winner = updatedTournament.teams.find((team) => team.id === semifinalMatches[1].winnerId);
      if (!semifinal1Winner || !semifinal2Winner) return;

      const finals = { id: 'round2_finals', round: 2, matchType: 'final', teamA: semifinal1Winner, teamB: semifinal2Winner, winnerId: null, status: 'pending' };
      updatedTournament.matches.push(finals);
      updatedTournament.currentMatchId = finals.id;

      try {
        const savedTournament = await updateTournamentRecord(updatedTournament);
        setTournament(savedTournament);
        setLastResult({ title: 'Final is ready', detail: 'The championship match is on court next.' });
      } catch (error) {
        console.error('Error creating finals:', error);
        showAlert('Error', 'Could not create the final. Please try again.');
      }
    },
    [setTournament, showAlert]
  );

  useEffect(() => {
    if (tournament.currentRound === 2 && tournament.format !== 'league') {
      const semifinalMatches = tournament.matches.filter((match) => match.round === 2 && match.matchType === 'semifinal');
      const completedSemifinals = semifinalMatches.filter((match) => match.status === 'completed');
      const finalsExists = tournament.matches.some((match) => match.matchType === 'final');
      if (completedSemifinals.length === 2 && !finalsExists) {
        setTimeout(() => createFinals(tournament), 700);
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

  return (
    <div className="space-y-5 rounded-b-3xl border-x border-b border-[#DDE7DE] bg-white/90 p-4 shadow-xl shadow-[#163B2E]/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#0D3B2E] via-[#146C52] to-[#0E8F8A] p-5 text-white shadow-lg shadow-[#0D3B2E]/15">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFEFE5]">{tournament.format === 'league' ? 'League Tournament' : 'Cup Tournament'}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight">{getStageTitle(tournament)}</h2>
            <p className="mt-2 text-sm font-semibold text-[#E8F6EF]">
              {completedInRound} of {currentRoundMatches.length} matches complete, {pendingMatches.length} waiting.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <StatPill label="Players" value={tournament.players?.length || 0} />
            <StatPill label="Teams" value={tournament.teams.length} />
            <StatPill label="Courts" value={courtCount} />
            <StatPill label="Done" value={completedMatches.length} />
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#F5B84B] transition-all" style={{ width: `${roundProgress}%` }} />
        </div>
        <p className="mt-2 text-xs font-bold text-[#CFEFE5]">
          Best of {scoringSettings.maxSets}, {scoringSettings.deuceMode === 'golden' ? 'golden point' : 'advantage'} at deuce
        </p>
      </section>

      {shareLink && (
        <section className="rounded-3xl border border-[#BDEDEA] bg-[#E6FAF8] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-[#074A47]">Share live tournament</h2>
              <p className="text-sm font-semibold text-[#0E706B]">Players can follow scores and standings from this link.</p>
              <p className="mt-2 break-all rounded-2xl bg-white p-3 text-xs font-semibold text-[#0E706B]">{shareLink}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isCopyingLink}
              className="min-h-12 rounded-2xl bg-[#0E8F8A] px-5 font-black text-white transition hover:bg-[#0E706B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCopyingLink ? 'Copying...' : copyFeedback || 'Copy Link'}
            </button>
          </div>
        </section>
      )}

      {lastResult && (
        <section className="rounded-3xl border border-[#BFD0C2] bg-[#E8F6EF] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#146C52]">Result updated</p>
              <h3 className="mt-1 text-xl font-black text-[#18211C]">{lastResult.title}</h3>
              <p className="mt-1 text-sm font-bold text-[#146C52]">{lastResult.detail}</p>
            </div>
            <button type="button" onClick={() => setLastResult(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-lg font-black text-[#146C52]">
              x
            </button>
          </div>
        </section>
      )}

      {isTournamentFinished && (
        <FinishedSummary
          champion={champion}
          leaderboard={leaderboard}
          teamStats={teamStats}
          completedMatches={completedMatches}
          finalMatch={finalMatch}
          onStartNew={() => setShowEndConfirm(true)}
        />
      )}

      {!isTournamentFinished && (
        <section className="rounded-3xl border border-[#DDE7DE] bg-[#F1F7F2] p-4">
          <SectionHeader eyebrow="Active Courts" title={`${activeMatches.length} of ${courtCount} court${courtCount === 1 ? '' : 's'} playing`} detail="A team is never placed on two courts at the same time." />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {courtSlots.map((match, index) => (
              <CourtCard key={match?.id || `empty-court-${index}`} courtNumber={index + 1} match={match} onDeclareWinner={handleDeclareWinner} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
        <SectionHeader
          eyebrow={tournament.format === 'league' ? 'Standings' : 'Ranking'}
          title={tournament.format === 'league' ? 'League Table' : 'Cup Progress'}
          detail={tournament.format === 'league' ? 'Leader is highlighted by points, wins, then difference.' : 'Top 4 qualify from the group stage.'}
        />
        <div className="mt-4 space-y-2">
          {leaderboard.map((team, index) => {
            const stats = teamStats.get(team.id) || emptyTeamStats();
            const isLeader = index === 0;
            const isTop4 = index < 4 && tournament.currentRound === 1 && tournament.format !== 'league';
            const isChampion = champion?.id === team.id && isTournamentFinished;
            return (
              <StandingRow key={team.id} rank={index + 1} team={team} stats={stats} highlighted={isLeader || isTop4 || isChampion} label={getStandingLabel({ isLeader, isTop4, isChampion, format: tournament.format })} />
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MatchSection title="Upcoming Matches" detail={`${upcomingMatches.length} waiting after active courts`} emptyText="No upcoming matches in this stage.">
          {upcomingMatches.map((match) => (
            <MatchCard key={match.id} match={match} onSetCurrent={setAsCurrentMatch} isCurrent={tournament.currentMatchId === match.id} />
          ))}
        </MatchSection>

        <MatchSection title="Completed Matches" detail={`${completedMatches.length} result${completedMatches.length === 1 ? '' : 's'} saved`} emptyText="Completed results will appear here.">
          {completedMatches.map((match) => (
            <MatchCard key={match.id} match={match} isCurrent={false} />
          ))}
        </MatchSection>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setShowEditTeams(true)} className="min-h-12 rounded-2xl border border-[#DDE7DE] bg-white px-4 font-black text-[#18211C] shadow-sm transition hover:bg-[#F1F7F2]">
          Edit Teams
        </button>
        <button onClick={() => setShowGameHistory(true)} className="min-h-12 rounded-2xl border border-[#DDE7DE] bg-white px-4 font-black text-[#18211C] shadow-sm transition hover:bg-[#F1F7F2]">
          Match History
        </button>
      </section>

      <button onClick={() => setShowEndConfirm(true)} className="min-h-12 w-full rounded-2xl border border-red-200 bg-red-50 px-4 font-black text-red-700 transition hover:bg-red-100">
        End Tournament
      </button>

      {showEndConfirm && (
        <ConfirmationModal title="End Tournament?" message="This deletes the saved tournament from this device and Supabase if connected." onConfirm={confirmEndTournament} onCancel={() => setShowEndConfirm(false)} />
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

function getStageTitle(tournament) {
  if (tournament.format === 'league') {
    if (tournament.currentRound === 1) return 'League Round 1';
    if (tournament.currentRound === 2) return 'League Round 2';
    return `League Round ${tournament.currentRound}`;
  }

  if (tournament.currentRound === 1) return 'Cup Group Stage';
  if (tournament.matches.some((match) => match.matchType === 'final' && match.status !== 'completed')) return 'Cup Final';
  if (tournament.currentRound === 2) return 'Cup Semifinals';
  return `Cup Round ${tournament.currentRound}`;
}

function getMatchLabel(match) {
  if (match.matchType === 'final') return 'Championship Final';
  if (match.matchType === 'semifinal') return 'Semifinal';
  return 'Group Match';
}

function getStandingLabel({ isLeader, isTop4, isChampion, format }) {
  if (isChampion) return 'Champion';
  if (format === 'league' && isLeader) return 'Leader';
  if (isTop4) return 'Top 4';
  return '';
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/12 px-3 py-2">
      <p className="text-xl font-black tabular-nums text-white">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-[#CFEFE5]">{label}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, detail }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#146C52]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black text-[#18211C]">{title}</h2>
      {detail && <p className="mt-1 text-sm font-semibold text-[#65736A]">{detail}</p>}
    </div>
  );
}

function CourtCard({ courtNumber, match, onDeclareWinner }) {
  if (!match) {
    return (
      <div className="min-h-72 rounded-3xl border border-dashed border-[#BFD0C2] bg-white p-4 text-center">
        <div className="flex h-full min-h-64 flex-col items-center justify-center">
          <span className="rounded-full bg-[#F1F7F2] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#65736A]">Court {courtNumber}</span>
          <h3 className="mt-3 text-xl font-black text-[#18211C]">Open court</h3>
          <p className="mt-2 max-w-xs text-sm font-semibold text-[#65736A]">No safe match is available without reusing a team already playing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0E8F8A]">Court {courtNumber}</p>
          <h3 className="text-xl font-black text-[#18211C]">{getMatchLabel(match)}</h3>
        </div>
        <p className="rounded-2xl bg-[#F1F7F2] px-3 py-2 text-xs font-black text-[#65736A]">
          {getTeamName(match.teamA)} vs {getTeamName(match.teamB)}
        </p>
      </div>
      <CurrentMatchCard match={match} onDeclareWinner={onDeclareWinner} />
    </div>
  );
}

function StandingRow({ rank, team, stats, highlighted, label }) {
  return (
    <div className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-3xl border p-3 ${highlighted ? 'border-[#BFD0C2] bg-[#E8F6EF]' : 'border-[#DDE7DE] bg-[#F7FAF5]'}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${highlighted ? 'bg-[#168A5B] text-white' : 'bg-white text-[#65736A]'}`}>{rank}</span>
      <div className="min-w-0">
        <p className="break-words font-black leading-tight text-[#18211C]">{getTeamName(team)}</p>
        {label && <p className="mt-1 text-xs font-black uppercase tracking-wide text-[#146C52]">{label}</p>}
      </div>
      <div className="text-right">
        <p className="text-xl font-black tabular-nums text-[#18211C]">{stats.points}</p>
        <p className="text-xs font-bold tabular-nums text-[#65736A]">
          {stats.wins}-{stats.losses} / {stats.diff > 0 ? '+' : ''}
          {stats.diff}
        </p>
      </div>
    </div>
  );
}

function MatchSection({ title, detail, emptyText, children }) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <section className="rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-sm">
      <SectionHeader eyebrow="Match List" title={title} detail={detail} />
      <div className="mt-4 space-y-3">
        {hasChildren ? children : <p className="rounded-3xl border border-dashed border-[#BFD0C2] bg-[#F7FAF5] px-4 py-8 text-center text-sm font-bold text-[#65736A]">{emptyText}</p>}
      </div>
    </section>
  );
}

function FinishedSummary({ champion, leaderboard, teamStats, completedMatches, finalMatch, onStartNew }) {
  const topTeams = leaderboard.slice(0, 3);

  return (
    <section className="rounded-3xl border border-[#F5B84B]/50 bg-gradient-to-br from-[#FFF4D6] via-white to-[#E8F6EF] p-5 shadow-lg shadow-[#8A5A00]/10">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8A5A00]">Tournament Finished</p>
        <h2 className="mt-2 text-4xl font-black text-[#18211C]">Champion</h2>
        <p className="mt-3 text-2xl font-black text-[#146C52]">{champion ? getTeamName(champion) : 'Champion pending'}</p>
        {finalMatch && (
          <p className="mt-2 text-sm font-bold text-[#65736A]">
            Final: {getTeamName(finalMatch.teamA)} vs {getTeamName(finalMatch.teamB)}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="rounded-3xl border border-[#DDE7DE] bg-white p-3">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[#65736A]">Final Ranking</h3>
          <div className="space-y-2">
            {topTeams.map((team, index) => {
              const stats = teamStats.get(team.id) || emptyTeamStats();
              return (
                <div key={team.id} className="flex items-center gap-3 rounded-2xl bg-[#F7FAF5] p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF4D6] text-sm font-black text-[#8A5A00]">{index + 1}</span>
                  <span className="min-w-0 flex-1 break-words font-black text-[#18211C]">{getTeamName(team)}</span>
                  <span className="font-black text-[#65736A]">{stats.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[#DDE7DE] bg-white p-4 text-center sm:min-w-40">
          <p className="text-4xl font-black tabular-nums text-[#18211C]">{completedMatches.length}</p>
          <p className="text-sm font-bold text-[#65736A]">matches played</p>
          <button onClick={onStartNew} className="mt-4 min-h-11 w-full rounded-2xl bg-[#168A5B] px-4 font-black text-white transition hover:bg-[#0F6F49]">
            Start New
          </button>
        </div>
      </div>
    </section>
  );
}
