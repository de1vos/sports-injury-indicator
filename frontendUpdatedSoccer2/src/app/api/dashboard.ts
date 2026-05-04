import { apiFetch } from './client';
import { mockTrendingPlayers } from '../data/mockData';

// ── Internal types returned to pages ────────────────────────────────────────

export interface DashboardMatch {
  id: string;
  homeTeamId: string | null;  // not returned by backend
  awayTeamId: string | null;  // not returned by backend
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeAvgRisk: number; // 0–100
  awayAvgRisk: number; // 0–100
  time: string;        // "17:30"
  date: string;        // "2026-04-25"
  isPlayed: boolean;
}

export interface DashboardHighRiskPlayer {
  id?: string;
  teamId?: string;
  firstName: string;
  lastName: string;
  photo: string;
  teamName: string;
  position: string;
  injuryRisk: number; // 0–100
  seasonalInjuries: number;
}

export interface DashboardTrendingPlayer {
  id?: string;
  teamId?: string;
  firstName: string;
  lastName: string;
  photo: string;
  teamName: string;
  position: string;
  injuryTrend: number;
  seasonalInjuries: number;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const mapMatch = (m: ApiDashboardMatch, idx: number): DashboardMatch => ({
  id: `match-${idx}`,
  homeTeamId: null,
  awayTeamId: null,
  homeTeamName: m.home_team_name,
  awayTeamName: m.away_team_name,
  homeTeamLogo: m.home_team_logo,
  awayTeamLogo: m.away_team_logo,
  homeGoals: m.home_team_goals,
  awayGoals: m.away_team_goals,
  homeAvgRisk: Math.round(m.home_average_injury_risk ?? 0),
  awayAvgRisk: Math.round(m.away_average_injury_risk ?? 0),
  time: m.match_time ? m.match_time.slice(0, 5) : '',
  date: m.match_date,
  isPlayed: m.match_is_played,
});

const mapHighRisk = (p: ApiHighRiskPlayer): DashboardHighRiskPlayer => ({
  id: p.player_id != null ? String(p.player_id) : undefined,
  teamId: p.team_id != null ? String(p.team_id) : undefined,
  firstName: p.player_first_name,
  lastName: p.player_last_name,
  photo: p.player_photo,
  teamName: p.team_name,
  position: p.player_position,
  injuryRisk: Math.round(p.player_injury_risk),
  seasonalInjuries: p.player_seasonal_injuries,
});

const mapTrending = (p: ApiTrendingRiskPlayer): DashboardTrendingPlayer => ({
  id: p.player_id != null ? String(p.player_id) : undefined,
  teamId: p.team_id != null ? String(p.team_id) : undefined,
  firstName: p.player_first_name,
  lastName: p.player_last_name,
  photo: p.player_photo,
  teamName: p.team_name,
  position: p.player_position,
  injuryTrend: p.player_injury_trend,
  seasonalInjuries: p.player_seasonal_injuries,
});

// ── API functions ────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** Current gameweek matches — GW is determined server-side from the database. */
  getMatches: async (): Promise<DashboardMatch[]> => {
    const data = await apiFetch<ApiDashboardMatch[]>(`/dashboard/matches`);
    return data.map(mapMatch);
  },

  /**
   * Players ordered by injury risk.
   * Without userId → global; with userId → user's watchlist.
   */
  getHighRiskPlayers: async (userId?: string): Promise<DashboardHighRiskPlayer[]> => {
    const url = userId
      ? `/dashboard/high-risk-players?user_id=${userId}`
      : '/dashboard/high-risk-players';
    const data = await apiFetch<ApiHighRiskPlayer[]>(url);
    return data.map(mapHighRisk);
  },

  /**
   * Players ordered by injury trend (risk spikes).
   * Without userId → global; with userId → user's watchlist.
   */
  getTrendingPlayers: async (userId?: string): Promise<DashboardTrendingPlayer[]> => {
    // For testing, return mock data
    return mockTrendingPlayers;
    // const url = userId
    //   ? `/dashboard/trending-risk-players?user_id=${userId}`
    //   : '/dashboard/trending-risk-players';
    // const data = await apiFetch<ApiTrendingRiskPlayer[]>(url);
    // return data.map(mapTrending);
  },
};
