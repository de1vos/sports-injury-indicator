import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { teams, getRiskColor, type Player } from '../data/mockData';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerInjuryRiskChart } from '../components/PlayerInjuryRiskChart';
import { StarIcon } from '../components/StarIcon';
import { SortBar } from '../components/SortBar';
import { useFavorites } from '../hooks/useFavorites';

function PlayerNavigation({ current, total, onPrev, onNext }: {
  current: number; total: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onPrev}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all text-[#1A56DB]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
        {current} / {total}
      </span>
      <button
        onClick={onNext}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all text-[#1A56DB]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function SeasonStatisticsTable({ player }: { player: Player }) {
  const headers = ['Season', 'Apps', 'Mins', 'Goals', 'Assists', 'Rating', 'Tackles'];
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mt-6 w-full">
      <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Season Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.06)]">
              {headers.map((h, i) => (
                <th key={h} className={`py-2 px-2 text-xs text-[#6B7280] font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {player.seasonStats ? (
              player.seasonStats.map((s, i) => (
                <tr key={s.season} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                  <td className="py-3 px-2 font-semibold text-[#1A1A2E]">{s.season}/{String(s.season + 1).slice(2)}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{s.appearances}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{s.minutes}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E] font-bold">{s.goals}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{s.assists}</td>
                  <td className={`py-3 px-2 text-center font-mono font-bold ${s.rating >= 7 ? 'text-[#0D9488]' : s.rating >= 6.5 ? 'text-[#EA580C]' : 'text-[#DC2626]'}`}>{s.rating.toFixed(2)}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#6B7280]">{s.tackles}</td>
                </tr>
              ))
            ) : (
              <>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <td className="py-3 px-2 font-semibold text-[#1A1A2E]">2025/26</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{player.gamesPlayed}</td>
                  <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">{player.minutesPlayed}</td>
                  {Array(4).fill(null).map((_, i) => <td key={i} className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>)}
                </tr>
                {['2024/25', '2023/24'].map(season => (
                  <tr key={season} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                    <td className="py-3 px-2 font-semibold text-[#1A1A2E]">{season}</td>
                    {Array(6).fill(null).map((_, i) => <td key={i} className="py-3 px-2 text-center font-mono text-[#6B7280]">-</td>)}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  'Long-term': 'bg-red-100 text-red-700',
  'Moderate': 'bg-orange-100 text-orange-700',
  'Minor': 'bg-yellow-100 text-yellow-700',
};

function InjuryHistoryTable({ player }: { player: Player }) {
  const hasSeverity = player.injuryHistory.some(i => i.severity);
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mt-6 w-full">
      <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Injury History</h3>
      {player.injuryHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Diagnosis</th>
                <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Region</th>
                <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">From</th>
                <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Until</th>
                {hasSeverity && <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Severity</th>}
                {hasSeverity && <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Days Out</th>}
              </tr>
            </thead>
            <tbody>
              {player.injuryHistory.map((injury, index) => (
                <tr key={index} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                  <td className="py-3 px-2 text-[#1A1A2E] font-medium">{injury.diagnosis}</td>
                  <td className="py-3 px-2 text-[#6B7280]">{injury.region}</td>
                  <td className="py-3 px-2 text-[#1A1A2E] whitespace-nowrap font-mono text-xs">{injury.from}</td>
                  <td className="py-3 px-2 text-[#1A1A2E] whitespace-nowrap font-mono text-xs">{injury.until}</td>
                  {hasSeverity && (
                    <td className="py-3 px-2 text-center">
                      {injury.severity ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[injury.severity] ?? 'bg-[#F5F6FA] text-[#6B7280]'}`}>
                          {injury.severity}
                        </span>
                      ) : <span className="text-[#6B7280]">-</span>}
                    </td>
                  )}
                  {hasSeverity && (
                    <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">
                      {injury.daysOut ?? '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[#6B7280] text-center py-8">No injury history recorded</p>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'risk', label: 'Risk ↓' },
  { value: 'name', label: 'Name' },
  { value: 'position', label: 'Position' },
  { value: 'age', label: 'Age' },
];

export function TeamPage() {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const team = teams.find(t => t.id === teamId);
  const [sortBy, setSortBy] = useState('risk');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const { toggleFavorite, isFavorite } = useFavorites();

  if (!team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-4">Team not found</h1>
          <Link to="/" className="text-[#1A56DB] hover:underline">Return to home</Link>
        </div>
      </div>
    );
  }

  const sortedPlayers = [...team.players].sort((a, b) => {
    switch (sortBy) {
      case 'risk': return b.injuryRisk - a.injuryRisk;
      case 'name': return a.lastName.localeCompare(b.lastName);
      case 'position': return a.position.localeCompare(b.position);
      case 'age': return a.age - b.age;
      default: return 0;
    }
  });

  useEffect(() => {
    const playerParam = searchParams.get('player');
    if (playerParam) {
      const index = sortedPlayers.findIndex(p => p.id === playerParam);
      if (index !== -1) {
        setCurrentPlayerIndex(index);
        setSearchParams({});
      }
    }
  }, [searchParams, sortedPlayers, setSearchParams]);

  const currentPlayer = sortedPlayers[currentPlayerIndex];

  const handlePrevious = () =>
    setCurrentPlayerIndex(prev => (prev > 0 ? prev - 1 : sortedPlayers.length - 1));
  const handleNext = () =>
    setCurrentPlayerIndex(prev => (prev < sortedPlayers.length - 1 ? prev + 1 : 0));

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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-[rgba(0,0,0,0.06)]">
              <img src={team.logo} alt={team.name} className="w-9 h-9 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A2E]">{team.name}</h1>
          </div>
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
      <div className="flex justify-center mb-12">
        <SortBar options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      </div>

      {/* Mini Cards */}
      <div className="overflow-x-auto touch-pan-x overscroll-x-contain pb-4 mb-8 pt-4">
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
                <div className="text-xs font-bold mb-1 text-center line-clamp-2">{player.lastName}</div>
                <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                  {player.injuryRisk}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Player Card + Info */}
      <div className="lg:hidden flex flex-col items-center justify-start mb-8">
        <PlayerNavigation
          current={currentPlayerIndex + 1}
          total={sortedPlayers.length}
          onPrev={handlePrevious}
          onNext={handleNext}
        />
        <PlayerCard
          key={`mobile-${currentPlayer.id}`}
          player={currentPlayer}
          teamName={team.name}
          teamColor={team.accentColor}
          isFavorite={isFavorite(currentPlayer.id)}
          onToggleFavorite={() => toggleFavorite(currentPlayer.id)}
        />
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
              <StarIcon
                filled={isFavorite(currentPlayer.id)}
                className={isFavorite(currentPlayer.id) ? 'w-7 h-7 text-[#F59E0B] fill-current' : 'w-7 h-7 text-[#6B7280]'}
              />
            </button>
          </div>
        </div>
        <SeasonStatisticsTable player={currentPlayer} />
        <InjuryHistoryTable player={currentPlayer} />
      </div>

      {/* Desktop: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left: Chart + Performance + Injury Analysis */}
        <div className="space-y-6">
          <PlayerInjuryRiskChart player={currentPlayer} />

          <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
            <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Season Performance Metrics</h3>
            <div className="space-y-4">
              {(() => {
                const s = currentPlayer.seasonStats?.[0];
                return [
                  { label: 'Games Played',   value: s?.appearances ?? currentPlayer.gamesPlayed,  max: 38,   color: '#F59E0B', display: String(s?.appearances ?? currentPlayer.gamesPlayed) },
                  { label: 'Minutes Played', value: s?.minutes     ?? currentPlayer.minutesPlayed, max: 3000, color: '#1A56DB', display: (s?.minutes ?? currentPlayer.minutesPlayed).toLocaleString() },
                  { label: 'Goals',          value: s?.goals       ?? 0,                           max: 30,   color: '#0D9488', display: s ? String(s.goals)   : '-' },
                  { label: 'Assists',        value: s?.assists     ?? 0,                           max: 20,   color: '#8B5CF6', display: s ? String(s.assists) : '-' },
                  { label: 'Tackles',        value: s?.tackles     ?? 0,                           max: 100,  color: '#DC2626', display: s ? String(s.tackles) : '-' },
                ];
              })().map(({ label, value, max, color, display }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">{label}</span>
                    <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>{display}</span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {currentPlayer.riskFactors && currentPlayer.riskFactors.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
              <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Risk Factors</h3>
              <ul className="space-y-2">
                {currentPlayer.riskFactors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 px-4 bg-[#FEF2F2] rounded-xl">
                    <span className="text-[#DC2626] mt-0.5">⚠</span>
                    <span className="text-sm text-[#1A1A2E] font-medium">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
            <h3 className="text-xl font-bold text-[#1A1A2E] mb-6">Injury Analysis</h3>
            <div className="space-y-4">
              {(currentPlayer.injurySummaryData ? [
                { label: 'Career Total Injuries',   value: currentPlayer.injurySummaryData.career_total_injuries,      red: false },
                { label: 'Injuries This Season',    value: currentPlayer.injurySummaryData.injuries_this_season,       red: currentPlayer.injurySummaryData.injuries_this_season >= 2 },
                { label: 'Days Since Last Injury',  value: currentPlayer.injurySummaryData.days_since_last_injury,     red: currentPlayer.injurySummaryData.days_since_last_injury < 14 },
                { label: 'Matches Missed (Season)', value: currentPlayer.injurySummaryData.matches_missed_this_season, red: currentPlayer.injurySummaryData.matches_missed_this_season >= 5 },
                { label: 'Matches Missed (Career)', value: currentPlayer.injurySummaryData.matches_missed_career,      red: false },
              ] : [
                { label: 'Total Injuries',          value: currentPlayer.injuries,                               red: currentPlayer.injuries >= 2 },
                { label: 'Matches Missed',          value: Math.round(currentPlayer.minutesMissed / 90),        red: false },
                { label: 'Days Since Last Injury',  value: currentPlayer.daysSinceLastInjury,                   red: false },
                { label: 'Matches Per Week',        value: currentPlayer.matchDensity,                          red: false },
              ]).map(({ label, value, red }) => (
                <div key={label} className="flex items-center justify-between py-4 px-6 bg-[#F5F6FA] rounded-xl">
                  <span className="text-lg text-[#6B7280]">{label}</span>
                  <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: red ? '#DC2626' : '#1A1A2E' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Player Card (Desktop Only) */}
        <div className="hidden lg:flex flex-col items-center justify-start">
          <PlayerNavigation
            current={currentPlayerIndex + 1}
            total={sortedPlayers.length}
            onPrev={handlePrevious}
            onNext={handleNext}
          />
          <PlayerCard
            key={`desktop-${currentPlayer.id}`}
            player={currentPlayer}
            teamName={team.name}
            teamColor={team.accentColor}
            isFavorite={isFavorite(currentPlayer.id)}
            onToggleFavorite={() => toggleFavorite(currentPlayer.id)}
          />
          {currentPlayer.nextMatch && (() => {
            const m = currentPlayer.nextMatch!;
            const matchDate = new Date(m.date);
            const dateStr = matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStr = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return (
              <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mt-6 w-full">
                <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Next Match</h3>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={m.home_logo} alt={m.home_team} className="w-10 h-10 object-contain" />
                    <span className="font-bold text-[#1A1A2E]">{m.home_team}</span>
                  </div>
                  <span className="text-sm font-bold text-[#6B7280]">VS</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#1A1A2E]">{m.away_team}</span>
                    <img src={m.away_logo} alt={m.away_team} className="w-10 h-10 object-contain" />
                  </div>
                </div>
                <div className="text-center text-sm text-[#6B7280]">
                  <div className="font-semibold text-[#1A1A2E]">{dateStr} · {timeStr}</div>
                  <div className="mt-1">{m.venue}</div>
                  <div className="mt-1 text-xs">{m.round}</div>
                </div>
              </div>
            );
          })()}
          <SeasonStatisticsTable player={currentPlayer} />
          <InjuryHistoryTable player={currentPlayer} />
        </div>
      </div>
    </div>
  );
}
