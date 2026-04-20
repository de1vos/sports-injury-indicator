import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getRiskColor, getAllPlayers } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import { StarIcon } from '../components/StarIcon';

function getInjuryStatus(injuryHistory: { until: string }[]): 'Injured' | 'Fit' {
  const today = new Date().toISOString().split('T')[0];
  return injuryHistory.some((inj) => inj.until >= today) ? 'Injured' : 'Fit';
}

export function MyPlayersPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const favoritePlayers = getAllPlayers()
    .filter(p => favorites.has(p.id))
    .sort((a, b) => b.injuryRisk - a.injuryRisk);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">My Players</h1>
          <p className="text-[#6B7280]">
            {favoritePlayers.length > 0
              ? `Tracking ${favoritePlayers.length} player${favoritePlayers.length !== 1 ? 's' : ''}`
              : 'Track your favorite players and their injury risk'}
          </p>
        </div>

        {/* View toggle */}
        {favoritePlayers.length > 0 && (
          <div className="flex items-center gap-1 bg-[#F5F6FA] rounded-xl p-1">
            {/* List view button */}
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
            {/* Card view button */}
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
      ) : viewMode === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] overflow-hidden">
          {favoritePlayers.map((player, index) => {
            const status = getInjuryStatus(player.injuryHistory);
            return (
              <div key={player.id}>
                <div
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#F5F6FA] transition-colors cursor-pointer"
                  onClick={() => navigate(`/team/${player.teamId}?player=${player.id}`)}
                >
                  {/* Photo / kit number fallback */}
                  {player.photo ? (
                    <img
                      src={player.photo}
                      alt={`${player.firstName} ${player.lastName}`}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#F5F6FA] rounded-full flex items-center justify-center flex-shrink-0 border border-[rgba(0,0,0,0.06)]">
                      <span className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {player.kitNumber}
                      </span>
                    </div>
                  )}

                  {/* Name + subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1A1A2E]">
                      <span className="font-bold">{player.lastName}</span>{' '}
                      <span className="font-normal">{player.firstName}</span>
                    </div>
                    <div className="text-xs text-[#6B7280]">{player.teamName} · {player.position}</div>
                  </div>

                  {/* Injury status */}
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                      status === 'Injured'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {status}
                  </span>

                  {/* Injury risk */}
                  <div className="text-center flex-shrink-0 hidden sm:block">
                    <div className="text-xs text-[#6B7280] mb-1">Risk</div>
                    <div
                      className="px-2 py-0.5 rounded-md text-sm font-bold text-white"
                      style={{
                        backgroundColor: getRiskColor(player.injuryRisk),
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {player.injuryRisk}%
                    </div>
                  </div>

                  {/* Injuries this season */}
                  <div className="text-center flex-shrink-0 hidden md:block">
                    <div className="text-xs text-[#6B7280] mb-1">Inj.</div>
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

                  {/* Minutes played */}
                  <div className="text-center flex-shrink-0 hidden md:block">
                    <div className="text-xs text-[#6B7280] mb-1">Mins</div>
                    <div className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.minutesPlayed.toLocaleString()}
                    </div>
                  </div>

                  {/* Favorite star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(player.id);
                    }}
                    className="p-1 hover:bg-[#F5F6FA] rounded-full transition-colors flex-shrink-0"
                  >
                    <StarIcon filled={true} className="w-5 h-5 text-[#F59E0B] fill-current" />
                  </button>
                </div>
                {index < favoritePlayers.length - 1 && (
                  <div className="border-b border-[rgba(0,0,0,0.06)]" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritePlayers.map((player) => {
            const status = getInjuryStatus(player.injuryHistory);
            return (
              <div
                key={player.id}
                onClick={() => navigate(`/team/${player.teamId}?player=${player.id}`)}
                className="block bg-white rounded-2xl p-6 shadow-sm border border-[rgba(0,0,0,0.06)] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#F5F6FA] rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {player.kitNumber}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-[#1A1A2E]">{player.firstName} {player.lastName}</h3>
                      <p className="text-sm text-[#6B7280]">{player.position}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(player.id);
                    }}
                    className="p-1 hover:bg-[#F5F6FA] rounded-full transition-colors"
                  >
                    <StarIcon filled={true} className="w-6 h-6 text-[#F59E0B] fill-current" />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-[#6B7280] mb-1">Injury Risk</div>
                    <div
                      className="px-3 py-1 rounded-full text-lg font-bold text-white inline-block"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: getRiskColor(player.injuryRisk)
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
                    <div className="text-xs text-[#6B7280] mb-1">Status</div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        status === 'Injured' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <div className="text-center">
                    <div className="text-xs text-[#6B7280] mb-1">Games</div>
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
                    <div className="text-xs text-[#6B7280] mb-1">Mins</div>
                    <div className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.minutesPlayed.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
