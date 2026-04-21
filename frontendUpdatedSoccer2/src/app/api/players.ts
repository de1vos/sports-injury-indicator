import { apiFetch } from './client';
import type {
  Player,
  InjuryRecord,
  RiskTrendEntry,
  SeasonStat,
  InjurySummaryData,
} from '../data/mockData';

// ── Response types (matching backend shapes) ─────────────────────────────────

/** GET /players/team/{team_id} */
export type TeamPlayerListItem = Pick<
  Player,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'position'
  | 'kitNumber'
  | 'age'
  | 'nationality'
  | 'injuryRisk'
  | 'riskLevel'
  | 'photo'
>;

/** GET /players/{player_id}/card */
export type PlayerCard = Player;

/** GET /players/{player_id}/graph */
export interface PlayerGraph {
  trend: RiskTrendEntry[];
}

/** GET /players/{player_id}/seasons */
export interface PlayerSeasons {
  seasons: SeasonStat[];
}

/** GET /players/{player_id}/injury-history */
export interface PlayerInjuryHistory {
  injuries: InjuryRecord[];
}

/** GET /players/{player_id}/injury-analysis */
export interface PlayerInjuryAnalysis {
  summary: InjurySummaryData;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const playersApi = {
  /** Team player list — used in TeamPage mini-cards */
  getByTeam: (teamId: string) =>
    apiFetch<TeamPlayerListItem[]>(`/players/team/${teamId}`),

  /** Full player profile — used in PlayerCard + TeamPage detail */
  getCard: (playerId: string) =>
    apiFetch<PlayerCard>(`/players/${playerId}/card`),

  /** Gameweek risk graph data — used in PlayerInjuryRiskChart */
  getGraph: (playerId: string) =>
    apiFetch<PlayerGraph>(`/players/${playerId}/graph`),

  /** All season stats — used in Season Performance / Statistics tabs */
  getSeasons: (playerId: string) =>
    apiFetch<PlayerSeasons>(`/players/${playerId}/seasons`),

  /** Full injury history list — used in InjuryHistoryTable */
  getInjuryHistory: (playerId: string) =>
    apiFetch<PlayerInjuryHistory>(`/players/${playerId}/injury-history`),

  /** Injury summary metrics — used in Injury Analysis card */
  getInjuryAnalysis: (playerId: string) =>
    apiFetch<PlayerInjuryAnalysis>(`/players/${playerId}/injury-analysis`),
};
