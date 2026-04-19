import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'si2-favorite-players';

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFavorite = (playerId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  return {
    favorites,
    toggleFavorite,
    isFavorite: (playerId: string) => favorites.has(playerId),
    favoriteCount: favorites.size,
  };
}
