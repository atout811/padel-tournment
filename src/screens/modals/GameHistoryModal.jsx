import React, { useState } from 'react';
import { updateTournamentRecord } from '../../utils/tournamentService';
import { summarizePadelScore } from '../../utils/padelScoring';
import { syncTeamPointsFromMatches } from '../../utils/tournamentRules';

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

    updatedTournament.matches[matchIndex].winnerId = newWinnerId || null;
    if (updatedTournament.matches[matchIndex].score?.sets) {
      updatedTournament.matches[matchIndex].score.winnerId = newWinnerId || null;
      updatedTournament.matches[matchIndex].score.isComplete = Boolean(newWinnerId);
    }
    if (!newWinnerId) {
      updatedTournament.matches[matchIndex].status = 'pending';
    }
    if (newWinnerId) {
      updatedTournament.matches[matchIndex].status = 'completed';
    }
    try {
      const savedTournament = await updateTournamentRecord(syncTeamPointsFromMatches(updatedTournament));
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D3B2E]/75 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#DDE7DE] bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-[#18211C]">Match History</h3>
            <p className="text-sm font-semibold text-[#65736A]">{completedMatches.length} completed matches</p>
          </div>
          <button onClick={onClose} className="min-h-10 rounded-2xl border border-[#DDE7DE] px-3 text-sm font-black text-[#18211C] hover:bg-[#F1F7F2]">
            Close
          </button>
        </div>

        {completedMatches.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[#BFD0C2] bg-[#F7FAF5] py-8 text-center font-bold text-[#65736A]">No completed matches yet.</p>
        ) : (
          <div className="space-y-3">
            {completedMatches.map((match) => {
              const teamAWon = match.winnerId === match.teamA.id;
              const teamBWon = match.winnerId === match.teamB.id;
              const hasScore = Number.isFinite(Number(match.score?.teamA)) && Number.isFinite(Number(match.score?.teamB));
              const padelScoreSummary = summarizePadelScore(match.score, match.teamA.id, match.teamB.id);
              return (
                <div key={match.id} className="rounded-3xl border border-[#DDE7DE] bg-[#F7FAF5] p-4">
                  <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className={`break-words font-black ${teamAWon ? 'text-[#146C52]' : 'text-[#18211C]'}`}>{getTeamName(match.teamA)}</p>
                      <p className={`break-words font-black ${teamBWon ? 'text-[#146C52]' : 'text-[#18211C]'}`}>{getTeamName(match.teamB)}</p>
                    </div>
                    <div className="grid content-center gap-2 text-center">
                      {padelScoreSummary ? (
                        <span className="max-w-32 rounded-2xl bg-white px-3 py-2 text-xs font-black leading-relaxed text-[#18211C]">
                          {padelScoreSummary}
                        </span>
                      ) : hasScore ? (
                        <>
                          <span className="rounded-2xl bg-white px-3 py-1 text-lg font-black tabular-nums text-[#18211C]">{match.score.teamA}</span>
                          <span className="rounded-2xl bg-white px-3 py-1 text-lg font-black tabular-nums text-[#18211C]">{match.score.teamB}</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-[#65736A]">No score</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-[#DDE7DE] pt-3">
                    <label className="mb-2 block text-sm font-black text-[#65736A]">Change Winner</label>
                    <select
                      value={match.winnerId || ''}
                      onChange={(e) => handleWinnerChange(match, e.target.value)}
                      disabled={updatingMatchId === match.id}
                      className="min-h-12 w-full rounded-2xl border border-[#DDE7DE] bg-white p-2 font-bold text-[#18211C] outline-none focus:border-[#168A5B] focus:ring-4 focus:ring-[#E8F6EF] disabled:cursor-not-allowed disabled:opacity-60"
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
