import { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useReportedInjuries } from '../hooks/useApi';

type SortField = 'endDate' | 'startDate' | 'lastName' | 'team' | 'severity';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 50;

const SEVERITY_ORDER: Record<string, number> = {
  'Long-term': 4,
  'Severe':    3,
  'Moderate':  2,
  'Minor':     1,
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  'Long-term': { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
  'Severe':    { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
  'Moderate':  { bg: '#FFEDD5', text: '#EA580C', dot: '#EA580C' },
  'Minor':     { bg: '#FEF9C3', text: '#CA8A04', dot: '#CA8A04' },
};

function severityStyle(sev: string) {
  return SEVERITY_STYLE[sev] ?? { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' };
}

function PlayerAvatar({ name, severity, photo }: { name: string; severity: string; photo?: string }) {
  const { dot } = severityStyle(severity);
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  const initials = name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ backgroundColor: dot }}
    >
      {initials}
    </div>
  );
}

export function ReportedInjuriesPage() {
  const { data: injuriesData, loading, error } = useReportedInjuries();

  const [searchParams] = useSearchParams();
  const [sortField, setSortField]         = useState<SortField>('endDate');
  const [sortDir, setSortDir]             = useState<SortDirection>('desc');
  const [filterTeam, setFilterTeam]       = useState('all');
  const [filterRegion, setFilterRegion]   = useState(() => searchParams.get('region') ?? 'all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterDiagnosis, setFilterDiagnosis] = useState('all');
  const [filterOngoing, setFilterOngoing] = useState(() => searchParams.get('ongoing') === 'true');
  const [page, setPage]                   = useState(1);

  const allRaw = injuriesData ?? [];

  // Build unique option lists — memoised so they only recompute when data changes
  const uniqueTeams = useMemo(
    () => [...new Set(allRaw.map(i => i.teamName))].sort(),
    [allRaw],
  );
  const uniqueRegions = useMemo(
    () => [...new Set(allRaw.map(i => i.region).filter(Boolean))].sort(),
    [allRaw],
  );
  const uniqueSeverities = useMemo(
    () => [...new Set(allRaw.map(i => i.severity))].sort(
      (a, b) => (SEVERITY_ORDER[b] ?? 0) - (SEVERITY_ORDER[a] ?? 0),
    ),
    [allRaw],
  );
  const uniquePositions = useMemo(
    () => [...new Set(allRaw.map(i => i.position).filter(Boolean))].sort(),
    [allRaw],
  );
  const uniqueDiagnoses = useMemo(
    () => [...new Set(allRaw.map(i => i.diagnosis).filter(Boolean))].sort(),
    [allRaw],
  );

  const filtered = useMemo(() => {
    let data = allRaw;
    if (filterTeam      !== 'all') data = data.filter(i => i.teamName  === filterTeam);
    if (filterRegion    !== 'all') data = data.filter(i => i.region    === filterRegion);
    if (filterSeverity  !== 'all') data = data.filter(i => i.severity  === filterSeverity);
    if (filterPosition  !== 'all') data = data.filter(i => i.position  === filterPosition);
    if (filterDiagnosis !== 'all') data = data.filter(i => i.diagnosis === filterDiagnosis);
    if (filterOngoing)             data = data.filter(i => i.endDate   === null);

    return [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'endDate': {
          const aE = a.endDate ?? '9999-99-99';
          const bE = b.endDate ?? '9999-99-99';
          cmp = aE.localeCompare(bE);
          break;
        }
        case 'startDate': cmp = a.startDate.localeCompare(b.startDate); break;
        case 'lastName':  cmp = a.lastName.localeCompare(b.lastName);   break;
        case 'team':      cmp = a.teamName.localeCompare(b.teamName);   break;
        case 'severity':  cmp = (SEVERITY_ORDER[a.severity] ?? 0) - (SEVERITY_ORDER[b.severity] ?? 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allRaw, filterTeam, filterRegion, filterSeverity, filterPosition, filterDiagnosis, filterOngoing, sortField, sortDir]);

  // Pagination — reset to page 1 whenever filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const resetPage = useCallback(() => setPage(1), []);

  const clearFilters = () => {
    setFilterTeam('all'); setFilterRegion('all'); setFilterSeverity('all');
    setFilterPosition('all'); setFilterDiagnosis('all'); setFilterOngoing(false);
    setPage(1);
  };
  const hasFilter =
    filterTeam !== 'all' || filterRegion !== 'all' || filterSeverity !== 'all' ||
    filterPosition !== 'all' || filterDiagnosis !== 'all' || filterOngoing;

  const SortChip = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        sortField === field
          ? 'bg-[#1A56DB] text-white'
          : 'bg-[#F5F6FA] text-[#6B7280] hover:bg-[#E5E7EB]'
      }`}
    >
      {label}
      {sortField === field && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sortDir === 'asc'
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />}
        </svg>
      )}
    </button>
  );

  const selectClass = "px-3 py-1.5 bg-[#F5F6FA] border border-transparent rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A56DB]";

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-1">Reported Injuries</h1>
        <p className="text-[#6B7280]">Complete injury history across all Premier League squads.</p>
      </div>

      {/* Filters + Sort */}
      <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] p-5 mb-6 space-y-4">
        {/* Filter row 1: Team, Region, Severity, Ongoing */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Filter</span>

          <select value={filterTeam} onChange={e => { setFilterTeam(e.target.value); resetPage(); }} className={selectClass}>
            <option value="all">All Teams</option>
            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={filterRegion} onChange={e => { setFilterRegion(e.target.value); resetPage(); }} className={selectClass}>
            <option value="all">All Regions</option>
            {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); resetPage(); }} className={selectClass}>
            <option value="all">All Severities</option>
            {uniqueSeverities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterPosition} onChange={e => { setFilterPosition(e.target.value); resetPage(); }} className={selectClass}>
            <option value="all">All Positions</option>
            {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filterDiagnosis} onChange={e => { setFilterDiagnosis(e.target.value); resetPage(); }} className={selectClass}>
            <option value="all">All Diagnoses</option>
            {uniqueDiagnoses.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <button
            onClick={() => { setFilterOngoing(p => !p); resetPage(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filterOngoing ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-[#F5F6FA] text-[#6B7280] border-transparent hover:bg-[#E5E7EB]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterOngoing ? 'bg-white' : 'bg-[#0D9488]'}`} />
            Ongoing only
          </button>

          {hasFilter && (
            <button onClick={clearFilters} className="px-3 py-1.5 text-sm font-medium text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors">
              Clear
            </button>
          )}

          <span className="ml-auto text-sm text-[#9CA3AF]">
            {filtered.length} {filtered.length === 1 ? 'injury' : 'injuries'}
          </span>
        </div>

        {/* Sort row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Sort</span>
          <SortChip field="endDate"   label="End Date" />
          <SortChip field="startDate" label="Start Date" />
          <SortChip field="severity"  label="Severity" />
          <SortChip field="team"      label="Team" />
          <SortChip field="lastName"  label="Player" />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-[#D1FAE5] flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">All clear!</h3>
          <p className="text-[#6B7280] max-w-xs">
            {hasFilter ? 'No injuries match the current filters.' : 'No injury records found.'}
          </p>
          {hasFilter && (
            <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-[#1A56DB] text-white rounded-xl text-sm font-semibold hover:bg-[#0D47A1] transition-colors">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Injury rows — only current page */}
          <div className="space-y-2">
            {pageData.map((injury, idx) => {
              const sty = severityStyle(injury.severity);
              const isOngoing = injury.endDate === null;
              const href = `/team/${injury.teamId}?player=${injury.playerId}`;

              return (
                <Link
                  key={`${injury.playerId}-${injury.startDate}-${idx}`}
                  to={href}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] px-5 py-4 hover:shadow-sm hover:border-[rgba(26,86,219,0.2)] transition-all"
                >
                  {/* Avatar */}
                  <PlayerAvatar name={`${injury.firstName} ${injury.lastName}`} severity={injury.severity} photo={injury.photo} />

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1A1A2E]">{injury.firstName} {injury.lastName}</span>
                      <span className="text-xs text-[#9CA3AF]">· {injury.position}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <img
                        src={`https://media.api-sports.io/football/teams/${injury.teamId}.png`}
                        alt={injury.teamName}
                        className="w-4 h-4 object-contain flex-shrink-0"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-xs text-[#1A56DB] font-medium">{injury.teamName}</span>
                      <span className="text-xs text-[#9CA3AF]">·</span>
                      <span className="text-xs text-[#6B7280]">{injury.diagnosis}</span>
                      {injury.region && (
                        <>
                          <span className="text-xs text-[#9CA3AF]">·</span>
                          <span className="text-xs text-[#9CA3AF]">{injury.region}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {injury.startDate}
                    </div>
                    <div className="text-xs mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: isOngoing ? '#0D9488' : '#6B7280' }}>
                      {isOngoing ? 'Ongoing' : injury.endDate}
                    </div>
                  </div>

                  {/* Days out */}
                  {injury.daysOut > 0 && (
                    <div className="text-right flex-shrink-0 w-14 hidden md:block">
                      <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {injury.daysOut}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">days out</div>
                    </div>
                  )}

                  {/* Severity badge */}
                  <div className="flex-shrink-0">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: sty.bg, color: sty.text }}
                    >
                      {isOngoing && <span className="mr-1">●</span>}
                      {injury.severity}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <span className="text-sm text-[#9CA3AF]">
                Page {page} of {totalPages} · showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#F5F6FA] text-[#6B7280] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                        p === page ? 'bg-[#1A56DB] text-white' : 'text-[#6B7280] hover:bg-[#F5F6FA]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#F5F6FA] text-[#6B7280] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
