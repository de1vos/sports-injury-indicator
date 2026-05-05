import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useFavorites } from '../hooks/useFavorites';
import { getRelativeRiskMeta } from '../utils/risk';

export function MyPlayersPage() {
  const { favoritePlayers: rawPlayers, toggleFavorite, refresh } = useFavorites();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  useEffect(() => { refresh(); }, []);

  const players = [...rawPlayers].sort((a, b) => {
    if (a.injuryStatus === 'Injured' && b.injuryStatus !== 'Injured') return -1;
    if (b.injuryStatus === 'Injured' && a.injuryStatus !== 'Injured') return 1;
    const aRisk = a.injuryRisk ?? -1;
    const bRisk = b.injuryRisk ?? -1;
    return bRisk - aRisk;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">My Players</h1>
          <p className="text-[#6B7280]">
            {players.length > 0
              ? `Tracking ${players.length} player${players.length !== 1 ? 's' : ''}`
              : 'Track your favorite players and their injury risk'}
          </p>
        </div>

        {players.length > 0 && (
          <div className="flex items-center gap-1 bg-[#F5F6FA] rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#1A56DB] text-white' : 'text-[#6B7280] hover:text-[#1A1A2E]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('card')}
              title="Card view"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card' ? 'bg-[#1A56DB] text-white' : 'text-[#6B7280] hover:text-[#1A1A2E]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {players.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[rgba(0,0,0,0.06)]">
          <svg className="w-16 h-16 text-[#6B7280] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">No players in your watchlist</h3>
          <p className="text-[#6B7280] mb-4">Add players to your watchlist to track their injury trends here</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-[#1A56DB] text-white rounded-full font-semibold hover:bg-[#0D47A1] transition-colors"
          >
            Browse Players
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] overflow-hidden">
          {players.map((player, index) => {
            const isInjured = player.injuryStatus === 'Injured';
            const trendPositive = player.injuryTrend > 0;
            const trendLabel = `${trendPositive ? '+' : ''}${player.injuryTrend.toFixed(1)}%`;
            const href = player.id && player.teamId
              ? `/team/${player.teamId}?player=${player.id}`
              : null;

            const inner = (
              <div className="flex items-center gap-3 w-full">
                {player.photo ? (
                  <img
                    src={player.photo}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-[#D1D5DB] rounded-full flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#1A1A2E]">
                    <span className="font-bold">{player.lastName}</span>{' '}
                    <span className="font-normal">{player.firstName}</span>
                  </div>
                  <div className="text-xs text-[#6B7280]">{player.teamName}</div>
                </div>

                {/* Injury status */}
                <span
                  className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: isInjured ? '#DC2626' : '#0D9488', color: 'white' }}
                >
                  {isInjured ? 'Injured' : 'Fit'}
                </span>

                {/* Relative risk — only shown when not injured */}
                {!isInjured && (
                  <span
                    className="flex-shrink-0 px-2 py-1 rounded-xl text-xs font-bold text-white"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: getRelativeRiskMeta(player.relativeRisk ?? null).color,
                    }}
                  >
                    {player.relativeRisk != null ? `${player.relativeRisk.toFixed(1)}×` : '—'}
                  </span>
                )}

                {/* Trend */}
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full hidden sm:block ${trendPositive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {trendLabel}
                </span>

                {/* Season injuries */}
                <span className="flex-shrink-0 text-xs text-[#6B7280] hidden md:block">
                  {player.seasonalInjuries} inj.
                </span>

                {/* Minutes played */}
                {player.minutesPlayed != null && (
                  <span className="flex-shrink-0 text-xs text-[#6B7280] hidden lg:block" style={{ fontFamily: 'var(--font-mono)' }}>
                    {player.minutesPlayed} min
                  </span>
                )}

                {/* Star / remove */}
                <button
                  onClick={e => { e.preventDefault(); toggleFavorite(player.id); }}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F6FA] transition-colors text-[#F59E0B]"
                  title="Remove from watchlist"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              </div>
            );

            return (
              <div key={player.id ?? `${player.firstName}-${player.lastName}-${index}`}>
                {href ? (
                  <Link to={href} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F5F6FA] transition-colors">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-6 py-4">
                    {inner}
                  </div>
                )}
                {index < players.length - 1 && <div className="border-b border-[rgba(0,0,0,0.06)]" />}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player, index) => {
            const isInjured = player.injuryStatus === 'Injured';
            const trendPositive = player.injuryTrend > 0;
            const trendLabel = `${trendPositive ? '+' : ''}${player.injuryTrend.toFixed(1)}%`;
            const href = player.id && player.teamId
              ? `/team/${player.teamId}?player=${player.id}`
              : null;

            const cardContent = (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#D1D5DB] rounded-full flex-shrink-0" />
                    )}
                    <div>
                      <h3 className="font-bold text-[#1A1A2E] leading-tight">
                        {player.lastName} {player.firstName}
                      </h3>
                      <p className="text-sm text-[#6B7280]">{player.teamName}</p>
                    </div>
                  </div>

                  {/* Star */}
                  <button
                    onClick={e => { e.preventDefault(); toggleFavorite(player.id); }}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F6FA] transition-colors text-[#F59E0B]"
                    title="Remove from watchlist"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Injury status */}
                  <div className="flex flex-col gap-0.5 p-2.5 bg-[#F5F6FA] rounded-xl">
                    <span className="text-xs text-[#6B7280]">Status</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full self-start"
                      style={{ backgroundColor: isInjured ? '#DC2626' : '#0D9488', color: 'white' }}
                    >
                      {isInjured ? 'Injured' : 'Fit'}
                    </span>
                  </div>

                  {/* Relative risk */}
                  <div className="flex flex-col gap-0.5 p-2.5 bg-[#F5F6FA] rounded-xl">
                    <span className="text-xs text-[#6B7280]">Risk</span>
                    {isInjured ? (
                      <span className="text-sm font-bold text-[#DC2626]" style={{ fontFamily: 'var(--font-mono)' }}>INJURED</span>
                    ) : (
                      <span
                        className="text-lg font-bold"
                        style={{ fontFamily: 'var(--font-mono)', color: getRelativeRiskMeta(player.relativeRisk ?? null).color }}
                      >
                        {player.relativeRisk != null ? `${player.relativeRisk.toFixed(1)}×` : '—'}
                      </span>
                    )}
                  </div>

                  {/* Trend */}
                  <div className="flex flex-col gap-0.5 p-2.5 bg-[#F5F6FA] rounded-xl">
                    <span className="text-xs text-[#6B7280]">Trend</span>
                    <span
                      className={`text-sm font-semibold px-1.5 py-0.5 rounded-full self-start text-xs ${trendPositive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {trendLabel}
                    </span>
                  </div>

                  {/* Season injuries */}
                  <div className="flex flex-col gap-0.5 p-2.5 bg-[#F5F6FA] rounded-xl">
                    <span className="text-xs text-[#6B7280]">Season Inj.</span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: player.seasonalInjuries >= 2 ? '#DC2626' : '#1A1A2E',
                      }}
                    >
                      {player.seasonalInjuries}
                    </span>
                  </div>
                </div>

                {player.minutesPlayed != null && (
                  <div className="flex items-center justify-between pt-3 border-t border-[rgba(0,0,0,0.06)]">
                    <span className="text-xs text-[#6B7280]">Minutes Played</span>
                    <span className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.minutesPlayed.toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            );

            return href ? (
              <Link
                key={player.id ?? `${player.firstName}-${player.lastName}-${index}`}
                to={href}
                className="block bg-white rounded-2xl p-5 shadow-sm border border-[rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#1A56DB] transition-all"
              >
                {cardContent}
              </Link>
            ) : (
              <div
                key={player.id ?? `${player.firstName}-${player.lastName}-${index}`}
                className="bg-white rounded-2xl p-5 shadow-sm border border-[rgba(0,0,0,0.06)]"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
