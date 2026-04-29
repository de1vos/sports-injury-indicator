import { useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router';
import type { DashboardMatch } from '../api/dashboard';
import { getRiskColor } from '../data/mockData';
import { useTeamPlayers } from '../hooks/useApi';
import { useFavorites } from '../hooks/useFavorites';
import { StarIcon } from '../components/StarIcon';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

export function MatchPage() {
  const { matchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const match = (location.state as { match?: DashboardMatch } | null)?.match;
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const { toggleFavorite, isFavorite } = useFavorites();

  const activeTeamId = selectedTeam === 'home' ? match?.homeTeamId : match?.awayTeamId;
  const { data: players, loading: playersLoading } = useTeamPlayers(activeTeamId);

  const sortedPlayers = [...(players ?? [])].sort((a, b) => {
    const aInj = a.riskLevel === 'Injured' ? 1 : 0;
    const bInj = b.riskLevel === 'Injured' ? 1 : 0;
    if (aInj !== bInj) return bInj - aInj;
    return b.injuryRisk - a.injuryRisk;
  });

  if (!match) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-4">Match not found</h1>
          <Link to="/" className="text-[#1A56DB] hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#1A56DB] hover:underline"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </button>
        <div className="text-sm text-[#6B7280] mt-2">{formatDate(match.date)} · {match.time}</div>
      </div>

      {/* Match Score Card */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden mb-8">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Home Team */}
            <div className="flex-1 text-center min-w-0">
              <Link to={`/team/${match.homeTeamId}`} className="flex flex-col items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-[rgba(0,0,0,0.06)]">
                  <img src={match.homeTeamLogo} alt={match.homeTeamName} className="w-12 h-12 object-contain" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] truncate px-2">{match.homeTeamName}</h2>
              </Link>
              {!match.isPlayed && match.homeAvgRisk > 0 && (
                <div className="inline-flex flex-col gap-1">
                  <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>Squad Avg Risk</div>
                  <div
                    className="px-4 py-1.5 rounded-full text-base font-bold text-white"
                    style={{ fontFamily: 'var(--font-mono)', backgroundColor: getRiskColor(match.homeAvgRisk) }}
                  >
                    {match.homeAvgRisk}%
                  </div>
                </div>
              )}
            </div>

            {/* Score / VS */}
            <div className="flex-shrink-0 text-center px-2">
              {match.isPlayed && match.homeGoals !== null ? (
                <div>
                  <div className="flex items-center gap-2 sm:gap-4 mb-2">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {match.homeGoals}
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-[#6B7280]">-</div>
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {match.awayGoals}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-[#0D9488] font-semibold">Full Time</div>
                </div>
              ) : (
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-[#1A56DB] mb-2">VS</div>
                  <div className="text-xs sm:text-sm text-[#1A56DB] font-semibold">Upcoming</div>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center min-w-0">
              <Link to={`/team/${match.awayTeamId}`} className="flex flex-col items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-[rgba(0,0,0,0.06)]">
                  <img src={match.awayTeamLogo} alt={match.awayTeamName} className="w-12 h-12 object-contain" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] truncate px-2">{match.awayTeamName}</h2>
              </Link>
              {!match.isPlayed && match.awayAvgRisk > 0 && (
                <div className="inline-flex flex-col gap-1">
                  <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>Squad Avg Risk</div>
                  <div
                    className="px-4 py-1.5 rounded-full text-base font-bold text-white"
                    style={{ fontFamily: 'var(--font-mono)', backgroundColor: getRiskColor(match.awayAvgRisk) }}
                  >
                    {match.awayAvgRisk}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Selector */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setSelectedTeam('home')}
          className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
            selectedTeam === 'home'
              ? 'bg-[#1A56DB] text-white shadow-lg'
              : 'bg-white text-[#1A1A2E] border-2 border-[rgba(0,0,0,0.06)] hover:border-[#1A56DB]'
          }`}
        >
          {match.homeTeamName}
        </button>
        <button
          onClick={() => setSelectedTeam('away')}
          className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
            selectedTeam === 'away'
              ? 'bg-[#1A56DB] text-white shadow-lg'
              : 'bg-white text-[#1A1A2E] border-2 border-[rgba(0,0,0,0.06)] hover:border-[#1A56DB]'
          }`}
        >
          {match.awayTeamName}
        </button>
      </div>

      {/* Players Grid */}
      <div>
        <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">
          {selectedTeam === 'home' ? match.homeTeamName : match.awayTeamName} — Player Injury Risk
        </h3>
        <p className="text-sm text-[#6B7280] mb-6">Sorted by injury risk · Injured players listed first</p>

        {playersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-[rgba(0,0,0,0.06)] animate-pulse">
                <div className="h-24 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPlayers.map((player) => {
              const isInjured = player.riskLevel === 'Injured';
              const teamId = selectedTeam === 'home' ? match.homeTeamId : match.awayTeamId;
              return (
                <div
                  key={player.id}
                  className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200"
                >
                  <Link to={`/team/${teamId}?player=${player.id}`} className="absolute inset-0 z-0" />
                  <div className="p-5 relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-[#1A1A2E] truncate">
                          {player.firstName} {player.lastName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#6B7280]">{player.position || '—'}</span>
                          {player.kitNumber ? (
                            <>
                              <span className="text-xs text-[#6B7280]">·</span>
                              <span className="text-xs font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                                #{player.kitNumber}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className="px-3 py-1.5 rounded-xl text-base font-bold text-white text-center min-w-[52px]"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: isInjured ? '#DC2626' : getRiskColor(player.injuryRisk),
                          }}
                        >
                          {isInjured ? 'INJ' : `${player.injuryRisk}%`}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(player.id);
                          }}
                          className="p-1.5 hover:bg-[#F5F6FA] rounded-full transition-colors relative z-20"
                        >
                          <StarIcon
                            filled={isFavorite(player.id)}
                            className={isFavorite(player.id) ? 'w-4 h-4 text-[#F59E0B] fill-current' : 'w-4 h-4 text-[#6B7280] hover:text-[#F59E0B]'}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[rgba(0,0,0,0.06)]">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: isInjured ? '#DC2626' : '#0D9488', color: 'white' }}
                      >
                        {isInjured ? 'Injured' : 'Fit'}
                      </span>
                    </div>
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
