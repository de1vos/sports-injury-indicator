import { apiFetch } from './client';
import type { ApiTeamOverview } from './types';
import { mapTeamOverview } from './mappers';
import { mockTeams } from '../data/mockData';

export type { TeamOverviewItem } from './mappers';

export const teamsApi = {
  getOverview: async () => {
    // For testing, return mock data
    return mockTeams.map(team => ({
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      accentColor: team.accentColor,
      logo: team.logo,
      squadSize: team.squadSize,
      avgRisk: team.avgRisk,
      totalInjuries: team.totalInjuries,
      totalMinutesLost: team.totalMinutesLost,
    }));
    // const data = await apiFetch<ApiTeamOverview[]>('/teams/overview');
    // return data.map(mapTeamOverview);
  },
};
