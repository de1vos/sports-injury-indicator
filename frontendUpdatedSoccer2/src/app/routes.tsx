import React, { useState, useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { Navigation } from './components/Navigation';
import { FavoritesContext, useFavoritesState } from './hooks/useFavorites';
import { useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { MatchPage } from './pages/MatchPage';
import { MyPlayersPage } from './pages/MyPlayersPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamPage } from './pages/TeamPage';
import { ReportedInjuriesPage } from './pages/ReportedInjuriesPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { LoginPage } from './pages/LoginPage';

function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const value = useFavoritesState();
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedMyPlayers() {
  return (
    <RequireAuth>
      <MyPlayersPage />
    </RequireAuth>
  );
}

function RootLayout() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('disclaimerAcknowledged')) {
      setShowDisclaimer(true);
    }
  }, []);

  function handleAccept() {
    sessionStorage.setItem('disclaimerAcknowledged', 'true');
    setShowDisclaimer(false);
  }

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#F5F6FA] flex flex-col">
        <Navigation />
        <main className="pt-16 flex-1">
          <Outlet />
        </main>
        <footer className="bg-yellow-50 border-t-2 border-yellow-400 px-6 py-4 text-center text-sm text-gray-700">
          <strong>Disclaimer:</strong> Predictive data is for decision-support only. Use of this tool constitutes an acknowledgement that predictive data does not constitute medical advice or a substitute for clinical judgment and that final judgment rests with the user.
        </footer>

        {showDisclaimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Disclaimer</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Predictive data is for decision-support only. Use of this tool constitutes an acknowledgement that predictive data does not constitute medical advice or a substitute for clinical judgment and that final judgment rests with the user.
              </p>
              <button
                onClick={handleAccept}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                I Acknowledge
              </button>
            </div>
          </div>
        )}
      </div>
    </FavoritesProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'match/:matchId', Component: MatchPage },
      { path: 'my-players', Component: ProtectedMyPlayers },
      { path: 'teams', Component: TeamsPage },
      { path: 'team/:teamId', Component: TeamPage },
      { path: 'reported-injuries', Component: ReportedInjuriesPage },
      { path: 'statistics', Component: StatisticsPage },
    ],
  },
]);
