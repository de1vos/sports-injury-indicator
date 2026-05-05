import React from 'react';
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
