import { useState, useCallback } from 'react';
import { teamsApi } from '../api/teams';
import { playersApi } from '../api/players';
import { reportedInjuriesApi } from '../api/reportedInjuries';

export interface SearchPlayer {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  injuryRisk: number;
  isInjured: boolean;
  teamName: string;
}

export interface SearchTeam {
  id: string;
  name: string;
  avgRisk: number;
  squadSize: number;
}

// ── Binary Search Tree index ──────────────────────────────────────────────────
// Entries are sorted by key. Binary search finds prefix matches in O(log n)
// instead of O(n) linear scan, which is significant for 500+ player datasets.

interface IndexEntry<T> { key: string; item: T }

class SortedIndex<T> {
  private entries: IndexEntry<T>[] = [];

  build(items: T[], keyFn: (item: T) => string): void {
    this.entries = items
      .map(item => ({ key: keyFn(item).toLowerCase(), item }))
      .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  }

  /** Binary search: O(log n) to find start, then O(k) to collect k results. */
  searchPrefix(prefix: string, limit = 20): T[] {
    if (!prefix) return this.entries.slice(0, limit).map(e => e.item);
    const p = prefix.toLowerCase();
    let lo = 0, hi = this.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.entries[mid].key < p) lo = mid + 1;
      else hi = mid;
    }
    const results: T[] = [];
    while (lo < this.entries.length && this.entries[lo].key.startsWith(p) && results.length < limit) {
      results.push(this.entries[lo].item);
      lo++;
    }
    return results;
  }

  /** O(n) contains search — used as fallback for non-prefix queries. */
  searchContains(query: string, limit = 20): T[] {
    const q = query.toLowerCase();
    const results: T[] = [];
    for (const e of this.entries) {
      if (e.key.includes(q)) {
        results.push(e.item);
        if (results.length >= limit) break;
      }
    }
    return results;
  }
}

interface SearchIndex {
  // Two player indices: "firstName lastName" and "lastName firstName"
  playersByFullName: SortedIndex<SearchPlayer>;
  playersByLastFirst: SortedIndex<SearchPlayer>;
  teamsByName: SortedIndex<SearchTeam>;
  regionList: string[];
}

interface SearchData {
  teams: SearchTeam[];
  players: SearchPlayer[];
  regions: string[];
  index: SearchIndex | null;
  loaded: boolean;
}

function buildIndex(teams: SearchTeam[], players: SearchPlayer[], regions: string[]): SearchIndex {
  const playersByFullName = new SortedIndex<SearchPlayer>();
  playersByFullName.build(players, p => `${p.firstName} ${p.lastName}`);

  const playersByLastFirst = new SortedIndex<SearchPlayer>();
  playersByLastFirst.build(players, p => `${p.lastName} ${p.firstName}`);

  const teamsByName = new SortedIndex<SearchTeam>();
  teamsByName.build(teams, t => t.name);

  return { playersByFullName, playersByLastFirst, teamsByName, regionList: regions };
}

/** Fast player search using the BST index: checks both name orderings. */
export function searchPlayers(index: SearchIndex, query: string, limit = 15): SearchPlayer[] {
  const q = query.trim();
  if (!q) return index.playersByFullName.searchPrefix('', limit);

  // Try prefix search first (fast O(log n))
  const byFirst = index.playersByFullName.searchPrefix(q, limit);
  const byLast  = index.playersByLastFirst.searchPrefix(q, limit);

  // Merge, deduplicate by id
  const seen = new Set<string>();
  const results: SearchPlayer[] = [];
  for (const p of [...byFirst, ...byLast]) {
    if (!seen.has(p.id) && results.length < limit) {
      seen.add(p.id);
      results.push(p);
    }
  }

  // If prefix search found nothing, fall back to contains search
  if (results.length === 0) {
    return index.playersByFullName.searchContains(q, limit);
  }
  return results;
}

export function searchTeams(index: SearchIndex, query: string, limit = 5): SearchTeam[] {
  const q = query.trim();
  if (!q) return index.teamsByName.searchPrefix('', limit);
  const byPrefix = index.teamsByName.searchPrefix(q, limit);
  return byPrefix.length > 0 ? byPrefix : index.teamsByName.searchContains(q, limit);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

// Module-level cache so data and index survive hook re-mounts
let _cache: SearchData | null = null;

export function useSearchData() {
  const [data, setData] = useState<SearchData>(
    _cache ?? { teams: [], players: [], regions: [], index: null, loaded: false },
  );

  const load = useCallback(async () => {
    if (_cache?.loaded) {
      setData(prev => (prev.loaded ? prev : { ..._cache! }));
      return;
    }

    try {
      const [teams, injuries] = await Promise.all([
        teamsApi.getOverview(),
        reportedInjuriesApi.getAll(),
      ]);

      // Fetch players for all teams in parallel — skip teams with no squad data
      const activeTeams = teams.filter(t => t.squadSize > 0);
      const playersByTeam = await Promise.all(
        activeTeams.map(async (team) => {
          try {
            const players = await playersApi.getByTeam(team.id);
            return players.map(p => ({
              id: p.id,
              teamId: team.id,
              firstName: p.firstName,
              lastName: p.lastName,
              injuryRisk: p.injuryRisk,
              isInjured: p.riskLevel === 'Injured',
              teamName: team.name,
            }));
          } catch {
            return [] as SearchPlayer[];
          }
        }),
      );

      const regions = [
        ...new Set(injuries.map(i => i.region).filter((r): r is string => Boolean(r))),
      ].sort();

      const teamItems: SearchTeam[] = teams.map(t => ({
        id: t.id,
        name: t.name,
        avgRisk: t.avgRisk ?? 0,
        squadSize: t.squadSize,
      }));
      const playerItems = playersByTeam.flat();

      _cache = {
        teams: teamItems,
        players: playerItems,
        regions,
        index: buildIndex(teamItems, playerItems, regions),
        loaded: true,
      };

      setData({ ..._cache });
    } catch {
      // Silently fail — search shows empty results rather than crashing
    }
  }, []);

  return { data, load };
}
