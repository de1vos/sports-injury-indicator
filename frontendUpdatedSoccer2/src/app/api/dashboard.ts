import { apiFetch } from './client';
import type { ApiDashboardMatch, ApiHighRiskPlayer, ApiTrendingRiskPlayer } from './types';

// ── Internal types returned to pages ────────────────────────────────────────

export interface DashboardMatch {
  id: string;
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
  homeTeamName: m.home_team_name,
  awayTeamName: m.away_team_name,
  homeTeamLogo: m.home_team_logo,
  awayTeamLogo: m.away_team_logo,
  homeGoals: m.home_team_goals,
  awayGoals: m.away_team_goals,
  homeAvgRisk: Math.round(m.home_average_injury_risk * 100),
  awayAvgRisk: Math.round(m.away_average_injury_risk * 100),
  time: m.match_time.slice(0, 5),
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
  injuryRisk: Math.round(p.player_injury_risk * 100),
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

// ── Compute current gameweek (GW1 ≈ Aug 16 2025, 1 GW = 7 days) ─────────────

function currentGameweek(): string {
  const seasonStart = new Date('2025-08-16').getTime();
  const gw = Math.max(1, Math.min(38, Math.ceil((Date.now() - seasonStart) / (7 * 86_400_000))));
  return `gw${gw}`;
}

// ── API functions ────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** All matches for a gameweek. Defaults to computed current GW. */
  getMatches: async (gameweek?: string): Promise<DashboardMatch[]> => {
    const gw = gameweek ?? currentGameweek();
    const data = await apiFetch<ApiDashboardMatch[]>(`/dashboard/matches/${gw}`);
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
    const url = userId
      ? `/dashboard/trending-risk-players?user_id=${userId}`
      : '/dashboard/trending-risk-players';
    const data = await apiFetch<ApiTrendingRiskPlayer[]>(url);
    return data.map(mapTrending);
  },
};
