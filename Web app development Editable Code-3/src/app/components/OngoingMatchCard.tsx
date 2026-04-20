import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Match, Team } from '../data/mockData';

interface OngoingMatchCardProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
}

export function OngoingMatchCard({ match, homeTeam, awayTeam }: OngoingMatchCardProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [shouldFlash, setShouldFlash] = useState(false);

  useEffect(() => {
    if (!match.kickoffTime) return;

    const updateTimer = () => {
      const kickoff = new Date(match.kickoffTime!).getTime();
      const now = Date.now();
      const elapsedMs = now - kickoff;
      const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);

      setTimeElapsed(elapsedMinutes);

      // Total match time is 90 minutes
      const timeRemaining = 90 - elapsedMinutes;
      setShouldFlash(timeRemaining <= 5 && timeRemaining > 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [match.kickoffTime]);

  const displayTime = Math.min(timeElapsed, 90);
  const progress = (displayTime / 90) * 100;
  const timeRemaining = Math.max(0, 90 - timeElapsed);

  return (
    <Link
      to={`/match/${match.id}`}
      className={`flex-shrink-0 w-[200px] bg-white rounded-2xl p-4 hover:shadow-lg transition-all border-2 ${
        shouldFlash
          ? 'border-[#DC2626] animate-pulse-border'
          : 'border-[rgba(0,0,0,0.06)]'
      }`}
    >
      {/* Live Badge */}
      <div className="flex justify-center mb-3">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
          shouldFlash
            ? 'bg-[#DC2626] text-white animate-pulse'
            : 'bg-[#DC2626] text-white'
        }`}>
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col items-center gap-1">
          <div
            className="text-lg font-bold"
            style={{ color: homeTeam.accentColor, fontFamily: 'var(--font-sans)' }}
          >
            {homeTeam.name.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
            {homeTeam.avgRisk}%
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div
            className="text-lg font-bold"
            style={{ color: awayTeam.accentColor, fontFamily: 'var(--font-sans)' }}
          >
            {awayTeam.name.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
            {awayTeam.avgRisk}%
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="text-center mb-3 py-2">
        {match.score && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
              {match.score.home}
            </span>
            <span className="text-[#6B7280]">-</span>
            <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
              {match.score.away}
            </span>
          </div>
        )}
      </div>

      {/* Match Time */}
      <div className="text-center mb-3">
        <div className="text-2xl font-bold text-[#DC2626]" style={{ fontFamily: 'var(--font-mono)' }}>
          {displayTime}'
        </div>
        <div className="text-xs text-[#6B7280] mt-1">
          {timeRemaining} min remaining
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#F5F6FA] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            shouldFlash ? 'bg-[#DC2626]' : 'bg-[#1A56DB]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
}
