import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { teams, getRiskColor, getCardGradient, Player } from '../data/mockData';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerDetails } from '../components/PlayerDetails';
import { PlayerInjuryRiskChart } from '../components/PlayerInjuryRiskChart';
import { useFavorites } from '../hooks/useFavorites';

export function TeamPage() {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const team = teams.find(t => t.id === teamId);


  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'position' | 'age'>('risk');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const { toggleFavorite, isFavorite } = useFavorites();

  if (!team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-4">Team not found</h1>
          <Link to="/" className="text-[#1A56DB] hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const sortedPlayers = [...team.players].sort((a, b) => {
    switch (sortBy) {
      case 'risk':
        return b.injuryRisk - a.injuryRisk;
      case 'name':
        return a.lastName.localeCompare(b.lastName);
      case 'position':
        return a.position.localeCompare(b.position);
      case 'age':
        return a.age - b.age;
      default:
        return 0;
    }
  });

  useEffect(() => {
    const playerParam = searchParams.get('player');
    if (playerParam && team) {
      const index = sortedPlayers.findIndex(p => p.id === playerParam);
      if (index !== -1) {
        setCurrentPlayerIndex(index);
        // Clear the player param so navigation works normally after initial load
        setSearchParams({});
      }
    }
  }, [searchParams, team, sortedPlayers, setSearchParams]);

  const currentPlayer = sortedPlayers[currentPlayerIndex];

  const handlePrevious = () => {
    setCurrentPlayerIndex((prev) => (prev > 0 ? prev - 1 : sortedPlayers.length - 1));
  };

  const handleNext = () => {
    setCurrentPlayerIndex((prev) => (prev < sortedPlayers.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/"
            className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-[#1A56DB] hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-[#1A1A2E]">{team.name}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-[#1A1A2E] border border-[rgba(0,0,0,0.06)]">
            Squad: {team.squadSize} players
          </span>
          <span
            className="px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: getRiskColor(team.avgRisk), fontFamily: 'var(--font-mono)' }}
          >
            Avg Injury Risk: {team.avgRisk}%
          </span>
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-[#1A1A2E] border border-[rgba(0,0,0,0.06)]">
            Total injuries: {team.totalInjuries}
          </span>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-center gap-1 mb-12">
        <span className="text-sm text-[#6B7280] mr-2">Sort by:</span>
        <button
          onClick={() => setSortBy('risk')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            sortBy === 'risk'
              ? 'bg-[#1A56DB] text-white'
              : 'text-[#6B7280] hover:bg-[#F5F6FA]'
          }`}
        >
          Risk ↓
        </button>
        <span className="text-[#6B7280]">·</span>
        <button
          onClick={() => setSortBy('name')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            sortBy === 'name'
              ? 'bg-[#1A56DB] text-white'
              : 'text-[#6B7280] hover:bg-[#F5F6FA]'
          }`}
        >
          Name
        </button>
        <span className="text-[#6B7280]">·</span>
        <button
          onClick={() => setSortBy('position')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            sortBy === 'position'
              ? 'bg-[#1A56DB] text-white'
              : 'text-[#6B7280] hover:bg-[#F5F6FA]'
          }`}
        >
          Position
        </button>
        <span className="text-[#6B7280]">·</span>
        <button
          onClick={() => setSortBy('age')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            sortBy === 'age'
              ? 'bg-[#1A56DB] text-white'
              : 'text-[#6B7280] hover:bg-[#F5F6FA]'
          }`}
        >
          Age
        </button>
      </div>

      {/* Mini Cards */}
      <div className="overflow-x-auto pb-4 mb-8 pt-4">
        <div className="flex gap-3 justify-center min-w-max px-4">
          {sortedPlayers.map((player, index) => (
            <button
              key={player.id}
              onClick={() => setCurrentPlayerIndex(index)}
              className={`w-20 h-28 rounded-2xl overflow-hidden transition-all ${
                index === currentPlayerIndex
                  ? 'ring-4 ring-[#1A56DB] scale-110'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: team.accentColor }}
            >
              <div className="h-full flex flex-col items-center justify-center p-2 text-white">
                <div className="text-xs font-bold mb-1 text-center line-clamp-2">
                  {player.lastName}
                </div>
                <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                  {player.injuryRisk}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Player Card - Mobile Only (right below mini cards) */}
      <div className="lg:hidden flex flex-col items-center justify-start mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handlePrevious}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all text-[#1A56DB]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
            {currentPlayerIndex + 1} / {sortedPlayers.length}
          </span>
          <button
            onClick={handleNext}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all text-[#1A56DB]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <PlayerCard
          key={`mobile-${currentPlayer.id}`}
          player={currentPlayer}
          teamName={team.name}
          teamColor={team.accentColor}
          isFavorite={isFavorite(currentPlayer.id)}
          onToggleFavorite={() => toggleFavorite(currentPlayer.id)}
        />

        {/* Player Name Header - Mobile */}
        <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mt-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A2E] mb-1">
                {currentPlayer.firstName} {currentPlayer.lastName}
              </h2>
              <p className="text-lg text-[#6B7280]">
                {currentPlayer.position} · #{currentPlayer.kitNumber}
              </p>
            </div>
            <button
              onClick={() => toggleFavorite(currentPlayer.id)}
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#F5F6FA] transition-colors"
            >
              {isFavorite(currentPlayer.id) ? (
                <svg className="w-7 h-7 text-[#F59E0B] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Player Season Statistics - Mobile */}
        <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mt-6 w-full">
          <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Season Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Season</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Games</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Minutes</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Fouls</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Aerial</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Tackles</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2025/26</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.gamesPlayed}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.minutesPlayed}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.foulsAgainst}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                </tr>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2024/25</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2023/24</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Risk Chart + Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Injury Risk Chart and Stats */}
        <div className="space-y-6">
          <PlayerInjuryRiskChart player={currentPlayer} />

          {/* Season Performance Metrics */}
          <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
              <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Season Performance Metrics</h3>
              <div className="space-y-4">
                {/* Games Played */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">Games Played</span>
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {currentPlayer.gamesPlayed}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all"
                      style={{ width: `${Math.min((currentPlayer.gamesPlayed / 38) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Minutes Played */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">Minutes Played</span>
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {currentPlayer.minutesPlayed.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1A56DB] rounded-full transition-all"
                      style={{ width: `${Math.min((currentPlayer.minutesPlayed / 3000) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fouls Against */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">Fouls Against</span>
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {currentPlayer.foulsAgainst}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#DC2626] rounded-full transition-all"
                      style={{ width: `${Math.min((currentPlayer.foulsAgainst / 4) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Aerial Duels */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">Aerial Duels</span>
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      -
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0D9488] rounded-full transition-all"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>

                {/* Tackles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">Tackles</span>
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      -
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8B5CF6] rounded-full transition-all"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

          {/* Injury Analysis - Full Width */}
          <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
            <h3 className="text-xl font-bold text-[#1A1A2E] mb-6">Injury Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 px-6 bg-[#F5F6FA] rounded-xl">
                <span className="text-lg text-[#6B7280]">Total Injuries</span>
                <span
                  className="text-3xl font-bold"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: currentPlayer.injuries >= 2 ? '#DC2626' : '#1A1A2E'
                  }}
                >
                  {currentPlayer.injuries}
                </span>
              </div>
              <div className="flex items-center justify-between py-4 px-6 bg-[#F5F6FA] rounded-xl">
                <span className="text-lg text-[#6B7280]">Matches Missed</span>
                <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {Math.round(currentPlayer.minutesMissed / 90)}
                </span>
              </div>
              <div className="flex items-center justify-between py-4 px-6 bg-[#F5F6FA] rounded-xl">
                <span className="text-lg text-[#6B7280]">Weeks Missed</span>
                <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {Math.round(currentPlayer.daysSinceLastInjury / 7)}
                </span>
              </div>
              <div className="flex items-center justify-between py-4 px-6 bg-[#F5F6FA] rounded-xl">
                <span className="text-lg text-[#6B7280]">Days Since Last Injury</span>
                <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {currentPlayer.daysSinceLastInjury}
                </span>
              </div>
              <div className="flex items-center justify-between py-4 px-6 bg-[#F5F6FA] rounded-xl">
                <span className="text-lg text-[#6B7280]">Matches Played Per Week</span>
                <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {currentPlayer.matchDensity}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Player Card (Desktop Only) */}
        <div className="hidden lg:flex flex-col items-center justify-start">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handlePrevious}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all text-[#1A56DB]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
              {currentPlayerIndex + 1} / {sortedPlayers.length}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all text-[#1A56DB]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <PlayerCard
            key={`desktop-${currentPlayer.id}`}
            player={currentPlayer}
            teamName={team.name}
            teamColor={team.accentColor}
            isFavorite={isFavorite(currentPlayer.id)}
            onToggleFavorite={() => toggleFavorite(currentPlayer.id)}
          />

          {/* Player Season Statistics - Desktop */}
          <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mt-6 w-full">
            <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Season Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Season</th>
                    <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Games</th>
                    <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Minutes</th>
                    <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Fouls</th>
                    <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Aerial</th>
                    <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Tackles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2025/26</td>
                    <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.gamesPlayed}</td>
                    <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.minutesPlayed}</td>
                    <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.foulsAgainst}</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  </tr>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2024/25</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2023/24</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                    <td className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}