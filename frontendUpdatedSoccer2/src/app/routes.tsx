import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { Navigation } from './components/Navigation';
import { FavoritesContext, useFavoritesState } from './hooks/useFavorites';
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

function RootLayout() {
  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#F5F6FA]">
        <Navigation />
        <main className="pt-16">
          <Outlet />
        </main>
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
      { path: 'my-players', Component: MyPlayersPage },
      { path: 'teams', Component: TeamsPage },
      { path: 'team/:teamId', Component: TeamPage },
      { path: 'reported-injuries', Component: ReportedInjuriesPage },
      { path: 'statistics', Component: StatisticsPage },
    ],
  },
]);
