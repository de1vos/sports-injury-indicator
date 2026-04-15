import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { teams } from '../data/mockData';

type SortField = 'date' | 'player' | 'team' | 'diagnosis' | 'region' | 'severity';
type SortDirection = 'asc' | 'desc';

export function ReportedInjuriesPage() {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');

  // Get all injuries from all teams
  const allInjuriesRaw = teams.flatMap(team =>
    team.players.flatMap(player =>
      player.injuryHistory.map(injury => ({
        ...injury,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: team.id,
        teamName: team.name,
        position: player.position
      }))
    )
  );

  // Get unique values for filters
  const uniqueTeams = useMemo(() => {
    const teams = [...new Set(allInjuriesRaw.map(i => i.teamName))];
    return teams.sort();
  }, [allInjuriesRaw]);

  const uniqueRegions = useMemo(() => {
    const regions = [...new Set(allInjuriesRaw.map(i => i.region))];
    return regions.sort();
  }, [allInjuriesRaw]);

  const allInjuries = useMemo(() => {
    // First filter
    let filtered = [...allInjuriesRaw];

    if (filterTeam !== 'all') {
      filtered = filtered.filter(i => i.teamName === filterTeam);
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(i => i.severity === filterSeverity);
    }

    if (filterRegion !== 'all') {
      filtered = filtered.filter(i => i.region === filterRegion);
    }

    // Then sort
    const sorted = filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'player':
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        case 'team':
          comparison = a.teamName.localeCompare(b.teamName);
          break;
        case 'diagnosis':
          comparison = a.diagnosis.localeCompare(b.diagnosis);
          break;
        case 'region':
          comparison = a.region.localeCompare(b.region);
          break;
        case 'severity':
          const severityOrder = { 'Mild': 1, 'Moderate': 2, 'Severe': 3 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [allInjuriesRaw, sortField, sortDirection, filterTeam, filterSeverity, filterRegion]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild':
        return '#0D9488';
      case 'Moderate':
        return '#EA580C';
      case 'Severe':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Reported Injuries</h1>
        <p className="text-[#6B7280]">Complete injury history across all teams and players.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1A1A2E]">Filter by:</span>

          {/* Team Filter */}
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="px-4 py-2 bg-[#F5F6FA] border border-transparent rounded-xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A56DB] transition-all"
          >
            <option value="all">All Teams</option>
            {uniqueTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 bg-[#F5F6FA] border border-transparent rounded-xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A56DB] transition-all"
          >
            <option value="all">All Severities</option>
            <option value="Mild">Mild</option>
            <option value="Moderate">Moderate</option>
            <option value="Severe">Severe</option>
          </select>

          {/* Region Filter */}
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-4 py-2 bg-[#F5F6FA] border border-transparent rounded-xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A56DB] transition-all"
          >
            <option value="all">All Regions</option>
            {uniqueRegions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {(filterTeam !== 'all' || filterSeverity !== 'all' || filterRegion !== 'all') && (
            <button
              onClick={() => {
                setFilterTeam('all');
                setFilterSeverity('all');
                setFilterRegion('all');
              }}
              className="px-4 py-2 bg-[#1A56DB] text-white rounded-xl text-sm font-medium hover:bg-[#0D47A1] transition-colors"
            >
              Clear Filters
            </button>
          )}

          {/* Results Count */}
          <span className="text-sm text-[#6B7280] ml-auto">
            Showing {allInjuries.length} {allInjuries.length === 1 ? 'injury' : 'injuries'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F6FA]">
              <tr>
                <th
                  className="text-left py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortField === 'date' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors"
                  onClick={() => handleSort('player')}
                >
                  <div className="flex items-center gap-2">
                    Player
                    {sortField === 'player' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors"
                  onClick={() => handleSort('team')}
                >
                  <div className="flex items-center gap-2">
                    Team
                    {sortField === 'team' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors"
                  onClick={() => handleSort('diagnosis')}
                >
                  <div className="flex items-center gap-2">
                    Diagnosis
                    {sortField === 'diagnosis' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors"
                  onClick={() => handleSort('region')}
                >
                  <div className="flex items-center gap-2">
                    Region
                    {sortField === 'region' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="text-center py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors"
                  onClick={() => handleSort('severity')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Severity
                    {sortField === 'severity' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {allInjuries.map((injury, index) => (
                <tr key={index} className="hover:bg-[#F5F6FA] transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {injury.date}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <Link
                        to={`/team/${injury.teamId}?player=${injury.playerId}`}
                        className="font-semibold text-[#1A56DB] hover:underline"
                      >
                        {injury.playerName}
                      </Link>
                      <div className="text-sm text-[#6B7280]">{injury.position}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      to={`/team/${injury.teamId}`}
                      className="text-sm text-[#1A56DB] hover:underline"
                    >
                      {injury.teamName}
                    </Link>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#1A1A2E] font-medium">{injury.diagnosis}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#6B7280]">{injury.region}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: getSeverityColor(injury.severity) }}
                    >
                      {injury.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
