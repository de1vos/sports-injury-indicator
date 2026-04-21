import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import { matches, teams, getRiskColor, getAllPlayers } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import logo from '../../assets/logo.png';

type SearchResult = { type: 'Match' | 'Team' | 'Player'; name: string; path: string; subtitle?: string; risk?: number };

function toMatchResult(match: (typeof matches)[number], home: (typeof teams)[number], away: (typeof teams)[number]): SearchResult {
  return { type: 'Match', name: `${home.name} vs ${away.name}`, path: `/match/${match.id}`, subtitle: `${match.date} · ${match.time}` };
}

function toPlayerResult(player: ReturnType<typeof getAllPlayers>[number]): SearchResult {
  return { type: 'Player', name: `${player.firstName} ${player.lastName}`, path: `/team/${player.teamId}?player=${player.id}`, subtitle: `${player.teamName} · ${player.position}`, risk: player.injuryRisk };
}

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

  useEffect(() => {
    if (searchParams.get('search') === 'open') {
      searchInputRef.current?.focus();
      setShowDropdown(true);
      searchParams.delete('search');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    if (!query) {
      matches
        .filter(m => m.status === 'upcoming')
        .slice(0, 2)
        .forEach(match => {
          const home = teams.find(t => t.id === match.homeTeamId);
          const away = teams.find(t => t.id === match.awayTeamId);
          if (home && away) results.push(toMatchResult(match, home, away));
        });

      getAllPlayers()
        .sort((a, b) => b.injuryRisk - a.injuryRisk)
        .slice(0, 3)
        .forEach(player => results.push(toPlayerResult(player)));

      return results.slice(0, 5);
    }

    matches.forEach(match => {
      const home = teams.find(t => t.id === match.homeTeamId);
      const away = teams.find(t => t.id === match.awayTeamId);
      if (home && away) {
        const matchName = `${home.name} vs ${away.name}`.toLowerCase();
        if (matchName.includes(query) || home.name.toLowerCase().includes(query) || away.name.toLowerCase().includes(query)) {
          results.push(toMatchResult(match, home, away));
        }
      }
    });

    teams.forEach(team => {
      if (team.name.toLowerCase().includes(query)) {
        results.push({ type: 'Team', name: team.name, path: `/team/${team.id}`, subtitle: `${team.squadSize} players · Avg risk ${team.avgRisk}%` });
      }
    });

    getAllPlayers()
      .filter(player => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        return fullName.includes(query) || player.lastName.toLowerCase().includes(query);
      })
      .forEach(player => results.push(toPlayerResult(player)));

    return results.slice(0, 10);
  }, [searchQuery]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-[rgba(0,0,0,0.06)] z-50">
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
                placeholder="Search matches, teams, players..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
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
                    <div className="flex items-center gap-2 ml-3">
                      {result.type === 'Player' && result.risk !== undefined && (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full text-white"
                          style={{ fontFamily: 'var(--font-mono)', backgroundColor: getRiskColor(result.risk) }}
                        >
                          {result.risk}%
                        </span>
                      )}
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#F5F6FA] text-[#6B7280]">
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
