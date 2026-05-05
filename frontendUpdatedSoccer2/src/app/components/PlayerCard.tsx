import { useEffect, useRef, useState } from 'react';
import { Player } from '../data/mockData';
import { StarIcon } from './StarIcon';
import { getRelativeRiskMeta } from '../utils/risk';

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
  const trendArrow = player.riskTrend > 0 ? '↑' : '↓';
  const trendColor = player.riskTrend > 0 ? '#FCA5A5' : '#6EE7B7';

  const today = new Date().toISOString().split('T')[0];
  const isInjured = player.injuryRisk >= 99 || (player.injuryHistory ?? []).some(entry => entry.until >= today);
  const missedMatches = player.injurySummaryData?.matches_missed_this_season ?? Math.round((player.minutesMissed ?? 0) / 90);

  const lighterColor = lightenColor(teamColor, 20);
  const gradient = `linear-gradient(135deg, ${teamColor} 0%, ${lighterColor} 100%)`;

  // ── 3-D rotation on press-and-drag ───────────────────────────────────────
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const drag = useRef({ active: false, startX: 0, startY: 0 });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    holdTimer.current = setTimeout(() => {
      drag.current = { active: true, startX, startY };
    }, 120);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      setRot({
        x: Math.max(-40, Math.min(40, -dy * 0.3)),
        y: Math.max(-40, Math.min(40,  dx * 0.3)),
      });
    };
    const onUp = () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      drag.current.active = false;
      setRot({ x: 0, y: 0 });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const isRotating = rot.x !== 0 || rot.y !== 0;

  return (
    // Perspective wrapper — must not clip overflow so shadow stays visible
    <div style={{ perspective: '900px' }}>
      <div
        onPointerDown={onPointerDown}
        className="relative w-[340px] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)] select-none"
        style={{
          background: gradient,
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: isRotating ? 'none' : 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
          cursor: 'grab',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Favorite Star */}
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
          >
            <StarIcon
              filled={!!isFavorite}
              className={isFavorite ? 'w-5 h-5 text-[#F59E0B] fill-current' : 'w-5 h-5 text-white'}
            />
          </button>
        )}

        <div className="flex flex-col px-5 pt-5 pb-4 text-white">
          {/* Header */}
          <div className="mb-2 pr-10">
            <div className="text-[10px] font-semibold opacity-60 tracking-[0.18em] uppercase leading-none mb-1">
              {player.firstName}
            </div>
            <h2 className="text-2xl font-bold leading-tight tracking-wide">
              {player.lastName.toUpperCase()}
            </h2>
            <div className="text-[12px] opacity-80 mt-0.5">
              {player.position} · {player.kitNumber} · {player.nationality}
            </div>
            <div className="text-[12px] opacity-80 mt-0.5">Age: {player.age}</div>
          </div>

          {/* Player Image */}
          <div className="flex items-center justify-center mb-3">
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
          {(() => {
            const meta = getRelativeRiskMeta(player.relativeRisk);
            const relBg = isInjured
              ? 'rgba(220,38,38,0.25)'
              : player.relativeRisk == null
                ? 'rgba(255,255,255,0.15)'
                : meta.color === '#0D9488'
                  ? 'rgba(13,148,136,0.35)'
                  : meta.color === '#EA580C'
                    ? 'rgba(234,88,12,0.35)'
                    : 'rgba(220,38,38,0.35)';
            return (
              <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-around" style={{ backgroundColor: relBg }}>
                {/* Injury risk */}
                <div className="text-center">
                  <div className="text-4xl font-bold font-mono leading-none mb-1">
                    {isInjured ? 'INJ' : `${player.injuryRisk}%`}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest opacity-75">INJURY RISK</div>
                </div>
                <div className="w-px self-stretch opacity-30" style={{ backgroundColor: 'white' }} />
                {/* Relative risk */}
                <div className="text-center">
                  <div className="text-4xl font-bold font-mono leading-none mb-1">
                    {isInjured ? '—' : player.relativeRisk != null ? `${player.relativeRisk.toFixed(1)}×` : '—'}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest opacity-75">
                    {isInjured ? 'INJURED' : meta.label === '—' ? 'REL. RISK' : meta.label.toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stats Grid — 2×2 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">TREND</div>
              <div className="text-lg font-bold font-mono" style={{ color: trendColor }}>
                {trendArrow}{Math.abs(player.riskTrend)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">MISSED MATCHES</div>
              <div className="text-lg font-bold font-mono">{missedMatches}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">MINS PLAYED</div>
              <div className="text-lg font-bold font-mono">{player.minutesPlayed?.toLocaleString() ?? '-'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">INJURIES</div>
              <div
                className="text-lg font-bold font-mono"
                style={{ color: player.injuries >= 2 ? '#FCA5A5' : 'white' }}
              >
                {player.injuries}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-white/20 pt-2">
            <p className="text-[10px] opacity-60 text-right">* Data based on this season</p>
          </div>
        </div>
      </div>
    </div>
  );
}
