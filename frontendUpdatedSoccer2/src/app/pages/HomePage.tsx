import { useState } from 'react';
import { Link } from 'react-router';
import { matches, teams, getRiskColor, getAllPlayers } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';

export function HomePage() {
  const { isFavorite } = useFavorites();

  const [riskFilter, setRiskFilter] = useState<'global' | 'watchlist'>('global');
  const [spikeFilter, setSpikeFilter] = useState<'global' | 'watchlist'>('global');

  const getTeamById = (id: string) => teams.find(t => t.id === id);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const INJURY_RISK_THRESHOLD = 50;

  const allHighRiskPlayers = getAllPlayers()
    .filter(p => p.injuryRisk >= INJURY_RISK_THRESHOLD)
    .sort((a, b) => b.injuryRisk - a.injuryRisk)
    .slice(0, 10);

  const highRiskPlayers =
    riskFilter === 'watchlist'
      ? allHighRiskPlayers.filter(p => isFavorite(p.id))
      : allHighRiskPlayers;

  const allSpikePlayers = getAllPlayers()
    .filter(p => p.riskTrend >= 5)
    .sort((a, b) => b.riskTrend - a.riskTrend)
    .slice(0, 6);

  const spikePlayers =
    spikeFilter === 'watchlist'
      ? allSpikePlayers.filter(p => isFavorite(p.id))
      : allSpikePlayers;

  const FilterToggle = ({
    value,
    onChange,
  }: {
    value: 'global' | 'watchlist';
    onChange: (v: 'global' | 'watchlist') => void;
  }) => (
    <div className="flex gap-1">
      <button
        onClick={() => onChange('global')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
          value === 'global'
            ? 'bg-[#1A56DB] text-white'
            : 'bg-[#F5F6FA] text-[#6B7280] hover:bg-gray-200'
        }`}
      >
        Global
      </button>
      <button
        onClick={() => onChange('watchlist')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
          value === 'watchlist'
            ? 'bg-[#1A56DB] text-white'
            : 'bg-[#F5F6FA] text-[#6B7280] hover:bg-gray-200'
        }`}
      >
        Watchlist
      </button>
    </div>
  );

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
                // Upcoming first (sorted by kickoff ascending), completed after (sorted by kickoff descending)
                if (a.status !== b.status) {
                  return a.status === 'upcoming' ? -1 : 1;
                }
                const dateA = new Date(`${a.date}T${a.time}`).getTime();
                const dateB = new Date(`${b.date}T${b.time}`).getTime();
                return dateA - dateB;
              })
              .slice(0, 12)
              .map((match) => {
                const homeTeam = getTeamById(match.homeTeamId);
                const awayTeam = getTeamById(match.awayTeamId);
                if (!homeTeam || !awayTeam) return null;

                return (
                  <Link
                    key={match.id}
                    to={`/match/${match.id}`}
                    className="flex-shrink-0 w-[200px] bg-white rounded-2xl p-4 hover:shadow-lg transition-all border border-[rgba(0,0,0,0.06)]"
                  >
                    {/* Teams */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col items-center gap-1">
                        <img src={homeTeam.logo} alt={homeTeam.name} className="w-10 h-10 object-contain" />
                        <span className="text-xs font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {homeTeam.avgRisk}%
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <img src={awayTeam.logo} alt={awayTeam.name} className="w-10 h-10 object-contain" />
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
              <div className="flex items-center gap-3">
                <FilterToggle value={riskFilter} onChange={setRiskFilter} />
                <Link to="/my-players" className="text-sm text-[#1A56DB] hover:underline">
                  View all
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] overflow-hidden">
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {highRiskPlayers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#6B7280]">
                      {riskFilter === 'watchlist'
                        ? 'No watchlist players at high risk'
                        : 'No high risk players found'}
                    </p>
                  </div>
                ) : (
                  highRiskPlayers.map((player, index) => (
                    <Link
                      key={player.id}
                      to={`/team/${player.teamId}?player=${player.id}`}
                      className="block p-4 hover:bg-[#F5F6FA] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-6">
                          <span className="text-sm font-bold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                            {index + 1}
                          </span>
                        </div>

                        {/* Photo or Kit Number Badge */}
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                            style={{ backgroundColor: player.teamColor }}
                          >
                            #{player.kitNumber}
                          </div>
                        )}

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#1A1A2E]">
                            {player.lastName} {player.firstName}
                          </h4>
                          <p className="text-sm text-[#6B7280]">
                            {player.teamName} · {player.position}
                          </p>
                        </div>

                        {/* Risk Badge + injuries */}
                        <div className="flex-shrink-0 text-right">
                          <div
                            className="px-3 py-1 rounded-xl font-bold text-white text-base"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              backgroundColor: getRiskColor(player.injuryRisk),
                            }}
                          >
                            {player.injuryRisk}%
                          </div>
                          <div className="text-xs text-[#6B7280] mt-1">
                            {player.injuries} inj. this season
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Risk Spikes + Upcoming Matches */}
          <div className="flex flex-col gap-8">

            {/* RECENT INJURY RISK SPIKES */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A2E]">RECENT INJURY RISK SPIKES</h2>
                  <p className="text-sm text-[#6B7280] mt-1">Players with the largest recent risk increases</p>
                </div>
                <FilterToggle value={spikeFilter} onChange={setSpikeFilter} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] overflow-hidden">
                <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                  {spikePlayers.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-[#6B7280]">
                        {spikeFilter === 'watchlist'
                          ? 'No watchlist players at high risk'
                          : 'No risk spike data available'}
                      </p>
                    </div>
                  ) : (
                    spikePlayers.map((player) => (
                      <Link
                        key={player.id}
                        to={`/team/${player.teamId}?player=${player.id}`}
                        className="block p-4 hover:bg-[#F5F6FA] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Photo or Kit Number Badge */}
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={`${player.firstName} ${player.lastName}`}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                              style={{ backgroundColor: player.teamColor }}
                            >
                              #{player.kitNumber}
                            </div>
                          )}

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#1A1A2E]">
                              {player.lastName} {player.firstName}
                            </h4>
                            <p className="text-sm text-[#6B7280]">
                              {player.teamName} · {player.position}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              {player.injuries} inj. this season
                            </p>
                          </div>

                          {/* Spike Badge */}
                          <div className="flex-shrink-0">
                            <span
                              className="px-3 py-1 rounded-xl font-bold text-white text-sm"
                              style={{ fontFamily: 'var(--font-mono)', backgroundColor: '#DC2626' }}
                            >
                              +{player.riskTrend}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
