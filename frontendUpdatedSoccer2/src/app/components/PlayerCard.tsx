import { Player, getRiskColor } from '../data/mockData';
import { StarIcon } from './StarIcon';

interface PlayerCardProps {
  player: Player;
  teamName: string;
  teamColor: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1).toUpperCase();
}

export function PlayerCard({ player, teamName, teamColor, isFavorite, onToggleFavorite }: PlayerCardProps) {
  const trendColor = player.riskTrend > 0 ? '#DC2626' : '#0D9488';
  const trendArrow = player.riskTrend > 0 ? '↑' : '↓';

  const today = new Date().toISOString().split('T')[0];
  const isInjured = (player.injuryHistory ?? []).some(entry => entry.until >= today);

  const lighterColor = lightenColor(teamColor, 20);
  const gradient = `linear-gradient(135deg, ${teamColor} 0%, ${lighterColor} 100%)`;

  return (
    <div
      className="relative w-[320px] h-[450px] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      style={{ background: gradient }}
    >
      {/* Favorite Star */}
      {onToggleFavorite && (
        <button
          onClick={onToggleFavorite}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
        >
          <StarIcon
            filled={!!isFavorite}
            className={isFavorite ? 'w-6 h-6 text-[#F59E0B] fill-current' : 'w-6 h-6 text-white'}
          />
        </button>
      )}

      {/* Card Content */}
      <div className="h-full flex flex-col p-5 text-white">
        {/* Player Name - Top Left */}
        <div className="mb-2">
          <h2 className="text-xl font-bold leading-tight">{player.lastName.toUpperCase()}</h2>
          <div className="text-[11px] opacity-80 mt-0.5">{player.position} · {player.kitNumber}</div>
        </div>

        {/* Player Image - Center */}
        <div className="flex items-center justify-center mb-2">
          {player.image ? (
            <img
              src={player.image}
              alt={`${player.firstName} ${player.lastName}`}
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center">
              <svg className="w-14 h-14 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Injury Risk */}
        <div className="text-center mb-4">
          <div className="text-5xl font-bold mb-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
            {player.injuryRisk}%
          </div>
          <div className="text-[9px] uppercase tracking-wider opacity-80 mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
            INJURY RISK
          </div>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: isInjured ? '#DC2626' : '#0D9488', color: 'white' }}
          >
            {isInjured ? 'Injured' : 'Fit'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 mb-3">
          <div>
            <div className="text-[10px] uppercase opacity-70 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              AGE
            </div>
            <div className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              {player.age}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              MISSED
            </div>
            <div className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              {player.injurySummaryData?.matches_missed_this_season ?? Math.round((player.minutesMissed ?? 0) / 90)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              MINS
            </div>
            <div className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              {player.minutesPlayed?.toLocaleString() ?? '-'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              Injuries
            </div>
            <div
              className="text-base font-bold"
              style={{
                fontFamily: 'var(--font-mono)',
                color: player.injuries >= 2 ? '#FCA5A5' : 'white'
              }}
            >
              {player.injuries}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              TREND
            </div>
            <div
              className="text-base font-bold"
              style={{
                fontFamily: 'var(--font-mono)',
                color: player.riskTrend > 0 ? '#FCA5A5' : '#6EE7B7'
              }}
            >
              {trendArrow}{Math.abs(player.riskTrend)}%
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/20">
          <div className="text-2xl opacity-90">
            {player.nationality}
          </div>
        </div>
      </div>
    </div>
  );
}
