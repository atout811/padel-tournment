import React, { useState } from 'react';
import { updateTournamentRecord } from '../../utils/tournamentService';
import { summarizePadelScore } from '../../utils/padelScoring';

const getTeamName = (team) => team.players.join(' & ');

export default function GameHistoryModal({ tournament, setTournament, onClose, showAlert }) {
  const completedMatches = tournament.matches.filter((m) => m.status === 'completed');
  const [updatingMatchId, setUpdatingMatchId] = useState(null);

  const handleWinnerChange = async (match, newWinnerId) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === match.id);
    if (matchIndex === -1) return;

    const currentWinnerId = updatedTournament.matches[matchIndex].winnerId || null;
    if (currentWinnerId === (newWinnerId || null)) {
      return;
    }

    setUpdatingMatchId(match.id);

    const oldWinnerId = currentWinnerId;
    updatedTournament.matches[matchIndex].winnerId = newWinnerId || null;
    if (updatedTournament.matches[matchIndex].score?.sets) {
      updatedTournament.matches[matchIndex].score.winnerId = newWinnerId || null;
      updatedTournament.matches[matchIndex].score.isComplete = Boolean(newWinnerId);
    }
    if (!newWinnerId) {
      updatedTournament.matches[matchIndex].status = 'pending';
    }
    if (oldWinnerId) {
      const oldWinnerTeamIndex = updatedTournament.teams.findIndex((t) => t.id === oldWinnerId);
      if (oldWinnerTeamIndex > -1) {
        updatedTournament.teams[oldWinnerTeamIndex].points = Math.max(0, (updatedTournament.teams[oldWinnerTeamIndex].points || 0) - 3);
      }
    }
    if (newWinnerId) {
      const newWinnerTeamIndex = updatedTournament.teams.findIndex((t) => t.id === newWinnerId);
      if (newWinnerTeamIndex > -1) {
        updatedTournament.teams[newWinnerTeamIndex].points = (updatedTournament.teams[newWinnerTeamIndex].points || 0) + 3;
        updatedTournament.matches[matchIndex].status = 'completed';
      }
    }
    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      showAlert('Success', 'Match result updated successfully.');
    } catch (error) {
      console.error('Error updating match result:', error);
      showAlert('Error', 'Could not update match result. Please try again.');
    } finally {
      setUpdatingMatchId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Match History</h3>
            <p className="text-sm text-slate-400">{completedMatches.length} completed matches</p>
          </div>
          <button onClick={onClose} className="min-h-10 rounded-lg border border-slate-600 px-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
            Close
          </button>
        </div>

        {completedMatches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 py-8 text-center text-slate-400">No completed matches yet.</p>
        ) : (
          <div className="space-y-3">
            {completedMatches.map((match) => {
              const teamAWon = match.winnerId === match.teamA.id;
              const teamBWon = match.winnerId === match.teamB.id;
              const hasScore = Number.isFinite(Number(match.score?.teamA)) && Number.isFinite(Number(match.score?.teamB));
              const padelScoreSummary = summarizePadelScore(match.score, match.teamA.id, match.teamB.id);
              return (
                <div key={match.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                  <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className={`break-words font-semibold ${teamAWon ? 'text-amber-300' : 'text-white'}`}>{getTeamName(match.teamA)}</p>
                      <p className={`break-words font-semibold ${teamBWon ? 'text-amber-300' : 'text-white'}`}>{getTeamName(match.teamB)}</p>
                    </div>
                    <div className="grid content-center gap-2 text-center">
                      {padelScoreSummary ? (
                        <span className="max-w-32 rounded bg-slate-950 px-3 py-2 text-xs font-black leading-relaxed text-slate-100">
                          {padelScoreSummary}
                        </span>
                      ) : hasScore ? (
                        <>
                          <span className="rounded bg-slate-950 px-3 py-1 text-lg font-black tabular-nums">{match.score.teamA}</span>
                          <span className="rounded bg-slate-950 px-3 py-1 text-lg font-black tabular-nums">{match.score.teamB}</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">No score</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-3">
                    <label className="mb-2 block text-sm font-bold text-slate-300">Change Winner</label>
                    <select
                      value={match.winnerId || ''}
                      onChange={(e) => handleWinnerChange(match, e.target.value)}
                      disabled={updatingMatchId === match.id}
                      className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">No Winner</option>
                      <option value={match.teamA.id}>{getTeamName(match.teamA)}</option>
                      <option value={match.teamB.id}>{getTeamName(match.teamB)}</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
