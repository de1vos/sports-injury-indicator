import { useState } from 'react';
import { Link } from 'react-router';
import { teams, getRiskColor } from '../data/mockData';

export function TeamsPage() {
  const [sortBy, setSortBy] = useState<'risk' | 'name'>('risk');

  const sortedTeams = [...teams].sort((a, b) => {
    if (sortBy === 'risk') {
      return b.avgRisk - a.avgRisk;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Teams</h1>
        <p className="text-[#6B7280]">View all Premier League teams and their injury risk data.</p>
      </div>

      {/* Injury Risk Rankings */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1A1A2E]">
              Injury Risk Rankings
            </h2>

            {/* Filter Options */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#6B7280] mr-2">Sort by:</span>
              <button
                onClick={() => setSortBy('risk')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  sortBy === 'risk'
                    ? 'bg-[#1A56DB] text-white'
                    : 'text-[#6B7280] hover:bg-[#F5F6FA]'
                }`}
              >
                Risk
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
            </div>
          </div>

          {/* Team Bars */}
          <div className="space-y-3">
            {sortedTeams.map((team, index) => (
              <Link
                key={team.id}
                to={`/team/${team.id}`}
                className="block bg-gradient-to-r from-white to-[#F5F6FA] rounded-2xl p-5 border-2 border-[rgba(0,0,0,0.06)] hover:border-[#1A56DB] hover:shadow-md transition-all"
              >
                {/* Mobile View - Logo and Name only */}
                <div className="flex md:hidden items-center gap-4">
                  {/* Team Logo */}
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                    style={{ backgroundColor: team.accentColor }}
                  >
                    {team.name.substring(0, 3).toUpperCase()}
                  </div>

                  {/* Team Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-[#1A1A2E]">
                      {team.name}
                    </h3>
                  </div>
                </div>

                {/* Desktop View - Full stats */}
                <div className="hidden md:flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-10">
                    <span className="text-2xl font-bold text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Team Logo */}
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                    style={{ backgroundColor: team.accentColor }}
                  >
                    {team.name.substring(0, 3).toUpperCase()}
                  </div>

                  {/* Team Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-[#1A1A2E]">
                      {team.name}
                    </h3>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-[#6B7280] mb-1">Squad</div>
                      <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {team.squadSize}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-[#6B7280] mb-1">Avg Risk</div>
                      <div
                        className="text-lg font-bold px-3 py-1 rounded-lg text-white"
                        style={{
                          backgroundColor: getRiskColor(team.avgRisk),
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {team.avgRisk}%
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-[#6B7280] mb-1">Injuries</div>
                      <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {team.totalInjuries}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-[#6B7280] mb-1">Minutes Lost</div>
                      <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {(team.totalMinutesLost / 1000).toFixed(1)}k
                      </div>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
