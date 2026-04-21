import { apiFetch } from './client';
import type { ApiMyPlayer } from './types';

export interface MyPlayerItem {
  id?: string;
  firstName: string;
  lastName: string;
  photo: string;
  teamName: string;
  position: string;
  injuryTrend: number;
  seasonalInjuries: number;
}

const mapMyPlayer = (p: ApiMyPlayer): MyPlayerItem => ({
  id: p.player_id != null ? String(p.player_id) : undefined,
  firstName: p.player_first_name,
  lastName: p.player_last_name,
  photo: p.player_photo,
  teamName: p.team_name,
  position: p.player_position,
  injuryTrend: p.player_injury_trend,
  seasonalInjuries: p.player_seasonal_injuries,
});

export const myPlayersApi = {
  getMyPlayers: async (userId: string): Promise<MyPlayerItem[]> => {
    const data = await apiFetch<ApiMyPlayer[]>(`/my-players/${userId}`);
    return data.map(mapMyPlayer);
  },
};
