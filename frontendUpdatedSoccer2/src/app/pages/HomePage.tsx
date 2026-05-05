import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { getRiskColor } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import { StarIcon } from '../components/StarIcon';
import {
  useDashboardMatches,
  useHighRiskPlayers,
  useTrendingPlayers,
  useTeamsOverview,
} from '../hooks/useApi';
import type { DashboardHighRiskPlayer, DashboardTrendingPlayer, DashboardMatch } from '../api/dashboard';
import { getRelativeRiskMeta } from '../utils/risk';

const PAGE_SIZE = 10;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function riskBadgeStyle(risk: number): { bg: string; text: string } {
  if (risk > 50) return { bg: '#FEE2E2', text: '#DC2626' };
  if (risk > 35) return { bg: '#FFEDD5', text: '#EA580C' };
  if (risk > 20) return { bg: '#CCFBF1', text: '#0D9488' };
  return { bg: '#DBEAFE', text: '#1A56DB' };
}

function TeamHalf({
  teamId,
  teamName,
  teamLogo,
  avgRisk,
  goals,
  isPlayed,
  side,
}: {
  teamId: string | null;
  teamName: string;
  teamLogo: string;
  avgRisk: number;
  goals: number | null;
  isPlayed: boolean;
  side: 'home' | 'away';
}) {
  const badge = riskBadgeStyle(avgRisk);
  const content = (
    <div className={`flex flex-col items-center gap-1.5 px-3 py-3 ${side === 'home' ? 'border-r' : ''} border-[rgba(0,0,0,0.06)] flex-1`}>
      <img src={teamLogo} alt={teamName} className="w-9 h-9 object-contain" />
      <span className="text-[10px] font-semibold text-[#1A1A2E] text-center leading-tight line-clamp-1 w-full text-center">{teamName}</span>
      {!isPlayed && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: badge.bg, color: badge.text, fontFamily: 'var(--font-mono)' }}
        >
          {avgRisk}%
        </span>
      )}
      {isPlayed && goals !== null && (
        <span className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>{goals}</span>
      )}
    </div>
  );

  return teamId ? (
    <Link to={`/team/${teamId}`} className="flex-1 hover:bg-[#F9FAFB] transition-colors rounded-l-2xl" onClick={e => e.stopPropagation()}>
      {content}
    </Link>
  ) : <div className="flex-1">{content}</div>;
}

function MatchCard({ match, teamIdByName }: { match: DashboardMatch; teamIdByName: Record<string, string> }) {
  return (
    <div className="flex-shrink-0 w-[240px] bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
      {/* Two halves */}
      <div className="flex">
        <TeamHalf
          teamId={teamIdByName[match.homeTeamName] ?? null}
          teamName={match.homeTeamName}
          teamLogo={match.homeTeamLogo}
          avgRisk={match.homeAvgRisk}
          goals={match.homeGoals}
          isPlayed={match.isPlayed}
          side="home"
        />
        <TeamHalf
          teamId={teamIdByName[match.awayTeamName] ?? null}
          teamName={match.awayTeamName}
          teamLogo={match.awayTeamLogo}
          avgRisk={match.awayAvgRisk}
          goals={match.awayGoals}
          isPlayed={match.isPlayed}
          side="away"
        />
      </div>
      {/* Footer */}
      <div className="px-3 py-2 border-t border-[rgba(0,0,0,0.06)] flex items-center justify-between">
        <span className="text-[10px] text-[#9CA3AF]">{formatDate(match.date)}{match.time ? ` · ${match.time}` : ''}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${match.isPlayed ? 'bg-[#CCFBF1] text-[#0D9488]' : 'bg-[#DBEAFE] text-[#1A56DB]'}`}>
          {match.isPlayed ? 'FT' : 'Upcoming'}
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterToggle({
  value,
  onChange,
}: {
  value: 'global' | 'watchlist';
  onChange: (v: 'global' | 'watchlist') => void;
}) {
  return (
    <div className="flex gap-1">
      {(['global', 'watchlist'] as const).map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${
            value === opt
              ? 'bg-[#1A56DB] text-white'
              : 'bg-[#F5F6FA] text-[#6B7280] hover:bg-gray-200'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function PageBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
        active ? 'bg-[#1A56DB] text-white' : 'text-[#6B7280] hover:bg-[#F5F6FA] hover:text-[#1A1A2E]'
      }`}
    >
      {children}
    </button>
  );
}

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F5F6FA] hover:text-[#1A1A2E] disabled:opacity-25 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function buildPageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(total - 1, page + 1);
  if (lo > 2) pages.push('…');
  for (let i = lo; i <= hi; i++) pages.push(i);
  if (hi < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

function Paginator({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-[rgba(0,0,0,0.06)] bg-white">
      <NavBtn disabled={page === 1} onClick={() => onChange(page - 1)}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </NavBtn>

      {buildPageWindow(page, total).map((p, i) =>
        p === '…' ? (
          <span key={`dots-${i}`} className="w-8 text-center text-[#9CA3AF] text-sm select-none">…</span>
        ) : (
          <PageBtn key={p} active={page === p} onClick={() => onChange(p as number)}>{p}</PageBtn>
        )
      )}

      <NavBtn disabled={page === total} onClick={() => onChange(page + 1)}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </NavBtn>
    </div>
  );
}

function FavStar({
  playerId,
  isFav,
  onToggle,
}: {
  playerId: string;
  isFav: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 ${
        isFav
          ? 'text-[#F59E0B] bg-amber-50 hover:bg-amber-100'
          : 'text-[#C4C9D4] hover:text-[#F59E0B] hover:bg-amber-50'
      }`}
      aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
    >
      <StarIcon
        filled={isFav}
        className={`transition-transform duration-150 hover:scale-110 ${
          isFav ? 'w-[18px] h-[18px] fill-current' : 'w-[18px] h-[18px]'
        }`}
      />
    </button>
  );
}

function PlayerRow({
  player,
  badge,
  isFav,
  onToggleFav,
  rank,
}: {
  player: { id?: string; teamId?: string; firstName: string; lastName: string; photo?: string; teamName: string; position: string };
  badge: React.ReactNode;
  isFav: boolean;
  onToggleFav: () => void;
  rank: number;
}) {
  const href = player.id && player.teamId ? `/team/${player.teamId}?player=${player.id}` : null;

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Rank number */}
      <span
        className="flex-shrink-0 w-6 text-right text-xs font-bold tabular-nums"
        style={{ color: rank <= 3 ? '#1A56DB' : '#C4C9D4' }}
      >
        {rank}
      </span>

      {player.photo ? (
        <img
          src={player.photo}
          alt={`${player.firstName} ${player.lastName}`}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
        />
      ) : (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200" />
      )}

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[#1A1A2E] truncate leading-tight">
          {player.lastName} {player.firstName}
        </h4>
        <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">
          {player.teamName} · {player.position}
        </p>
      </div>

      {player.id && (
        <FavStar
          playerId={player.id}
          isFav={isFav}
          onToggle={e => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
        />
      )}

      <div className="flex-shrink-0 text-right min-w-[70px]">
        {badge}
      </div>
    </div>
  );

  return href ? (
    <Link to={href} className="block hover:bg-[#F9FAFB] transition-colors">
      {inner}
    </Link>
  ) : (
    <div className="block">{inner}</div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const { isFavorite, toggleFavorite } = useFavorites();

  const [riskFilter, setRiskFilter] = useState<'global' | 'watchlist'>('global');
  const [spikeFilter, setSpikeFilter] = useState<'global' | 'watchlist'>('global');
  const [riskPage, setRiskPage] = useState(1);
  const [spikePage, setSpikePage] = useState(1);

  const { data: matchData, loading: matchLoading } = useDashboardMatches();
  const { data: teamsData } = useTeamsOverview();

  // Always fetch global data — watchlist filtering is done client-side via localStorage
  // so favorites update instantly without a page reload.
  const { data: highRiskData, loading: riskLoading } = useHighRiskPlayers();
  const { data: trendingData, loading: spikeLoading } = useTrendingPlayers();

  const teamIdByName = useMemo(() => {
    const map: Record<string, string> = {};
    (teamsData ?? []).forEach(t => { map[t.name] = t.id; });
    return map;
  }, [teamsData]);

  // Reset to page 1 when filter changes
  useEffect(() => { setRiskPage(1); }, [riskFilter]);
  useEffect(() => { setSpikePage(1); }, [spikeFilter]);

  // Only show the next gameweek's upcoming matches (within 4 days of the earliest unplayed date)
  // to avoid showing 2 gameweeks at once. Keep all played matches for context.
  const upcomingRaw = (matchData ?? []).filter(m => !m.isPlayed);
  const minUpcomingDate = upcomingRaw.reduce<string | null>(
    (min, m) => (min === null || m.date < min ? m.date : min),
    null,
  );
  const nextGWCutoff = minUpcomingDate
    ? new Date(new Date(minUpcomingDate).getTime() + 4 * 86_400_000).toISOString().split('T')[0]
    : null;
  const filteredMatchData = (matchData ?? []).filter(m =>
    m.isPlayed || !nextGWCutoff || m.date <= nextGWCutoff,
  );
  const sortedMatches = [...filteredMatchData].sort((a, b) => {
    if (a.isPlayed !== b.isPlayed) return a.isPlayed ? 1 : -1;
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });

  // High-risk: exclude injured (>=99); watchlist filters client-side by localStorage
  const allRisk = (highRiskData ?? []).filter(p => p.injuryRisk < 99);
  const filteredRisk = riskFilter === 'watchlist'
    ? allRisk.filter(p => p.id != null && isFavorite(p.id))
    : allRisk;
  const riskTotalPages = Math.max(1, Math.ceil(filteredRisk.length / PAGE_SIZE));
  const riskPageData = filteredRisk.slice((riskPage - 1) * PAGE_SIZE, riskPage * PAGE_SIZE);

  // Spikes: watchlist filters client-side by localStorage
  const allSpikes = trendingData ?? [];
  const filteredSpikes = spikeFilter === 'watchlist'
    ? allSpikes.filter(p => p.id != null && isFavorite(p.id))
    : allSpikes;
  const spikeTotalPages = Math.max(1, Math.ceil(filteredSpikes.length / PAGE_SIZE));
  const spikePageData = filteredSpikes.slice((spikePage - 1) * PAGE_SIZE, spikePage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Hero + Match Cards */}
      <div className="hero-net bg-gradient-to-b from-[#1A56DB] via-[#2563EB] to-[#F5F6FA] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-6">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Stay ahead of the injury room!</h1>
          <p className="text-white/70 text-lg font-medium">
            AI-driven predictive injury risk, squad availability and return timelines all in one place.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
            {matchLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[240px] h-[148px] bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] animate-pulse" />
              ))
            ) : sortedMatches.length === 0 ? (
              <div className="text-sm text-white/70 py-4">No matches available</div>
            ) : (
              sortedMatches.map((match) => (
                <MatchCard key={match.id} match={match} teamIdByName={teamIdByName} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Left: High Risk Players ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A2E] tracking-tight">High Risk Players</h2>
                <p className="text-sm text-[#9CA3AF] mt-0.5">Players with the highest predicted injury risk</p>
              </div>
              <div className="flex items-center gap-3">
                <FilterToggle value={riskFilter} onChange={setRiskFilter} />
                <Link to="/my-players" className="text-sm text-[#1A56DB] hover:underline font-medium">
                  View all
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-black/[0.03] border border-[rgba(0,0,0,0.06)] overflow-hidden">
              {riskLoading ? (
                <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="animate-pulse flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-2/5" />
                          <div className="h-3 bg-gray-100 rounded w-1/4" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                        <div className="w-16 h-7 bg-gray-100 rounded-xl flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRisk.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[#6B7280]">
                    {riskFilter === 'watchlist'
                      ? 'No players in your watchlist are currently showing severe risk scores.'
                      : 'No players globally are currently showing severe risk scores.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                    {riskPageData.map((player: DashboardHighRiskPlayer, idx: number) => (
                      <PlayerRow
                        key={player.id ?? `${player.lastName}-${player.firstName}`}
                        rank={(riskPage - 1) * PAGE_SIZE + idx + 1}
                        player={player}
                        isFav={isFavorite(player.id ?? '')}
                        onToggleFav={() => toggleFavorite(player.id!, {
                          id: player.id!,
                          teamId: player.teamId,
                          firstName: player.firstName,
                          lastName: player.lastName,
                          photo: player.photo,
                          teamName: player.teamName,
                          position: player.position,
                          injuryTrend: (trendingData ?? []).find(t => t.id === player.id)?.injuryTrend ?? 0,
                          seasonalInjuries: player.seasonalInjuries,
                          injuryRisk: player.injuryRisk,
                        })}
                        badge={
                          <div>
                            <span
                              className="inline-block px-2.5 py-1 rounded-lg font-bold text-white text-xs"
                              style={{ fontFamily: 'var(--font-mono)', backgroundColor: getRelativeRiskMeta(player.relativeRisk).color }}
                            >
                              {player.relativeRisk != null ? `${player.relativeRisk.toFixed(1)}×` : '—'}
                            </span>
                            <div className="text-[11px] text-[#9CA3AF] mt-1 text-right">
                              {player.seasonalInjuries} inj.
                            </div>
                          </div>
                        }
                      />
                    ))}
                  </div>
                  <Paginator page={riskPage} total={riskTotalPages} onChange={setRiskPage} />
                </>
              )}
            </div>
          </div>

          {/* ── Right: Risk Spikes ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A2E] tracking-tight">Recent Injury Risk Spikes</h2>
                <p className="text-sm text-[#9CA3AF] mt-0.5">Players with the largest recent risk increases</p>
              </div>
              <FilterToggle value={spikeFilter} onChange={setSpikeFilter} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm shadow-black/[0.03] border border-[rgba(0,0,0,0.06)] overflow-hidden">
              {spikeLoading ? (
                <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="animate-pulse flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-2/5" />
                          <div className="h-3 bg-gray-100 rounded w-1/4" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                        <div className="w-16 h-7 bg-gray-100 rounded-xl flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSpikes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[#6B7280]">
                    {spikeFilter === 'watchlist'
                      ? 'No players in your watchlist are currently showing severe risk spikes.'
                      : 'No players globally are currently showing severe risk spikes.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                    {spikePageData.map((player: DashboardTrendingPlayer, idx: number) => (
                      <PlayerRow
                        key={player.id ?? `${player.lastName}-${player.firstName}`}
                        rank={(spikePage - 1) * PAGE_SIZE + idx + 1}
                        player={player}
                        isFav={isFavorite(player.id ?? '')}
                        onToggleFav={() => toggleFavorite(player.id!, {
                          id: player.id!,
                          teamId: player.teamId,
                          firstName: player.firstName,
                          lastName: player.lastName,
                          photo: player.photo,
                          teamName: player.teamName,
                          position: player.position,
                          injuryTrend: player.injuryTrend,
                          seasonalInjuries: player.seasonalInjuries,
                          injuryRisk: (highRiskData ?? []).find(h => h.id === player.id)?.injuryRisk ?? 0,
                        })}
                        badge={
                          <div>
                            <span
                              className="inline-block px-2.5 py-1 rounded-lg font-bold text-white text-xs"
                              style={{ fontFamily: 'var(--font-mono)', backgroundColor: '#DC2626' }}
                            >
                              +{player.injuryTrend.toFixed(1)}%
                            </span>
                            <div className="text-[11px] text-[#9CA3AF] mt-1 text-right">
                              {player.seasonalInjuries} inj.
                            </div>
                          </div>
                        }
                      />
                    ))}
                  </div>
                  <Paginator page={spikePage} total={spikeTotalPages} onChange={setSpikePage} />

                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
