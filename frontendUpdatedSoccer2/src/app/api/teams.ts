import { apiFetch } from './client';
import type { ApiTeamOverview } from './types';
import { mapTeamOverview } from './mappers';

export type { TeamOverviewItem } from './mappers';

export const teamsApi = {
  getOverview: async () => {
    const data = await apiFetch<ApiTeamOverview[]>('/teams/overview');
    return data.map(mapTeamOverview);
  },
};
