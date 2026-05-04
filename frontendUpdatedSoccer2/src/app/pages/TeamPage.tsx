import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { getRiskColor, MATCH_DURATION, type Player, type SeasonStat } from '../data/mockData';
import {
  useTeamsOverview,
  useTeamPlayers,
  usePlayerCard,
  usePlayerGraph,
  usePlayerSeasons,
  usePlayerInjuryHistory,
  usePlayerInjuryAnalysis,
} from '../hooks/useApi';
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

const INJURY_COLLAPSE_THRESHOLD = 4;

function InjuryHistoryTable({ player }: { player: Player }) {
  const [expanded, setExpanded] = useState(false);
  const total = player.injuryHistory.length;
  const collapsible = total > INJURY_COLLAPSE_THRESHOLD;
  const visible = collapsible && !expanded
    ? player.injuryHistory.slice(0, INJURY_COLLAPSE_THRESHOLD)
    : player.injuryHistory;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 w-full">
      <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Injury History</h3>
      {total > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Diagnosis</th>
                  <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Region</th>
                  <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">From</th>
                  <th className="text-left py-2 px-2 text-xs text-[#6B7280] font-semibold">Until</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Severity</th>
                  <th className="text-center py-2 px-2 text-xs text-[#6B7280] font-semibold">Days Out</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((injury, index) => (
                  <tr key={index} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                    <td className="py-3 px-2 text-[#1A1A2E] font-medium">{injury.diagnosis}</td>
                    <td className="py-3 px-2 text-[#6B7280]">{injury.region}</td>
                    <td className="py-3 px-2 text-[#1A1A2E] whitespace-nowrap font-mono text-xs">{injury.from}</td>
                    <td className="py-3 px-2 text-[#1A1A2E] whitespace-nowrap font-mono text-xs">{injury.until}</td>
                    <td className="py-3 px-2 text-center">
                      {injury.severity ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[injury.severity] ?? 'bg-[#F5F6FA] text-[#6B7280]'}`}>
                          {injury.severity}
                        </span>
                      ) : <span className="text-[#6B7280]">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-[#1A1A2E]">
                      {injury.daysOut ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {collapsible && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="mt-4 w-full py-2 text-sm font-semibold text-[#1A56DB] hover:text-[#1240A8] hover:bg-[#F5F6FA] rounded-xl transition-colors"
            >
              {expanded ? 'Show less ↑' : `Show ${total - INJURY_COLLAPSE_THRESHOLD} more ↓`}
            </button>
          )}
        </>
      ) : (
        <p className="text-[#6B7280] text-center py-8">No injury history recorded</p>
      )}
    </div>
  );
}


const SORT_OPTIONS = [
  { value: 'risk',      label: 'Injury Risk' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName',  label: 'Last Name' },
  { value: 'status',    label: 'Injury Status' },
];

export function TeamPage() {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('risk');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [statsTab, setStatsTab] = useState<'performance' | 'statistics'>('performance');
  const { toggleFavorite, isFavorite } = useFavorites();

  // All hooks unconditional — early returns come AFTER
  const { data: teamsOverview, loading: teamsLoading } = useTeamsOverview();
  const { data: playerList, loading: playersLoading } = useTeamPlayers(teamId);

  const team = teamsOverview?.find(t => t.id === teamId) ?? null;

  const sortedPlayers = useMemo(() =>
    [...(playerList ?? [])].sort((a, b) => {
      switch (sortBy) {
        case 'risk':      return b.injuryRisk - a.injuryRisk;
        case 'firstName': return a.firstName.localeCompare(b.firstName);
        case 'lastName':  return a.lastName.localeCompare(b.lastName);
        case 'status': {
          const aInj = a.riskLevel === 'Injured' ? 1 : 0;
          const bInj = b.riskLevel === 'Injured' ? 1 : 0;
          return bInj - aInj;
        }
        default: return 0;
      }
    }),
    [playerList, sortBy]
  );

  const currentPlayerId = sortedPlayers[currentPlayerIndex]?.id;

  const { data: playerCard, loading: cardLoading } = usePlayerCard(currentPlayerId);
  const { data: graphData } = usePlayerGraph(currentPlayerId);
  const currentGw = graphData?.currentGw ?? null;
  const { data: seasonsData } = usePlayerSeasons(currentPlayerId);
  const { data: injuryHistoryData } = usePlayerInjuryHistory(currentPlayerId);
  const { data: injuryAnalysisData } = usePlayerInjuryAnalysis(currentPlayerId);

  const currentPlayer: Player | null = playerCard ? {
    ...playerCard,
    injuryRiskTrend:   graphData?.trend              ?? playerCard.injuryRiskTrend,
    seasonStats:       seasonsData?.seasons           ?? playerCard.seasonStats,
    injuryHistory:     injuryHistoryData?.injuries    ?? playerCard.injuryHistory ?? [],
    injurySummaryData: injuryAnalysisData?.summary    ?? playerCard.injurySummaryData,
  } : null;

  useEffect(() => {
    if (!playerList) return;
    const playerParam = searchParams.get('player');
    if (playerParam) {
      const index = sortedPlayers.findIndex(p => p.id === playerParam);
      if (index !== -1) {
        setCurrentPlayerIndex(index);
        setSearchParams({});
      }
    }
  }, [searchParams, playerList, sortedPlayers, setSearchParams]);

  // Loading gate
  if (teamsLoading || playersLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1A56DB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280]">Loading team data…</p>
        </div>
      </div>
    );
  }

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

  const handlePrevious = () =>
    setCurrentPlayerIndex(prev => (prev > 0 ? prev - 1 : sortedPlayers.length - 1));
  const handleNext = () =>
    setCurrentPlayerIndex(prev => (prev < sortedPlayers.length - 1 ? prev + 1 : 0));

  const s = currentPlayer?.seasonStats?.[0];

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

      {/* Navigation ABOVE mini cards */}
      <div className="flex justify-center">
        <PlayerNavigation
          current={currentPlayerIndex + 1}
          total={sortedPlayers.length}
          onPrev={handlePrevious}
          onNext={handleNext}
        />
      </div>

      {/* Mini Cards */}
      <div className="overflow-x-auto touch-pan-x overscroll-x-contain py-5 mb-10">
        <div className="flex gap-2 justify-center min-w-max px-4">
          {sortedPlayers.map((player, index) => {
            const isInjured = player.riskLevel === 'Injured';
            return (
              <button
                key={player.id}
                onClick={() => setCurrentPlayerIndex(index)}
                className={`w-[68px] h-[82px] rounded-xl overflow-hidden transition-all flex-shrink-0 ${
                  index === currentPlayerIndex
                    ? 'ring-2 ring-[#1A56DB] ring-offset-1 scale-105 opacity-100'
                    : 'opacity-55 hover:opacity-90 hover:scale-[1.03]'
                }`}
                style={{
                  backgroundColor: team.accentColor,
                  borderBottom: `3px solid ${getRiskColor(player.injuryRisk)}`,
                }}
              >
                <div className="h-full flex flex-col items-center justify-between p-1.5 text-white">
                  <div className="flex-1 flex items-center justify-center w-full">
                    <div className="text-[9px] font-semibold text-center leading-tight line-clamp-3 w-full">
                      {player.firstName} {player.lastName}
                    </div>
                  </div>
                  <div className="w-full flex flex-col gap-0.5">
                    <div
                      className="w-full text-center text-[10px] font-bold py-0.5 rounded-md"
                      style={{ backgroundColor: getRiskColor(player.injuryRisk) }}
                    >
                      {player.injuryRisk}%
                    </div>
                    <div
                      className="w-full text-center text-[8px] font-bold py-0.5 rounded-md bg-white text-black"
                    >
                      {isInjured ? 'INJ' : 'FIT'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Player Card + Info */}
      <div className="lg:hidden flex flex-col items-center justify-start mb-8">
        {cardLoading || !currentPlayer ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-4 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Desktop: Two Column Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-8 mb-8">
        {cardLoading || !currentPlayer ? (
          <div className="col-span-2 flex items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-4 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Left column: Player card · Next match · Injury analysis · History ── */}
            <div className="space-y-8">

              {/* Player card — centred, slightly larger */}
              <div className="flex justify-center pb-4">
                <div className="scale-[1.06] origin-top">
                  <PlayerCard
                    key={`desktop-${currentPlayer.id}`}
                    player={currentPlayer}
                    teamName={team.name}
                    teamColor={team.accentColor}
                    isFavorite={isFavorite(currentPlayer.id)}
                    onToggleFavorite={() => toggleFavorite(currentPlayer.id)}
                  />
                </div>
              </div>

              {/* Injury Analysis */}
              <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
                <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Injury Analysis</h3>

                {/* Group B — Predictor core */}
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isInjured = (currentPlayer.injuryHistory ?? []).some(entry => entry.until >= todayStr);
                  return (
                    <div className="flex items-center justify-between p-4 bg-[#F5F6FA] rounded-2xl mb-5">
                      <div>
                        <div className="text-xs text-[#6B7280] mb-1">Injury Risk</div>
                        <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: getRiskColor(currentPlayer.injuryRisk) }}>
                          {currentPlayer.injuryRisk}%
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs text-[#6B7280] mb-1">Injury Status</div>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: isInjured ? '#DC2626' : '#0D9488', color: 'white' }}
                        >
                          {isInjured ? 'Injured' : 'Fit'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Group C — Load metrics */}
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Load Metrics</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: 'Total Injuries',   value: currentPlayer.injurySummaryData?.career_total_injuries ?? currentPlayer.injuries,                                                                         red: false },
                    { label: 'Season Injuries',  value: currentPlayer.injurySummaryData?.injuries_this_season  ?? currentPlayer.injuries,                                                                         red: (currentPlayer.injurySummaryData?.injuries_this_season ?? currentPlayer.injuries) >= 2 },
                    { label: 'Matches Missed',   value: currentPlayer.injurySummaryData?.matches_missed_this_season ?? Math.round(currentPlayer.minutesMissed / MATCH_DURATION),                                 red: (currentPlayer.injurySummaryData?.matches_missed_this_season ?? Math.round(currentPlayer.minutesMissed / MATCH_DURATION)) >= 5 },
                    { label: 'Days Since Inj.',  value: currentPlayer.injurySummaryData?.days_since_last_injury ?? currentPlayer.daysSinceLastInjury,                                                             red: (currentPlayer.injurySummaryData?.days_since_last_injury ?? currentPlayer.daysSinceLastInjury) < 14 },
                    { label: 'Mins per Month',   value: Math.round(currentPlayer.minutesPlayed / 9.5),                                                                                                             red: false },
                  ].map(({ label, value, red }) => (
                    <div key={label} className="flex flex-col gap-0.5 p-3 bg-[#F5F6FA] rounded-2xl">
                      <span className="text-xs text-[#6B7280]">{label}</span>
                      <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: red ? '#DC2626' : '#1A1A2E' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Match stats grid */}
                <div className="pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Match Stats</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Goals',          value: s?.goals             ?? '-' },
                      { label: 'Assists',        value: s?.assists           ?? '-' },
                      { label: 'Duels',          value: s?.duels_total       ?? '-' },
                      { label: 'Dribbles',       value: s?.dribbles_attempts ?? '-' },
                      { label: 'Fouls Committed', value: s?.fouls_committed   ?? '-' },
                      { label: 'Fouls Against',  value: s?.fouls_drawn        ?? currentPlayer.foulsAgainst ?? '-' },
                      { label: 'Yellow Cards',   value: s?.yellow_cards      ?? '-' },
                      { label: 'Red Cards',      value: s?.red_cards         ?? '-' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center p-2 bg-[#F5F6FA] rounded-xl">
                        <span className="text-[9px] text-[#6B7280] mb-0.5 text-center leading-tight">{label}</span>
                        <span className="text-base font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <InjuryHistoryTable player={currentPlayer} />
            </div>

            {/* ── Right column: Chart · Performance/Stats toggle · Risk factors ── */}
            <div className="space-y-8">
              <PlayerInjuryRiskChart player={currentPlayer} currentGw={currentGw} />

              {/* Season Performance / Statistics toggle */}
              <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
                {/* Toggle buttons */}
                <div className="flex gap-2 mb-5">
                  {(['performance', 'statistics'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setStatsTab(tab)}
                      className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                        statsTab === tab
                          ? 'bg-[#1A56DB] text-white shadow-md'
                          : 'bg-[#F5F6FA] text-[#6B7280] hover:bg-[#E5E7EB]'
                      }`}
                    >
                      {tab === 'performance' ? 'Season Performance' : 'Statistics'}
                    </button>
                  ))}
                </div>

                {statsTab === 'performance' && (() => {
                  const allSeasons = currentPlayer.seasonStats ?? [];
                  const SEASON_COLORS = ['#1A56DB', '#DC2626', '#0D9488', '#F59E0B', '#EA580C'];
                  const metrics: Array<{
                    label: string;
                    get: (r: SeasonStat) => number;
                    fallback: number;
                    max: number;
                    fmt: (v: number) => string;
                  }> = [
                    { label: 'Games Played',   get: r => r.appearances, fallback: currentPlayer.gamesPlayed,   max: 38,   fmt: v => String(v) },
                    { label: 'Minutes Played', get: r => r.minutes,     fallback: currentPlayer.minutesPlayed, max: 3000, fmt: v => v.toLocaleString() },
                    { label: 'Goals',          get: r => r.goals,       fallback: 0,                           max: 30,   fmt: v => String(v) },
                    { label: 'Assists',        get: r => r.assists,     fallback: 0,                           max: 20,   fmt: v => String(v) },
                    { label: 'Tackles',        get: r => r.tackles,     fallback: 0,                           max: 100,  fmt: v => String(v) },
                  ];
                  return (
                    <div className="space-y-5">
                      {metrics.map(({ label, get, fallback, max, fmt }) => {
                        const bars: Array<{ season: string; value: number; color: string }> =
                          allSeasons.length > 0
                            ? allSeasons.map((r, i) => ({
                                season: `${r.season}/${String(r.season + 1).slice(2)}`,
                                value: get(r),
                                color: SEASON_COLORS[i % SEASON_COLORS.length],
                              }))
                            : [{ season: '2025/26', value: fallback, color: SEASON_COLORS[0] }];

                        // Sort largest → smallest so longest bar renders first (behind)
                        const sorted = [...bars].sort((a, b) => b.value - a.value);

                        return (
                          <div key={label}>
                            <p className="text-sm font-semibold text-[#1A1A2E] mb-2">{label}</p>

                            {/* Single overlapping bar track */}
                            <div className="relative w-full h-3 bg-[#F5F6FA] rounded-full overflow-hidden mb-2">
                              {sorted.map(({ season, value, color }) => (
                                <div
                                  key={season}
                                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }}
                                />
                              ))}
                            </div>

                            {/* Season legend with values */}
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                              {bars.map(({ season, value, color }) => (
                                <div key={season} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                  <span className="text-xs font-medium" style={{ color }}>{season}</span>
                                  <span className="text-xs font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {fmt(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {statsTab === 'statistics' && (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[rgba(0,0,0,0.06)]">
                          {['Season', 'Apps', 'Mins', 'Goals', 'Ast', 'Rating', 'Tkl'].map((h, i) => (
                            <th key={h} className={`py-2 px-2 text-xs text-[#6B7280] font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentPlayer.seasonStats ? (
                          currentPlayer.seasonStats.map(row => (
                            <tr key={row.season} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                              <td className="py-2.5 px-2 font-semibold text-[#1A1A2E]">{row.season}/{String(row.season + 1).slice(2)}</td>
                              <td className="py-2.5 px-2 text-center font-mono text-[#1A1A2E]">{row.appearances}</td>
                              <td className="py-2.5 px-2 text-center font-mono text-[#1A1A2E]">{row.minutes}</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-[#1A1A2E]">{row.goals}</td>
                              <td className="py-2.5 px-2 text-center font-mono text-[#1A1A2E]">{row.assists}</td>
                              <td className={`py-2.5 px-2 text-center font-mono font-bold ${row.rating >= 7 ? 'text-[#0D9488]' : row.rating >= 6.5 ? 'text-[#EA580C]' : 'text-[#DC2626]'}`}>{row.rating.toFixed(2)}</td>
                              <td className="py-2.5 px-2 text-center font-mono text-[#6B7280]">{row.tackles}</td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr className="border-b border-[rgba(0,0,0,0.06)]">
                              <td className="py-2.5 px-2 font-semibold text-[#1A1A2E]">2025/26</td>
                              <td className="py-2.5 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.gamesPlayed}</td>
                              <td className="py-2.5 px-2 text-center font-mono text-[#1A1A2E]">{currentPlayer.minutesPlayed}</td>
                              {Array(4).fill(null).map((_, i) => <td key={i} className="py-2.5 px-2 text-center font-mono text-[#6B7280]">-</td>)}
                            </tr>
                            {['2024/25', '2023/24'].map(season => (
                              <tr key={season} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                                <td className="py-2.5 px-2 font-semibold text-[#1A1A2E]">{season}</td>
                                {Array(6).fill(null).map((_, i) => <td key={i} className="py-2.5 px-2 text-center font-mono text-[#6B7280]">-</td>)}
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
