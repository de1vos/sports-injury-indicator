import { useState, useEffect, useContext, createContext } from 'react';

const FAVORITES_KEY = 'si2-favorite-players';
const PLAYER_DATA_KEY = 'si2-player-data';

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
  injuryStatus?: string;
  minutesPlayed?: number;
}

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function loadPlayerData(): Record<string, CachedPlayer> {
  try {
    const stored = localStorage.getItem(PLAYER_DATA_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export interface FavoritesContextValue {
  favorites: Set<string>;
  toggleFavorite: (playerId: string, data?: CachedPlayer) => void;
  isFavorite: (playerId: string) => boolean;
  favoriteCount: number;
  favoritePlayers: CachedPlayer[];
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavoritesState(): FavoritesContextValue {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [playerData, setPlayerData] = useState<Record<string, CachedPlayer>>(loadPlayerData);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(PLAYER_DATA_KEY, JSON.stringify(playerData));
  }, [playerData]);

  const toggleFavorite = (playerId: string, data?: CachedPlayer) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        setPlayerData(pd => {
          const updated = { ...pd };
          delete updated[playerId];
          return updated;
        });
      } else {
        next.add(playerId);
        if (data) {
          setPlayerData(pd => ({ ...pd, [playerId]: { ...data, id: playerId } }));
        }
      }
      return next;
    });
  };

  const favoritePlayers: CachedPlayer[] = [...favorites]
    .map(id => playerData[id])
    .filter(Boolean);

  return {
    favorites,
    toggleFavorite,
    isFavorite: (playerId: string) => favorites.has(playerId),
    favoriteCount: favoritePlayers.length,
    favoritePlayers,
  };
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
