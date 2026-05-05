import { apiFetch } from './client';

export interface ApiSearchPlayer {
  player_id: number;
  team_id: number;
  player_first_name: string;
  player_last_name: string;
  player_photo: string;
  team_name: string;
  player_relative_risk: number | null;
  player_is_injured: boolean;
}

export interface ApiSearchTeam {
  team_id: number;
  team_name: string;
  team_logo: string;
  avg_risk_pct: number | null;
  squad_size: number;
}

export const searchApi = {
  getPlayers: () => apiFetch<ApiSearchPlayer[]>('/search/players'),
  getTeams: () => apiFetch<ApiSearchTeam[]>('/search/teams'),
  getInjuryRegions: () => apiFetch<string[]>('/search/injury-regions'),
};
