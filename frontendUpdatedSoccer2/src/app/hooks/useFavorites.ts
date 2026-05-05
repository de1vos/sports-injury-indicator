import { useState, useEffect, useContext, createContext, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { authFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface CachedPlayer {
  id: string;
  teamId?: string;
  firstName: string;
  lastName: string;
  photo?: string;
  teamName?: string;
  position: string;
  injuryTrend: number;
  seasonalInjuries: number;
  injuryRisk?: number;
  relativeRisk?: number | null;
  injuryStatus?: string;
  minutesPlayed?: number;
}

interface BackendFavourite {
  player_id: number;
  player_first_name: string;
  player_last_name: string;
  player_photo: string;
  team_id: number;
  team_name: string;
  player_position: string;
  player_injury_risk: number;
  player_relative_risk?: number | null;
  player_is_injured: boolean;
  player_injury_trend: number;
  player_seasonal_injuries: number;
  player_season_minutes: number;
}

function mapPlayer(b: BackendFavourite): CachedPlayer {
  return {
    id: String(b.player_id),
    teamId: String(b.team_id),
    firstName: b.player_first_name,
    lastName: b.player_last_name,
    photo: b.player_photo,
    teamName: b.team_name,
    position: b.player_position,
    injuryRisk: b.player_injury_risk,
    relativeRisk: b.player_relative_risk ?? null,
    injuryStatus: b.player_is_injured ? 'Injured' : 'Fit',
    injuryTrend: b.player_injury_trend,
    seasonalInjuries: b.player_seasonal_injuries,
    minutesPlayed: b.player_season_minutes,
  };
}

export interface FavoritesContextValue {
  favorites: Set<string>;
  toggleFavorite: (playerId: string, data?: CachedPlayer) => void;
  isFavorite: (playerId: string) => boolean;
  favoriteCount: number;
  favoritePlayers: CachedPlayer[];
  refresh: () => void;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavoritesState(): FavoritesContextValue {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [favoritePlayers, setFavoritePlayers] = useState<CachedPlayer[]>([]);

  const favorites = useMemo(
    () => new Set(favoritePlayers.map(p => p.id)),
    [favoritePlayers],
  );

  const fetchFavourites = () => {
    if (!session) return;
    authFetch<BackendFavourite[]>('/favourites')
      .then(data => setFavoritePlayers(data.map(mapPlayer)))
      .catch(console.error);
  };

  useEffect(() => {
    if (!session) {
      setFavoritePlayers([]);
      return;
    }
    fetchFavourites();
  }, [session]);

  const toggleFavorite = (playerId: string, data?: CachedPlayer) => {
    if (!session) {
      navigate('/login');
      return;
    }
    const isCurrentlyFav = favorites.has(playerId);
    if (isCurrentlyFav) {
      setFavoritePlayers(prev => prev.filter(p => p.id !== playerId));
      authFetch(`/favourites/${playerId}`, { method: 'DELETE' }).catch(err => {
        console.error(err);
        authFetch<BackendFavourite[]>('/favourites')
          .then(d => setFavoritePlayers(d.map(mapPlayer)))
          .catch(console.error);
      });
    } else {
      if (data) setFavoritePlayers(prev => [...prev, { ...data, id: playerId }]);
      authFetch(`/favourites/${playerId}`, { method: 'POST' })
        .then(() => authFetch<BackendFavourite[]>('/favourites'))
        .then(d => setFavoritePlayers(d.map(mapPlayer)))
        .catch(err => {
          console.error(err);
          setFavoritePlayers(prev => prev.filter(p => p.id !== playerId));
        });
    }
  };

  return {
    favorites,
    toggleFavorite,
    isFavorite: (playerId: string) => favorites.has(playerId),
    favoriteCount: favoritePlayers.length,
    favoritePlayers,
    refresh: fetchFavourites,
  };
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
