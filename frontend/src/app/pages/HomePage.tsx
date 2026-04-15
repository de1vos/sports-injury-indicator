import { Link } from 'react-router';
import { matches, teams } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import { OngoingMatchCard } from '../components/OngoingMatchCard';

export function HomePage() {
  const { toggleFavorite, isFavorite } = useFavorites();

  const getTeamById = (id: string) => teams.find(t => t.id === id);

  // Separate matches by status
  const ongoingMatches = matches.filter(m => m.status === 'ongoing');
  const completedMatches = matches.filter(m => m.status === 'completed');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get upcoming matches with high risk player counts for both teams
  const upcomingMatchesData = matches
    .filter(m => m.status === 'upcoming')
    .map(match => {
      const homeTeam = getTeamById(match.homeTeamId);
      const awayTeam = getTeamById(match.awayTeamId);
      if (!homeTeam || !awayTeam) return null;

      const homeHighRiskCount = homeTeam.players.filter(p => p.injuryRisk > 50).length;
      const awayHighRiskCount = awayTeam.players.filter(p => p.injuryRisk > 50).length;
      const totalHighRisk = homeHighRiskCount + awayHighRiskCount;

      return {
        match,
        homeTeam,
        awayTeam,
        homeHighRiskCount,
        awayHighRiskCount,
        totalHighRisk
      };
    })
    .filter(item => item !== null && item.totalHighRisk > 0)
    .sort((a, b) => b.totalHighRisk - a.totalHighRisk)
    .slice(0, 6);

  // Get all high risk players across all teams
  const INJURY_RISK_THRESHOLD = 50;
  const highRiskPlayers = teams
    .flatMap(team =>
      team.players
        .filter(p => p.injuryRisk >= INJURY_RISK_THRESHOLD)
        .map(player => ({
          ...player,
          teamId: team.id,
          teamName: team.name,
          teamColor: team.accentColor
        }))
    )
    .sort((a, b) => b.injuryRisk - a.injuryRisk)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#1A56DB] via-[#1A56DB] to-[#4A7FE8] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <h1 className="text-4xl font-bold mb-2">Injury risk & match monitoring</h1>
          <p className="text-blue-100 text-lg">
            Monitor predicted injury risk and view player availability & return-to-play data
          </p>
        </div>
      </div>

      {/* Match Cards - Horizontal Scroll */}
      <div className="bg-gradient-to-b from-[#4A7FE8] via-[#6B9BF0] to-[#F5F6FA] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {[...matches]
              .filter(match => match.status !== 'ongoing')
              .sort((a, b) => {
                // Upcoming matches come first
                if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
                if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
                return 0;
              })
              .slice(0, 12)
              .map((match) => {
              const homeTeam = getTeamById(match.homeTeamId);
              const awayTeam = getTeamById(match.awayTeamId);
              if (!homeTeam || !awayTeam) return null;

              // Render completed and upcoming matches with regular card
              return (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className="flex-shrink-0 w-[200px] bg-white rounded-2xl p-4 hover:shadow-lg transition-all border border-[rgba(0,0,0,0.06)]"
                >
                  {/* Teams */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="text-lg font-bold"
                        style={{ color: homeTeam.accentColor, fontFamily: 'var(--font-sans)' }}
                      >
                        {homeTeam.name.substring(0, 3).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {homeTeam.avgRisk}%
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="text-lg font-bold"
                        style={{ color: awayTeam.accentColor, fontFamily: 'var(--font-sans)' }}
                      >
                        {awayTeam.name.substring(0, 3).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {awayTeam.avgRisk}%
                      </span>
                    </div>
                  </div>

                  {/* Score or VS */}
                  <div className="text-center mb-3 py-2">
                    {match.status === 'completed' && match.score ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {match.score.home}
                        </span>
                        <span className="text-[#6B7280]">-</span>
                        <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {match.score.away}
                        </span>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-[#6B7280]">VS</div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-center mb-3">
                    <div className="text-xs text-[#6B7280]">{formatDate(match.date)}</div>
                    <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>{match.time}</div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      match.status === 'completed'
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-[#1A56DB] text-white'
                    }`}>
                      {match.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - High Risk Players */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A2E]">HIGH RISK PLAYERS</h2>
                <p className="text-sm text-[#6B7280] mt-1">Players with injury risk above {INJURY_RISK_THRESHOLD}%</p>
              </div>
              <Link to="/my-players" className="text-sm text-[#1A56DB] hover:underline">
                View all
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] overflow-hidden">
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {highRiskPlayers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#6B7280]">No high risk players found</p>
                  </div>
                ) : (
                  highRiskPlayers.map((player, index) => (
                    <Link
                      key={player.id}
                      to={`/team/${player.teamId}?player=${player.id}`}
                      className="block p-4 hover:bg-[#F5F6FA] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8">
                          <span className="text-lg font-bold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                            {index + 1}
                          </span>
                        </div>

                        {/* Kit Number Badge */}
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                          style={{ backgroundColor: player.teamColor }}
                        >
                          #{player.kitNumber}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#1A1A2E]">
                            {player.firstName} {player.lastName}
                          </h4>
                          <p className="text-sm text-[#6B7280]">
                            {player.teamName} • {player.position}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#6B7280]">
                              {player.injuries} injuries this season
                            </span>
                          </div>
                        </div>

                        {/* Risk Badge */}
                        <div className="flex-shrink-0 text-right">
                          <div
                            className="px-3 py-2 rounded-xl font-bold text-white text-lg"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              backgroundColor: player.injuryRisk > 65 ? '#DC2626' : player.injuryRisk > 50 ? '#EA580C' : '#F59E0B'
                            }}
                          >
                            {player.injuryRisk}%
                          </div>
                          <div className="text-xs text-[#6B7280] mt-1">
                            Injury Risk
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - High Risk Teams */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A2E]">UPCOMING MATCHES</h2>
                <p className="text-sm text-[#6B7280] mt-1">Teams with players above injury risk threshold</p>
              </div>
              <Link to="/teams" className="text-sm text-[#1A56DB] hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {upcomingMatchesData.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-[rgba(0,0,0,0.06)]">
                  <p className="text-[#6B7280]">No upcoming match data available</p>
                </div>
              ) : (
                upcomingMatchesData.map((data, matchIndex) => (
                  <div key={data.match.id} className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] overflow-hidden p-4">
                    {/* Match Header */}
                    <div className="flex items-center justify-end mb-4">
                      <span className="text-xs text-[#6B7280]">
                        {data.totalHighRisk} total player{data.totalHighRisk !== 1 ? 's' : ''} at risk
                      </span>
                    </div>

                    {/* Teams Side by Side */}
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-4">
                      {/* Home Team */}
                      <Link
                        to={`/team/${data.homeTeam.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F6FA] transition-colors"
                      >
                        {/* Team Logo */}
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: data.homeTeam.accentColor }}
                        >
                          {data.homeTeam.name.substring(0, 3).toUpperCase()}
                        </div>

                        {/* Team Info */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#1A1A2E] truncate">{data.homeTeam.name}</h4>
                          <span className="text-sm text-[#6B7280]">
                            {data.homeHighRiskCount} player{data.homeHighRiskCount !== 1 ? 's' : ''} at risk
                          </span>
                        </div>
                      </Link>

                      {/* VS Divider */}
                      <div className="flex-shrink-0 flex items-center justify-center px-3">
                        <span className="text-sm font-bold text-[#6B7280]">VS</span>
                      </div>

                      {/* Away Team */}
                      <Link
                        to={`/team/${data.awayTeam.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F6FA] transition-colors"
                      >
                        {/* Team Logo */}
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: data.awayTeam.accentColor }}
                        >
                          {data.awayTeam.name.substring(0, 3).toUpperCase()}
                        </div>

                        {/* Team Info */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#1A1A2E] truncate">{data.awayTeam.name}</h4>
                          <span className="text-sm text-[#6B7280]">
                            {data.awayHighRiskCount} player{data.awayHighRiskCount !== 1 ? 's' : ''} at risk
                          </span>
                        </div>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
