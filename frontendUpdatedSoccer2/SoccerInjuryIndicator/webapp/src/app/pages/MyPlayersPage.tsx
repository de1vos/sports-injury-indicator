import { Link } from 'react-router';
import { teams } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';

export function MyPlayersPage() {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Get all favorite players with their team info
  const favoritePlayers = teams
    .flatMap(team =>
      team.players
        .filter(player => favorites.has(player.id))
        .map(player => ({ ...player, teamName: team.name, teamId: team.id }))
    )
    .sort((a, b) => b.injuryRisk - a.injuryRisk);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">My Players</h1>
        <p className="text-[#6B7280]">
          {favoritePlayers.length > 0
            ? `Tracking ${favoritePlayers.length} player${favoritePlayers.length !== 1 ? 's' : ''}`
            : 'Track your favorite players and their injury risk'}
        </p>
      </div>

      {favoritePlayers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[rgba(0,0,0,0.06)]">
          <svg className="w-16 h-16 text-[#6B7280] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">No players added yet</h3>
          <p className="text-[#6B7280] mb-4">Click the star icon on any player to add them to your watchlist</p>
          <Link
            to="/?search=open"
            className="inline-block px-6 py-3 bg-[#1A56DB] text-white rounded-full font-semibold hover:bg-[#0D47A1] transition-colors"
          >
            Browse Players
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritePlayers.map((player) => (
            <div key={player.id} className="relative bg-white rounded-2xl p-6 shadow-sm border border-[rgba(0,0,0,0.06)] hover:shadow-md transition-all">
              <Link to={`/team/${player.teamId}?player=${player.id}`} className="absolute inset-0 z-0 rounded-2xl" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F5F6FA] rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.kitNumber}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A2E]">{player.firstName} {player.lastName}</h3>
                    <p className="text-sm text-[#6B7280]">{player.position}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(player.id);
                  }}
                  className="p-1 hover:bg-[#F5F6FA] rounded-full transition-colors relative z-20"
                >
                  <svg className="w-6 h-6 text-[#F59E0B] fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                  <div className="text-xs text-[#6B7280] mb-1">Injury Risk</div>
                  <div
                    className="px-3 py-1 rounded-full text-lg font-bold text-white inline-block"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: player.injuryRisk > 50 ? '#DC2626' : player.injuryRisk > 35 ? '#EA580C' : '#0D9488'
                    }}
                  >
                    {player.injuryRisk}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] mb-1">Team</div>
                  <span className="text-sm text-[#1A56DB] font-medium">{player.teamName}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#6B7280] mb-1">Trend</div>
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

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[rgba(0,0,0,0.06)] relative z-10">
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] mb-1">Games Played</div>
                  <div className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {player.gamesPlayed}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] mb-1">Injuries</div>
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
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] mb-1">Age</div>
                  <div className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {player.age}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
