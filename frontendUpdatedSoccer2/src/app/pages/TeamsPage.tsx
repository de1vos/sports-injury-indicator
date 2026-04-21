import { useState } from 'react';
import { Link } from 'react-router';
import { getRiskColor } from '../data/mockData';
import { SortBar } from '../components/SortBar';
import { useTeamsOverview } from '../hooks/useApi';

export function TeamsPage() {
  const [sortBy, setSortBy] = useState<'risk' | 'name'>('risk');
  const { data: teams, loading } = useTeamsOverview();

  const sortedTeams = [...(teams ?? [])].sort((a, b) => {
    if (sortBy === 'risk') {
      return b.avgRisk - a.avgRisk;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1A56DB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280]">Loading teams…</p>
        </div>
      </div>
    );
  }

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

            <SortBar
              options={[{ value: 'risk', label: 'Risk' }, { value: 'name', label: 'Name' }]}
              value={sortBy}
              onChange={(v) => setSortBy(v as 'risk' | 'name')}
            />
          </div>

          {/* Team Rows */}
          <div className="space-y-3">
            {sortedTeams.map((team) => {
              const percentInjured = Math.round((team.totalInjuries / team.squadSize) * 100);
              return (
                <Link
                  key={team.id}
                  to={`/team/${team.id}`}
                  className="block bg-gradient-to-r from-white to-[#F5F6FA] rounded-2xl p-5 border-2 border-[rgba(0,0,0,0.06)] hover:border-[#1A56DB] hover:shadow-md transition-all"
                >
                  {/* Mobile View - Logo and Name only */}
                  <div className="flex md:hidden items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden border border-[rgba(0,0,0,0.06)]">
                      <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-[#1A1A2E]">{team.name}</h3>
                    </div>
                  </div>

                  {/* Desktop View - Full stats */}
                  <div className="hidden md:flex items-center gap-4">
                    {/* Team Logo */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden border border-[rgba(0,0,0,0.06)]">
                      <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
                    </div>

                    {/* Team Name */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-[#1A1A2E]">{team.name}</h3>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-8">
                      {/* Avg Risk badge */}
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

                      {/* Active Injuries */}
                      <div className="text-center">
                        <div className="text-xs text-[#6B7280] mb-1">Active Injuries</div>
                        <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {team.totalInjuries}
                        </div>
                      </div>

                      {/* Squad Size */}
                      <div className="text-center">
                        <div className="text-xs text-[#6B7280] mb-1">Squad</div>
                        <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {team.squadSize}
                        </div>
                      </div>

                      {/* % Injured */}
                      <div className="text-center">
                        <div className="text-xs text-[#6B7280] mb-1">% Injured</div>
                        <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {percentInjured}%
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
