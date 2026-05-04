import { apiFetch } from './client';
import type { ApiTeamOverview } from './types';
import { mapTeamOverview, type TeamOverviewItem } from './mappers';

export type { TeamOverviewItem } from './mappers';

// Module-level cache — fetched once per session, reused on every subsequent call
let _cache: TeamOverviewItem[] | null = null;

export const teamsApi = {
  getOverview: async () => {
    if (_cache) return _cache;
    const data = await apiFetch<ApiTeamOverview[]>('/teams/overview');
    _cache = data.map(mapTeamOverview);
    return _cache;
  },
};
