import { useState, useMemo } from 'react';
import { useReportedInjuries } from '../hooks/useApi';

type SortField = 'startDate' | 'endDate' | 'lastName' | 'firstName' | 'team' | 'diagnosis' | 'region' | 'severity';
type SortDirection = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = {
  'Long-term': 3,
  'Moderate': 2,
  'Minor': 1,
};

export function ReportedInjuriesPage() {
  const { data: injuriesData, loading, error } = useReportedInjuries();
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  const allInjuriesRaw = injuriesData ?? [];

  const uniqueTeams = useMemo(() =>
    [...new Set(allInjuriesRaw.map(i => i.teamName))].sort(),
  [allInjuriesRaw]);

  const uniqueRegions = useMemo(() =>
    [...new Set(allInjuriesRaw.map(i => i.region))].sort(),
  [allInjuriesRaw]);

  const allInjuries = useMemo(() => {
    let filtered = allInjuriesRaw;
    if (filterTeam !== 'all') filtered = filtered.filter(i => i.teamName === filterTeam);
    if (filterRegion !== 'all') filtered = filtered.filter(i => i.region === filterRegion);

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'startDate':  comparison = a.startDate.localeCompare(b.startDate); break;
        case 'endDate': {
          // null (ongoing) sorts after all real dates
          const aEnd = a.endDate ?? '9999-99-99';
          const bEnd = b.endDate ?? '9999-99-99';
          comparison = aEnd.localeCompare(bEnd);
          break;
        }
        case 'lastName':   comparison = a.lastName.localeCompare(b.lastName); break;
        case 'firstName':  comparison = a.firstName.localeCompare(b.firstName); break;
        case 'team':       comparison = a.teamName.localeCompare(b.teamName); break;
        case 'diagnosis':  comparison = a.diagnosis.localeCompare(b.diagnosis); break;
        case 'region':     comparison = a.region.localeCompare(b.region); break;
        case 'severity': {
          const aVal = SEVERITY_ORDER[a.severity ?? ''] ?? 0;
          const bVal = SEVERITY_ORDER[b.severity ?? ''] ?? 0;
          comparison = aVal - bVal;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allInjuriesRaw, sortField, sortDirection, filterTeam, filterRegion]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? null : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );

  const selectClass = "px-4 py-2 bg-[#F5F6FA] border border-transparent rounded-xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A56DB] transition-all";
  const thClass = "text-left py-4 px-6 text-sm font-semibold text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB] transition-colors";

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 text-[#1A56DB] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#6B7280] text-sm">Loading injuries…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-semibold mb-2">Failed to load injuries</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

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

          <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className={selectClass}>
            <option value="all">All Teams</option>
            {uniqueTeams.map(team => <option key={team} value={team}>{team}</option>)}
          </select>

          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className={selectClass}>
            <option value="all">All Regions</option>
            {uniqueRegions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>

          {(filterTeam !== 'all' || filterRegion !== 'all') && (
            <button
              onClick={() => { setFilterTeam('all'); setFilterRegion('all'); }}
              className="px-4 py-2 bg-[#1A56DB] text-white rounded-xl text-sm font-medium hover:bg-[#0D47A1] transition-colors"
            >
              Clear Filters
            </button>
          )}

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
                <th className={thClass} onClick={() => handleSort('startDate')}>
                  <div className="flex items-center gap-2">Start Date<SortIcon field="startDate" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('endDate')}>
                  <div className="flex items-center gap-2">End Date<SortIcon field="endDate" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('lastName')}>
                  <div className="flex items-center gap-2">Last Name<SortIcon field="lastName" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('firstName')}>
                  <div className="flex items-center gap-2">First Name<SortIcon field="firstName" /></div>
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#6B7280]">Position</th>
                <th className={thClass} onClick={() => handleSort('team')}>
                  <div className="flex items-center gap-2">Team<SortIcon field="team" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('diagnosis')}>
                  <div className="flex items-center gap-2">Diagnosis<SortIcon field="diagnosis" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('region')}>
                  <div className="flex items-center gap-2">Region<SortIcon field="region" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('severity')}>
                  <div className="flex items-center gap-2">Severity<SortIcon field="severity" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {allInjuries.map((injury, index) => {
                const SEVERITY_STYLES: Record<string, string> = {
                  'Severe':    'bg-red-100 text-red-700',
                  'Long-term': 'bg-red-100 text-red-700',
                  'Moderate':  'bg-orange-100 text-orange-700',
                  'Minor':     'bg-yellow-100 text-yellow-700',
                };
                const severityStyle = SEVERITY_STYLES[injury.severity]
                  ?? 'bg-[#F5F6FA] text-[#6B7280]';
                const severityEl = (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${severityStyle}`}>
                    {injury.severity}
                  </span>
                );

                return (
                  <tr key={index} className="hover:bg-[#F5F6FA] transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {injury.startDate}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {injury.endDate ? (
                        <span className="text-sm text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {injury.endDate}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#0D9488]">Ongoing</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-[#1A1A2E]">{injury.lastName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#1A1A2E]">{injury.firstName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#6B7280]">{injury.position}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#1A1A2E]">{injury.teamName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#1A1A2E] font-medium">{injury.diagnosis}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#6B7280]">{injury.region}</span>
                    </td>
                    <td className="py-4 px-6">
                      {severityEl}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
