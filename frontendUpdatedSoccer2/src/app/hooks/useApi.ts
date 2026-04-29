import { useState, useEffect } from 'react';
import { ApiError } from '../api/client';
import { playersApi } from '../api/players';
import { teamsApi } from '../api/teams';
import { dashboardApi } from '../api/dashboard';
import { myPlayersApi } from '../api/myPlayers';
import { reportedInjuriesApi } from '../api/reportedInjuries';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for a single API call.
 * Re-fetches whenever `key` changes. Pass null/undefined to skip fetching.
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
    if (key === null || key === undefined) {
      setState({ data: null, loading: false, error: null });
      return;
    }

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

// ── Teams ────────────────────────────────────────────────────────────────────

export const useTeamsOverview = (skip = false) =>
  useApi(() => teamsApi.getOverview(), skip ? null : 'teams-overview');

// ── Players ──────────────────────────────────────────────────────────────────

export const useTeamPlayers = (teamId: string | undefined) =>
  useApi(() => playersApi.getByTeam(teamId!), teamId);

export const usePlayerCard = (playerId: string | undefined) =>
  useApi(() => playersApi.getCard(playerId!), playerId);

export const usePlayerGraph = (playerId: string | undefined) =>
  useApi(() => playersApi.getGraph(playerId!), playerId ? `graph-${playerId}` : undefined);

export const usePlayerSeasons = (playerId: string | undefined) =>
  useApi(() => playersApi.getSeasons(playerId!), playerId ? `seasons-${playerId}` : undefined);

export const usePlayerInjuryHistory = (playerId: string | undefined) =>
  useApi(() => playersApi.getInjuryHistory(playerId!), playerId ? `inj-history-${playerId}` : undefined);

export const usePlayerInjuryAnalysis = (playerId: string | undefined) =>
  useApi(() => playersApi.getInjuryAnalysis(playerId!), playerId ? `inj-analysis-${playerId}` : undefined);

// ── Dashboard ────────────────────────────────────────────────────────────────

export const useDashboardMatches = () =>
  useApi(() => dashboardApi.getMatches(), 'matches-current');

/**
 * userId = undefined  → global (all players)
 * userId = '1'        → watchlist for that user
 */
export const useHighRiskPlayers = (userId?: string) =>
  useApi(() => dashboardApi.getHighRiskPlayers(userId), `high-risk-${userId ?? 'global'}`);

export const useTrendingPlayers = (userId?: string) =>
  useApi(() => dashboardApi.getTrendingPlayers(userId), `trending-${userId ?? 'global'}`);

// ── My Players ───────────────────────────────────────────────────────────────

export const useMyPlayers = (userId: string | undefined) =>
  useApi(() => myPlayersApi.getMyPlayers(userId!), userId ? `my-players-${userId}` : undefined);

// ── Reported Injuries ────────────────────────────────────────────────────────

export const useReportedInjuries = () =>
  useApi(() => reportedInjuriesApi.getAll(), 'reported-injuries');
