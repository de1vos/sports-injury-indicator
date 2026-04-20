import { useState, useEffect } from 'react';
import { ApiError } from '../api/client';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for a single API call.
 * Re-fetches whenever `key` changes (pass the URL or a unique string derived
 * from params so React knows when to re-run).
 *
 * Usage:
 *   const { data, loading, error } = useApi(
 *     () => playersApi.getCard(playerId),
 *     playerId            // re-fetch when playerId changes
 *   );
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  key: string | number | null | undefined,
): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (key === null || key === undefined) return;

    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetcher()
      .then(data => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof ApiError
            ? err.message
            : 'An unexpected error occurred';
          setState({ data: null, loading: false, error: message });
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

// ── Convenience hooks (one per endpoint) ─────────────────────────────────────

import { playersApi } from '../api/players';
import { teamsApi } from '../api/teams';

export const useTeamsOverview = () =>
  useApi(() => teamsApi.getOverview(), 'teams-overview');

export const useTeamPlayers = (teamId: string | undefined) =>
  useApi(() => playersApi.getByTeam(teamId!), teamId);

export const usePlayerCard = (playerId: string | undefined) =>
  useApi(() => playersApi.getCard(playerId!), playerId);

export const usePlayerGraph = (playerId: string | undefined) =>
  useApi(() => playersApi.getGraph(playerId!), playerId ? `graph-${playerId}` : undefined);

export const usePlayerSeasons = (playerId: string | undefined) =>
  useApi(() => playersApi.getSeasons(playerId!), playerId ? `seasons-${playerId}` : undefined);

export const usePlayerInjuryHistory = (playerId: string | undefined) =>
  useApi(() => playersApi.getInjuryHistory(playerId!), playerId ? `injuries-${playerId}` : undefined);

export const usePlayerInjuryAnalysis = (playerId: string | undefined) =>
  useApi(() => playersApi.getInjuryAnalysis(playerId!), playerId ? `analysis-${playerId}` : undefined);
