import { apiFetch } from './client';
import type { ApiTeamPlayer, ApiPlayerCard, ApiPlayerGraph, ApiPlayerSeason, ApiInjuryRecord, ApiInjuryAnalysis } from './types';
import { mapTeamPlayer, mapPlayerCard, mapGraph, mapSeasons, mapInjuryHistory, mapInjuryAnalysis } from './mappers';
import type { Player, SeasonStat, InjuryRecord, InjurySummaryData } from '../data/mockData';
import { mockPlayers, mockTeams } from '../data/mockData';

// Re-export shared types used by hooks / pages
export type { TeamPlayerListItem, TeamOverviewItem } from './mappers';

export const playersApi = {
  /** Team player list — mini cards */
  getByTeam: async (teamId: string) => {
    // For testing, return mock players for the team
    const team = mockTeams.find(t => t.id === teamId);
    if (team) {
      return team.players.map(player => ({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        kitNumber: player.kitNumber,
        age: player.age,
        nationality: player.nationality,
        injuryRisk: player.injuryRisk,
        riskLevel: player.riskLevel,
        photo: player.photo,
      }));
    }
    return [];
    // const data = await apiFetch<ApiTeamPlayer[]>(`/players/team/${teamId}`);
    // return data.map(mapTeamPlayer);
  },

  /** Full player profile */
  getCard: async (playerId: string): Promise<Player> => {
    // For testing, return mock player
    const player = mockPlayers.find(p => p.id === playerId);
    if (player) return player;
    throw new Error('Player not found');
    // const data = await apiFetch<ApiPlayerCard>(`/players/${playerId}/card`);
    // return mapPlayerCard(data, playerId);
  },

  /** Gameweek risk graph → { trend: RiskTrendEntry[], currentGw: string | null } */
  getGraph: async (playerId: string) => {
    // For testing, return mock data
    const player = mockPlayers.find(p => p.id === playerId);
    if (player?.injuryRiskTrend?.length) {
      const sorted = [...player.injuryRiskTrend].sort((a, b) => {
        if (a.season !== b.season) return a.season - b.season;
        return parseInt(a.gw.replace('GW', '')) - parseInt(b.gw.replace('GW', ''));
      });
      const maxSeason = Math.max(...sorted.map(e => e.season));
      const currentGw = sorted.filter(e => e.season === maxSeason).at(-1)?.gw ?? null;
      return { trend: player.injuryRiskTrend, currentGw };
    }
    return { trend: [], currentGw: null };
    // const data = await apiFetch<ApiPlayerGraph>(`/players/${playerId}/graph`);
    // const { entries, currentGw } = mapGraph(data);
    // return { trend: entries, currentGw };
  },

  /** Season stats → { seasons: SeasonStat[] } */
  getSeasons: async (playerId: string) => {
    // For testing, return mock data
    const player = mockPlayers.find(p => p.id === playerId);
    if (player && player.seasonStats) {
      return { seasons: player.seasonStats };
    }
    return { seasons: [] };
    // const data = await apiFetch<ApiPlayerSeason[]>(`/players/${playerId}/seasons`);
    // return { seasons: mapSeasons(data) };
  },

  /** Injury history → { injuries: InjuryRecord[] } */
  getInjuryHistory: async (playerId: string) => {
    // For testing, return mock data
    const player = mockPlayers.find(p => p.id === playerId);
    if (player && player.injuryHistory) {
      return { injuries: player.injuryHistory };
    }
    return { injuries: [] };
    // const data = await apiFetch<ApiInjuryRecord[]>(`/players/${playerId}/injury-history`);
    // return { injuries: mapInjuryHistory(data) };
  },

  /** Injury analysis summary → { summary: InjurySummaryData } */
  getInjuryAnalysis: async (playerId: string) => {
    // For testing, return mock data
    const player = mockPlayers.find(p => p.id === playerId);
    if (player && player.injurySummaryData) {
      return { summary: player.injurySummaryData };
    }
    return { summary: {} as InjurySummaryData };
    // const data = await apiFetch<ApiInjuryAnalysis>(`/players/${playerId}/injury-analysis`);
    // return { summary: mapInjuryAnalysis(data) };
  },
};
