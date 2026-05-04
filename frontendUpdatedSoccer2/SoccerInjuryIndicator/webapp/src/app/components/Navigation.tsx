import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import { matches, teams } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';

export function Navigation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { favoriteCount } = useFavorites();

  // Auto-focus search when navigating with ?search=open
  useEffect(() => {
    if (searchParams.get('search') === 'open') {
      searchInputRef.current?.focus();
      setShowDropdown(true);
      // Remove the search parameter
      searchParams.delete('search');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const results: Array<{ type: 'Match' | 'Team' | 'Player'; name: string; path: string; subtitle?: string; risk?: number }> = [];

    // If no query, show recommendations
    if (!query) {
      // Show upcoming matches
      const upcomingMatches = matches.filter(m => m.status === 'upcoming').slice(0, 2);
      upcomingMatches.forEach(match => {
        const homeTeam = teams.find(t => t.id === match.homeTeamId);
        const awayTeam = teams.find(t => t.id === match.awayTeamId);
        if (homeTeam && awayTeam) {
          results.push({
            type: 'Match',
            name: `${homeTeam.name} vs ${awayTeam.name}`,
            path: `/match/${match.id}`,
            subtitle: `${match.date} · ${match.time}`
          });
        }
      });

      // Show high-risk players
      const allPlayers = teams.flatMap(team =>
        team.players.map(p => ({ ...p, teamName: team.name, teamId: team.id }))
      );
      const highRiskPlayers = allPlayers
        .sort((a, b) => b.injuryRisk - a.injuryRisk)
        .slice(0, 3);

      highRiskPlayers.forEach(player => {
        results.push({
          type: 'Player',
          name: `${player.firstName} ${player.lastName}`,
          path: `/team/${player.teamId}?player=${player.id}`,
          subtitle: `${player.teamName} · ${player.position}`,
          risk: player.injuryRisk
        });
      });

      return results.slice(0, 5);
    }

    // Search matches
    matches.forEach(match => {
      const homeTeam = teams.find(t => t.id === match.homeTeamId);
      const awayTeam = teams.find(t => t.id === match.awayTeamId);

      if (homeTeam && awayTeam) {
        const matchName = `${homeTeam.name} vs ${awayTeam.name}`.toLowerCase();
        if (matchName.includes(query) || homeTeam.name.toLowerCase().includes(query) || awayTeam.name.toLowerCase().includes(query)) {
          results.push({
            type: 'Match',
            name: `${homeTeam.name} vs ${awayTeam.name}`,
            path: `/match/${match.id}`,
            subtitle: `${match.date} · ${match.time}`
          });
        }
      }
    });

    // Search teams
    teams.forEach(team => {
      if (team.name.toLowerCase().includes(query)) {
        results.push({
          type: 'Team',
          name: team.name,
          path: `/team/${team.id}`,
          subtitle: `${team.squadSize} players · Avg risk ${team.avgRisk}%`
        });
      }
    });

    // Search players
    const allPlayers = teams.flatMap(team =>
      team.players.map(p => ({ ...p, teamName: team.name, teamId: team.id }))
    );

    allPlayers.forEach(player => {
      const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
      if (fullName.includes(query) || player.lastName.toLowerCase().includes(query)) {
        results.push({
          type: 'Player',
          name: `${player.firstName} ${player.lastName}`,
          path: `/team/${player.teamId}?player=${player.id}`,
          subtitle: `${player.teamName} · ${player.position}`,
          risk: player.injuryRisk
        });
      }
    });

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
          <Link
            to="/"
            className="text-2xl font-bold text-[#1A56DB] hover:opacity-80 transition-opacity -ml-2"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            SI2
          </Link>

          {/* Navigation Links - Desktop Only */}
          <div className="hidden lg:flex items-center gap-6 mr-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'text-[#1A56DB]'
                  : 'text-[#6B7280] hover:text-[#1A56DB]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/my-players"
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                location.pathname === '/my-players'
                  ? 'text-[#1A56DB]'
                  : 'text-[#6B7280] hover:text-[#1A56DB]'
              }`}
            >
              My players
              {favoriteCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs bg-[#1A56DB] text-white rounded-full" style={{ fontFamily: 'var(--font-mono)' }}>
                  {favoriteCount}
                </span>
              )}
            </Link>
            <Link
              to="/teams"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/teams' || location.pathname.startsWith('/team/')
                  ? 'text-[#1A56DB]'
                  : 'text-[#6B7280] hover:text-[#1A56DB]'
              }`}
            >
              Teams
            </Link>
            <Link
              to="/reported-injuries"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/reported-injuries'
                  ? 'text-[#1A56DB]'
                  : 'text-[#6B7280] hover:text-[#1A56DB]'
              }`}
            >
              Reported Injuries
            </Link>
            <Link
              to="/statistics"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/statistics'
                  ? 'text-[#1A56DB]'
                  : 'text-[#6B7280] hover:text-[#1A56DB]'
              }`}
            >
              Statistics
            </Link>
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
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
                      {result.subtitle && (
                        <div className="text-sm text-[#6B7280] truncate">{result.subtitle}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {result.type === 'Player' && result.risk !== undefined && (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full text-white"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: result.risk > 50 ? '#DC2626' : result.risk > 35 ? '#EA580C' : '#0D9488'
                          }}
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

          {/* User Menu - Desktop Only */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/login" className="text-[#1A1A2E] hover:text-[#1A56DB] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>

          {/* Hamburger Menu - Mobile Only */}
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
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors px-4 py-2 ${
                  location.pathname === '/'
                    ? 'text-[#1A56DB] bg-[#F5F6FA]'
                    : 'text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA]'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/my-players"
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors px-4 py-2 flex items-center justify-between ${
                  location.pathname === '/my-players'
                    ? 'text-[#1A56DB] bg-[#F5F6FA]'
                    : 'text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA]'
                }`}
              >
                <span>My players</span>
                {favoriteCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs bg-[#1A56DB] text-white rounded-full" style={{ fontFamily: 'var(--font-mono)' }}>
                    {favoriteCount}
                  </span>
                )}
              </Link>
              <Link
                to="/teams"
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors px-4 py-2 ${
                  location.pathname === '/teams' || location.pathname.startsWith('/team/')
                    ? 'text-[#1A56DB] bg-[#F5F6FA]'
                    : 'text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA]'
                }`}
              >
                Teams
              </Link>
              <Link
                to="/reported-injuries"
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors px-4 py-2 ${
                  location.pathname === '/reported-injuries'
                    ? 'text-[#1A56DB] bg-[#F5F6FA]'
                    : 'text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA]'
                }`}
              >
                Reported Injuries
              </Link>
              <Link
                to="/statistics"
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors px-4 py-2 ${
                  location.pathname === '/statistics'
                    ? 'text-[#1A56DB] bg-[#F5F6FA]'
                    : 'text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA]'
                }`}
              >
                Statistics
              </Link>

              {/* Login in Mobile Menu */}
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
