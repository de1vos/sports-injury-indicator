import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { MatchPage } from "./pages/MatchPage";
import { MyPlayersPage } from "./pages/MyPlayersPage";
import { TeamsPage } from "./pages/TeamsPage";
import { TeamPage } from "./pages/TeamPage";
import { ReportedInjuriesPage } from "./pages/ReportedInjuriesPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { LoginPage } from "./pages/LoginPage";
import { RootLayout } from "./layouts/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: HomePage
      },
      {
        path: "match/:matchId",
        Component: MatchPage
      },
      {
        path: "my-players",
        Component: MyPlayersPage
      },
      {
        path: "teams",
        Component: TeamsPage
      },
      {
        path: "team/:teamId",
        Component: TeamPage
      },
      {
        path: "reported-injuries",
        Component: ReportedInjuriesPage
      },
      {
        path: "statistics",
        Component: StatisticsPage
      },
    ],
  },
]);
