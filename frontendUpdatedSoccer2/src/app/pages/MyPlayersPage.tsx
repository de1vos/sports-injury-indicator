import { useState } from 'react';
import { Link } from 'react-router';
import { useMyPlayers } from '../hooks/useApi';

export function MyPlayersPage() {
  const { data, loading, error } = useMyPlayers('1');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const players = data ?? [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 text-[#1A56DB] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#6B7280] text-sm">Loading your players…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-semibold mb-2">Failed to load players</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

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

        {/* View toggle */}
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
            const trendPositive = player.injuryTrend > 0;
            const trendLabel = `${trendPositive ? '+' : ''}${player.injuryTrend.toFixed(1)}%`;
            const href = player.id && player.teamId
              ? `/team/${player.teamId}?player=${player.id}`
              : null;
            const inner = (
              <>
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
                    <span className="font-bold">{player.firstName}</span>{' '}
                    <span className="font-normal">{player.lastName}</span>
                  </div>
                  <div className="text-xs text-[#6B7280]">{player.teamName} · {player.position}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${trendPositive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {trendLabel}
                </span>
                <span className="text-xs text-[#6B7280] flex-shrink-0 hidden sm:block">
                  {player.seasonalInjuries} inj.
                </span>
              </>
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
            const trendPositive = player.injuryTrend > 0;
            const trendLabel = `${trendPositive ? '+' : ''}${player.injuryTrend.toFixed(1)}%`;
            const href = player.id && player.teamId
              ? `/team/${player.teamId}?player=${player.id}`
              : null;
            const cardContent = (
              <>
                <div className="flex items-center gap-3 mb-4">
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
                    <h3 className="font-bold text-[#1A1A2E]">
                      {player.firstName} {player.lastName}
                    </h3>
                    <p className="text-sm text-[#6B7280]">{player.teamName} · {player.position}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <div>
                    <div className="text-xs text-[#6B7280] mb-1">Injury Trend</div>
                    <span className={`text-sm font-semibold px-2 py-1 rounded-full ${trendPositive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {trendLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#6B7280] mb-1">Seasonal Inj.</div>
                    <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: player.seasonalInjuries >= 2 ? '#DC2626' : '#1A1A2E' }}>
                      {player.seasonalInjuries}
                    </div>
                  </div>
                </div>
              </>
            );
            return href ? (
              <Link
                key={player.id ?? `${player.firstName}-${player.lastName}-${index}`}
                to={href}
                className="block bg-white rounded-2xl p-6 shadow-sm border border-[rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#1A56DB] transition-all"
              >
                {cardContent}
              </Link>
            ) : (
              <div
                key={player.id ?? `${player.firstName}-${player.lastName}-${index}`}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[rgba(0,0,0,0.06)]"
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
