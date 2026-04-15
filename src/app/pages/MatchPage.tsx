import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { matches, teams, getRiskColor } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';

export function MatchPage() {
  const { matchId } = useParams();
  const match = matches.find(m => m.id === matchId);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const { toggleFavorite, isFavorite } = useFavorites();

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

  const homeTeam = teams.find(t => t.id === match.homeTeamId);
  const awayTeam = teams.find(t => t.id === match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const currentTeam = selectedTeam === 'home' ? homeTeam : awayTeam;
  const sortedPlayers = [...currentTeam.players].sort((a, b) => b.injuryRisk - a.injuryRisk);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#1A56DB] hover:underline mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>

        <div className="text-sm text-[#6B7280] mb-2">{formatDate(match.date)} • {match.time}</div>
        <div className="text-sm text-[#6B7280] mb-4">{match.venue}</div>
      </div>

      {/* Match Score Card */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden mb-8">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Home Team */}
            <div className="flex-1 text-center min-w-0">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A2E] mb-3 sm:mb-4 truncate px-2">{homeTeam.abbreviation}</h2>
              <div className="inline-flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                  Squad Avg Risk
                </div>
                <div
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-base sm:text-lg font-bold text-white"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: getRiskColor(homeTeam.avgRisk)
                  }}
                >
                  {homeTeam.avgRisk}%
                </div>
              </div>
            </div>

            {/* Score / Status */}
            <div className="flex-shrink-0 text-center px-2">
              {match.status === 'completed' && match.score ? (
                <div>
                  <div className="flex items-center gap-2 sm:gap-4 mb-2">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {match.score.home}
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-[#6B7280]">-</div>
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {match.score.away}
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A2E] mb-3 sm:mb-4 truncate px-2">{awayTeam.abbreviation}</h2>
              <div className="inline-flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                  Squad Avg Risk
                </div>
                <div
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-base sm:text-lg font-bold text-white"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: getRiskColor(awayTeam.avgRisk)
                  }}
                >
                  {awayTeam.avgRisk}%
                </div>
              </div>
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
          {homeTeam.name} Squad
        </button>
        <button
          onClick={() => setSelectedTeam('away')}
          className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
            selectedTeam === 'away'
              ? 'bg-[#1A56DB] text-white shadow-lg'
              : 'bg-white text-[#1A1A2E] border-2 border-[rgba(0,0,0,0.06)] hover:border-[#1A56DB]'
          }`}
        >
          {awayTeam.name} Squad
        </button>
      </div>

      {/* Players Grid */}
      <div>
        <h3 className="text-2xl font-bold text-[#1A1A2E] mb-6">
          {currentTeam.name} - Player Injury Risk
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200"
            >
              <Link to={`/team/${currentTeam.id}?player=${player.id}`} className="absolute inset-0 z-0" />
              <div className="p-6 relative z-10">
                {/* Player Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-[#1A1A2E]">
                        {player.firstName} {player.lastName}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(player.id);
                        }}
                        className="p-1 hover:bg-[#F5F6FA] rounded-full transition-colors relative z-20"
                      >
                        {isFavorite(player.id) ? (
                          <svg className="w-5 h-5 text-[#F59E0B] fill-current" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-[#6B7280] hover:text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-[#6B7280]">{player.position}</span>
                      <span className="text-sm text-[#6B7280]">•</span>
                      <span className="text-sm font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                        #{player.kitNumber}
                      </span>
                    </div>
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl text-2xl font-bold text-white text-center min-w-[60px]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: getRiskColor(player.injuryRisk)
                    }}
                  >
                    {player.injuryRisk}%
                  </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-[#F5F6FA] rounded-lg">
                    <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      Age
                    </div>
                    <div className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.age}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-[#F5F6FA] rounded-lg">
                    <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      GP
                    </div>
                    <div className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.gamesPlayed}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-[#F5F6FA] rounded-lg">
                    <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      INJ
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: player.injuries >= 2 ? '#DC2626' : '#1A1A2E'
                      }}
                    >
                      {player.injuries}
                    </div>
                  </div>
                </div>

                {/* Risk Trend */}
                <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                      Risk Trend
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: player.riskTrend > 0 ? '#DC2626' : '#0D9488'
                      }}
                    >
                      {player.riskTrend > 0 ? '↑' : '↓'}{Math.abs(player.riskTrend)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}