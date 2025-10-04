import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { removeTournamentRecord, updateTournamentRecord } from '../utils/tournamentService';
import { distributeMatchesFairly } from '../utils/scheduling';
import CurrentMatchCard from '../components/CurrentMatchCard';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import EditTeamsModal from '../screens/modals/EditTeamsModal';
import GameHistoryModal from '../screens/modals/GameHistoryModal';

export default function TournamentScreen({ tournament, setTournament, showAlert, setScreen, shareLink }) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

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
      setCopyFeedback('Link copied!');
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


  const handleDeclareWinner = async (match, winnerId) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournament));

    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === match.id);
    if (matchIndex > -1) {
      updatedTournament.matches[matchIndex].winnerId = winnerId;
      updatedTournament.matches[matchIndex].status = 'completed';
    }

    const teamIndex = updatedTournament.teams.findIndex((t) => t.id === winnerId);
    if (teamIndex > -1) {
      updatedTournament.teams[teamIndex].points += 3;
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
    const sortedTeams = [...updatedTournament.teams].sort((a, b) => b.points - a.points);
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
      showAlert('Round 2!', 'Top 4 teams advance to semifinals!');
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
      showAlert('Round 2!', 'Starting second round of league play!');
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
        showAlert('Finals!', 'Championship match is ready!');
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

  const leaderboard = useMemo(() => {
    if (!tournament || !tournament.teams) return [];
    return [...tournament.teams].sort((a, b) => b.points - a.points);
  }, [tournament]);

  const currentRoundMatches = useMemo(() => tournament.matches.filter((m) => m.round === tournament.currentRound), [tournament.matches, tournament.currentRound]);
  const pendingMatches = useMemo(() => currentRoundMatches.filter((m) => m.status === 'pending'), [currentRoundMatches]);
  const completedMatches = useMemo(() => tournament.matches.filter((m) => m.status === 'completed'), [tournament.matches]);
  const currentMatch = useMemo(() => {
    if (tournament.currentMatchId) {
      return pendingMatches.find((m) => m.id === tournament.currentMatchId) || pendingMatches[0];
    }
    return pendingMatches[0];
  }, [pendingMatches, tournament.currentMatchId]);
  const upcomingMatches = useMemo(() => {
    const rest = pendingMatches.filter((m) => !currentMatch || m.id !== currentMatch.id);
    return distributeMatchesFairly(rest);
  }, [pendingMatches, currentMatch]);

  const isTournamentFinished = tournament.format === 'league' ? tournament.currentRound === 2 && tournament.matches.filter((m) => m.round === 2).every((m) => m.status === 'completed') : tournament.currentRound === 2 && tournament.matches.some((m) => m.matchType === 'final' && m.status === 'completed');

  const getRoundTitle = () => {
    if (tournament.format === 'league') {
      if (tournament.currentRound === 1) return 'Round 1 - First League Round';
      if (tournament.currentRound === 2) return 'Round 2 - Second League Round';
      return `Round ${tournament.currentRound} - League`;
    } else {
      if (tournament.currentRound === 1) return 'Round 1 - Group Stage';
      if (tournament.currentRound === 2) {
        const finalsExists = tournament.matches.some((m) => m.matchType === 'final');
        return finalsExists ? 'Round 2 - Finals' : 'Round 2 - Semifinals';
      }
      return `Round ${tournament.currentRound}`;
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-b-lg space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-white">{getRoundTitle()}</h2>
        {tournament.format === 'league' ? (
          <>
            {tournament.currentRound === 1 && <p className="text-blue-100 mt-1">Every team plays every other team once</p>}
            {tournament.currentRound === 2 && <p className="text-blue-100 mt-1">Every team plays every other team again</p>}
          </>
        ) : (
          <>
            {tournament.currentRound === 1 && <p className="text-blue-100 mt-1">All teams compete - Top 4 advance to Round 2</p>}
            {tournament.currentRound === 2 && <p className="text-blue-100 mt-1">Championship Round</p>}
          </>
        )}
      </div>

      {shareLink && (
        <div className="bg-gray-900 p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Share Tournament</h2>
            <p className="text-sm text-gray-300">Share this link so everyone sees live updates.</p>
            <p className="text-xs text-gray-500 break-all mt-2">{shareLink}</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isCopyingLink}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isCopyingLink ? 'Copying...' : 'Copy Link'}
            </button>
            {copyFeedback && <span className="text-xs text-green-400 text-center">{copyFeedback}</span>}
          </div>
        </div>
      )}

      <div className="bg-gray-900 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-3">Leaderboard</h2>
        <div className="space-y-2">
          {leaderboard.map((team, index) => {
            const isTop4 = index < 4 && tournament.currentRound === 1 && tournament.format !== 'league';
            const isChampion = index === 0 && isTournamentFinished;
            return (
              <div key={team.id} className={`flex items-center text-lg p-2 rounded ${isChampion ? 'bg-yellow-600 text-black' : isTop4 ? 'bg-green-700' : 'bg-gray-800'}`}>
                <span className="font-bold text-gray-400 w-8">{isChampion ? '🏆' : `${index + 1}.`}</span>
                <span className="flex-grow">{team.players.join(' & ')}</span>
                <span className="font-bold text-green-400">{team.points} Points</span>
                {isTop4 && tournament.currentRound === 1 && tournament.format !== 'league' && <span className="ml-2 text-green-300 text-sm">✓ Qualified</span>}
              </div>
            );
          })}
        </div>
      </div>

      {currentMatch ? (
        <div className="bg-gray-900 p-4 rounded-lg border-2 border-blue-500">
          <h2 className="text-xl font-bold mb-3 text-center">
            🔥 {currentMatch.matchType === 'final' ? 'CHAMPIONSHIP FINAL' : currentMatch.matchType === 'semifinal' ? 'SEMIFINAL' : 'Current Match'} 🔥
          </h2>
          <CurrentMatchCard match={currentMatch} onDeclareWinner={handleDeclareWinner} />
        </div>
      ) : (
        <div className="bg-gray-900 p-4 rounded-lg text-center">
          {isTournamentFinished ? (
            <div>
              <h2 className="text-2xl font-bold text-yellow-400">🎉 TOURNAMENT CHAMPION! 🎉</h2>
              <p className="text-xl text-green-400 mt-2">{leaderboard[0]?.players.join(' & ')}</p>
            </div>
          ) : tournament.currentRound === 1 ? (
            <h2 className="text-2xl font-bold text-blue-400">🚀 Advancing to Round 2! 🚀</h2>
          ) : (
            <h2 className="text-2xl font-bold text-green-400">🎯 Preparing Next Match! 🎯</h2>
          )}
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Upcoming Matches</h2>
          <div className="space-y-3">{upcomingMatches.map((match) => (
            <MatchCard key={match.id} match={match} onSetCurrent={setAsCurrentMatch} isCurrent={tournament.currentMatchId === match.id} />
          ))}</div>
        </div>
      )}

      {completedMatches.length > 0 && (
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Completed Matches</h2>
          <div className="space-y-3">{completedMatches.map((match) => (
            <MatchCard key={match.id} match={match} isCurrent={false} />
          ))}</div>
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <button onClick={() => setShowEditTeams(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Edit Teams</button>
        <button onClick={() => setShowGameHistory(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors">Game History</button>
      </div>

      <button onClick={() => setShowEndConfirm(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors mt-4">End Tournament</button>

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


