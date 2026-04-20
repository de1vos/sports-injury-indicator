import { apiFetch } from './client';
import type { Team } from '../data/mockData';

/** GET /teams/overview — all teams, without the full players array */
export type TeamOverviewItem = Omit<Team, 'players'>;

export const teamsApi = {
  /** All teams overview — used in TeamsPage / HomePage */
  getOverview: () =>
    apiFetch<TeamOverviewItem[]>('/teams/overview'),
};
