import { apiFetch } from './client';
import type { ApiTeamPlayer, ApiPlayerCard, ApiPlayerGraph, ApiPlayerSeason, ApiInjuryRecord, ApiInjuryAnalysis } from './types';
import { mapTeamPlayer, mapPlayerCard, mapGraph, mapSeasons, mapInjuryHistory, mapInjuryAnalysis } from './mappers';
import type { Player, SeasonStat, InjuryRecord, InjurySummaryData } from '../data/mockData';

// Re-export shared types used by hooks / pages
export type { TeamPlayerListItem, TeamOverviewItem } from './mappers';

export const playersApi = {
  /** Team player list — mini cards */
  getByTeam: async (teamId: string) => {
    const data = await apiFetch<ApiTeamPlayer[]>(`/players/team/${teamId}`);
    return data.map(mapTeamPlayer);
  },

  /** Full player profile */
  getCard: async (playerId: string): Promise<Player> => {
    const data = await apiFetch<ApiPlayerCard>(`/players/${playerId}/card`);
    return mapPlayerCard(data, playerId);
  },

  /** Gameweek risk graph → { trend: RiskTrendEntry[], currentGw?: number } */
  getGraph: async (playerId: string) => {
    const data = await apiFetch<ApiPlayerGraph>(`/players/${playerId}/graph`);
    const gwStr = data['graph_data_current_gw'];
    const currentGw = typeof gwStr === 'string'
      ? (parseInt(gwStr.replace('gw', ''), 10) || undefined)
      : undefined;
    return { trend: mapGraph(data), currentGw };
  },

  /** Season stats → { seasons: SeasonStat[] } */
  getSeasons: async (playerId: string) => {
    const data = await apiFetch<ApiPlayerSeason[]>(`/players/${playerId}/seasons`);
    return { seasons: mapSeasons(data) };
  },

  /** Injury history → { injuries: InjuryRecord[] } */
  getInjuryHistory: async (playerId: string) => {
    const data = await apiFetch<ApiInjuryRecord[]>(`/players/${playerId}/injury-history`);
    return { injuries: mapInjuryHistory(data) };
  },

  /** Injury analysis summary → { summary: InjurySummaryData } */
  getInjuryAnalysis: async (playerId: string) => {
    const data = await apiFetch<ApiInjuryAnalysis>(`/players/${playerId}/injury-analysis`);
    return { summary: mapInjuryAnalysis(data) };
  },
};
