import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import { getRiskColor } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import { useSearchData, searchPlayers, searchTeams } from '../hooks/useSearchData';
import logo from '../../assets/logo.png';

type SearchResult = {
  type: 'Team' | 'Player' | 'Region';
  name: string;
  path: string;
  subtitle?: string;
  risk?: number;
  isInjured?: boolean;
};

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', match: (p: string) => p === '/' },
  { to: '/my-players', label: 'My players', match: (p: string) => p === '/my-players', badge: true },
  { to: '/teams', label: 'Teams', match: (p: string) => p === '/teams' || p.startsWith('/team/') },
  { to: '/reported-injuries', label: 'Reported Injuries', match: (p: string) => p === '/reported-injuries' },
  { to: '/statistics', label: 'Statistics', match: (p: string) => p === '/statistics' },
];

export function Navigation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { favoriteCount } = useFavorites();
  const { data: searchData, load: loadSearch } = useSearchData();

  useEffect(() => {
    if (searchParams.get('search') === 'open') {
      searchInputRef.current?.focus();
      setShowDropdown(true);
      searchParams.delete('search');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    if (!query) {
      // Default suggestions: top teams + top players by risk
      [...searchData.teams]
        .sort((a, b) => b.avgRisk - a.avgRisk)
        .slice(0, 2)
        .forEach(team => {
          results.push({
            type: 'Team',
            name: team.name,
            path: `/team/${team.id}`,
            subtitle: `${team.squadSize} players · Avg risk ${team.avgRisk}%`,
            risk: team.avgRisk,
          });
        });

      [...searchData.players]
        .sort((a, b) => b.injuryRisk - a.injuryRisk)
        .slice(0, 3)
        .forEach(p => {
          results.push({
            type: 'Player',
            name: `${p.firstName} ${p.lastName}`,
            path: `/team/${p.teamId}?player=${p.id}`,
            subtitle: p.teamName,
            risk: p.injuryRisk,
            isInjured: p.isInjured,
          });
        });

      return results.slice(0, 5);
    }

    // Teams — O(log n) BST prefix search with contains fallback
    const teamMatches = searchData.index
      ? searchTeams(searchData.index, query, 3)
      : searchData.teams.filter(t => t.name.toLowerCase().includes(query));
    teamMatches.forEach(team => {
      results.push({
        type: 'Team',
        name: team.name,
        path: `/team/${team.id}`,
        subtitle: `${team.squadSize} players · Avg risk ${team.avgRisk}%`,
        risk: team.avgRisk,
      });
    });

    // Players — O(log n) BST prefix search with contains fallback
    const playerMatches = searchData.index
      ? searchPlayers(searchData.index, query, 8)
      : searchData.players.filter(p =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
          p.lastName.toLowerCase().includes(query),
        );
    [...playerMatches]
      .sort((a, b) => b.injuryRisk - a.injuryRisk)
      .forEach(p => {
        results.push({
          type: 'Player',
          name: `${p.firstName} ${p.lastName}`,
          path: `/team/${p.teamId}?player=${p.id}`,
          subtitle: p.teamName,
          risk: p.injuryRisk,
          isInjured: p.isInjured,
        });
      });

    // Injury regions matching query
    searchData.regions
      .filter(r => r.toLowerCase().includes(query))
      .forEach(region => {
        results.push({
          type: 'Region',
          name: region,
          path: `/reported-injuries?region=${encodeURIComponent(region)}&ongoing=true`,
          subtitle: 'Reported Injuries · Ongoing',
        });
      });

    return results.slice(0, 10);
  }, [searchQuery, searchData]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const BADGE_COLORS: Record<SearchResult['type'], string> = {
    Team:   'bg-blue-50 text-[#1A56DB]',
    Player: 'bg-[#F5F6FA] text-[#6B7280]',
    Region: 'bg-purple-50 text-purple-700',
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.08)] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="hover:opacity-80 transition-opacity -ml-2">
            <img src={logo} alt="2to3Weeks" className="h-8 w-auto" />
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-6 mr-8">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  link.match(location.pathname) ? 'text-[#1A56DB]' : 'text-[#6B7280] hover:text-[#1A56DB]'
                }`}
              >
                {link.label}
                {link.badge && favoriteCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs bg-[#1A56DB] text-white rounded-full" style={{ fontFamily: 'var(--font-mono)' }}>
                    {favoriteCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative mx-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search players, teams, injury regions..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => { setShowDropdown(true); loadSearch(); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#F5F6FA] border border-transparent rounded-full text-[#1A1A2E] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:bg-white transition-all"
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>

            {/* Search Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg border border-[rgba(0,0,0,0.06)] overflow-hidden">
                {!searchQuery.trim() && (
                  <div className="px-4 py-2 bg-[#F5F6FA] border-b border-[rgba(0,0,0,0.06)]">
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Recommended</span>
                  </div>
                )}
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result.path)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F5F6FA] transition-colors text-left border-b border-[rgba(0,0,0,0.04)] last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[#1A1A2E] font-medium truncate">{result.name}</div>
                      {result.subtitle && <div className="text-sm text-[#6B7280] truncate">{result.subtitle}</div>}
                    </div>

                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {/* Risk / injured badge for players and teams */}
                      {result.type === 'Player' && (
                        result.isInjured ? (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                            INJ
                          </span>
                        ) : result.risk !== undefined ? (
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-full text-white"
                            style={{ fontFamily: 'var(--font-mono)', backgroundColor: getRiskColor(result.risk) }}
                          >
                            {result.risk}%
                          </span>
                        ) : null
                      )}

                      {/* Type badge */}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${BADGE_COLORS[result.type]}`}>
                        {result.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Icon - Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/login" className="text-[#1A1A2E] hover:text-[#1A56DB] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>

          {/* Hamburger - Mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 text-[#1A1A2E] hover:text-[#1A56DB] transition-colors"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-[rgba(0,0,0,0.06)] py-4">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`text-base font-medium transition-colors px-4 py-2 flex items-center justify-between ${
                    link.match(location.pathname)
                      ? 'text-[#1A56DB] bg-[#F5F6FA]'
                      : 'text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA]'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && favoriteCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 text-xs bg-[#1A56DB] text-white rounded-full" style={{ fontFamily: 'var(--font-mono)' }}>
                      {favoriteCount}
                    </span>
                  )}
                </Link>
              ))}
              <div className="border-t border-[rgba(0,0,0,0.06)] mt-2 pt-4">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-medium text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA] transition-colors px-4 py-2 flex items-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Login / Profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
