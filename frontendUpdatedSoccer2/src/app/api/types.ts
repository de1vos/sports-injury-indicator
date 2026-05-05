/**
 * Raw backend response shapes — match exactly what the API returns.
 * All risk/percentage values are integers 0–100 (no conversion needed).
 */

export interface ApiTeamOverview {
  team_id: number;
  team_name: string;
  team_logo: string;
  amount_of_players: number;
  average_risk_of_injury: number;   // 0–100 integer
  active_injuries: number;
  percent_of_squad_injured: number; // 0–100 integer
}

export interface ApiTeamPlayer {
  player_id: number;
  player_first_name: string;
  player_last_name: string;
  player_injury_risk: number | 'injured'; // integer 0–100, or "injured" string
  player_relative_risk?: number | null;
}

export interface ApiPlayerCard {
  player_id?: number;
  player_first_name: string;
  player_last_name: string;
  player_age: number;
  player_weight: string;
  player_height: string;
  player_photo: string;
  player_position: string;
  player_kit_number: number;
  nation_name: string;
  player_injury_risk: number;       // 0–100 integer
  player_relative_risk?: number | null;
  player_injury_status: string;     // 'available' | 'injured' | etc.
  player_injury_trend: number;
  player_season_injuries: number;
  player_season_minutes: number;
  player_season_missed_games: number;
}

/** Dynamic keys: gw_1 … gw_38 (integer 0–100 or "injured" string), plus metadata */
export type ApiPlayerGraph = Record<string, number | string | null>;

export interface ApiPlayerSeason {
  player_season_year: number;
  player_season_appearances: number;
  player_season_minutes: number;
  player_season_fouls_drawn: number;
  player_season_fouls_commited: number; // note: intentional spelling from backend
  player_season_duels_total: number;
  player_season_tackles: number;
  player_season_yellow_cards: number;
  player_season_red_cards: number;
  player_season_goals: number;
  player_season_assists: number;
  player_season_dribbles_attempts: number;
  player_season_rating: number;
}

export interface ApiInjuryRecord {
  player_injury_type: string;
  player_injury_region: string;
  player_injury_start: string;        // YYYY-MM-DD
  player_injury_end: string | null;   // null = ongoing
  player_injury_severity: string;
  player_injury_days_out: number | null;
}

export interface ApiInjuryAnalysis {
  player_total_injuries: number;
  player_season_injuries: number;
  player_total_games_missed: number;
  player_days_since_injury: number;
  player_average_games_played: number;
}

export interface ApiDashboardMatch {
  // No match_id / home_team_id / away_team_id — backend doesn't return these
  home_team_name: string;
  away_team_name: string;
  home_team_logo: string;
  away_team_logo: string;
  home_team_goals: number | null;
  away_team_goals: number | null;
  home_average_injury_risk: number | null; // 0–100 integer, null when played
  away_average_injury_risk: number | null; // 0–100 integer, null when played
  match_time: string | null;  // "17:30:00"
  match_date: string;         // "2026-04-25"
  match_is_played: boolean;
}

export interface ApiHighRiskPlayer {
  player_id?: number;
  player_first_name: string;
  player_last_name: string;
  player_photo: string;
  team_id?: number;
  team_name: string;
  player_position: string;
  player_injury_risk: number; // 0–100 integer
  player_relative_risk?: number | null;
  player_seasonal_injuries: number;
}

export interface ApiTrendingRiskPlayer {
  player_id?: number;
  player_first_name: string;
  player_last_name: string;
  player_photo: string;
  team_id?: number;
  team_name: string;
  player_position: string;
  player_injury_trend: number;
  player_seasonal_injuries: number;
}

export interface ApiMyPlayer {
  player_id?: number;
  player_first_name: string;
  player_last_name: string;
  player_photo: string;
  team_id?: number;
  team_name: string;
  player_position: string;
  player_injury_trend: number;
  player_seasonal_injuries: number;
}

export interface ApiReportedInjury {
  player_id: number;
  team_id: number;
  player_photo: string;
  injury_date_start: string;
  injury_date_end: string | null;  // null = ongoing
  player_first_name: string;
  player_last_name: string;
  team_name: string;
  player_injury_diagnosis: string;
  player_injury_region: string;
  player_injury_severity: string;
  player_position: string;
  player_injury_days_out: number;
}
