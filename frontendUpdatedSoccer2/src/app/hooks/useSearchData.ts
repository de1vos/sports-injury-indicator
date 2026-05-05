import { useState, useCallback } from 'react';
import { searchApi } from '../api/search';

export interface SearchPlayer {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  photo: string;
  teamName: string;
  relativeRisk: number | null;
  isInjured: boolean;
}

export interface SearchTeam {
  id: string;
  name: string;
  avgRisk: number | null;
  squadSize: number;
}

// ── Trie index ────────────────────────────────────────────────────────────────

interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  items: T[];
}

class Trie<T> {
  private root: TrieNode<T> = { children: new Map(), items: [] };
  private allItems: Array<{ key: string; item: T }> = [];

  insert(key: string, item: T): void {
    const k = key.toLowerCase();
    this.allItems.push({ key: k, item });
    let node = this.root;
    for (const char of k) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), items: [] });
      }
      node = node.children.get(char)!;
    }
    node.items.push(item);
  }

  searchPrefix(prefix: string, limit = 20): T[] {
    if (!prefix) return this._collect(this.root, limit);
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    return this._collect(node, limit);
  }

  private _collect(node: TrieNode<T>, limit: number): T[] {
    const results: T[] = [];
    const queue: TrieNode<T>[] = [node];
    while (queue.length > 0 && results.length < limit) {
      const curr = queue.shift()!;
      for (const item of curr.items) {
        results.push(item);
        if (results.length >= limit) return results;
      }
      for (const child of curr.children.values()) {
        queue.push(child);
      }
    }
    return results;
  }

  searchContains(query: string, limit = 20): T[] {
    const q = query.toLowerCase();
    const results: T[] = [];
    for (const { key, item } of this.allItems) {
      if (key.includes(q)) {
        results.push(item);
        if (results.length >= limit) break;
      }
    }
    return results;
  }
}

interface SearchIndex {
  playersByFullName: Trie<SearchPlayer>;
  playersByLastFirst: Trie<SearchPlayer>;
  teamsByName: Trie<SearchTeam>;
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
  const playersByFullName = new Trie<SearchPlayer>();
  players.forEach(p => playersByFullName.insert(`${p.firstName} ${p.lastName}`, p));

  const playersByLastFirst = new Trie<SearchPlayer>();
  players.forEach(p => playersByLastFirst.insert(`${p.lastName} ${p.firstName}`, p));

  const teamsByName = new Trie<SearchTeam>();
  teams.forEach(t => teamsByName.insert(t.name, t));

  return { playersByFullName, playersByLastFirst, teamsByName, regionList: regions };
}

export function searchPlayers(index: SearchIndex, query: string, limit = 15): SearchPlayer[] {
  const q = query.trim();
  if (!q) return index.playersByFullName.searchPrefix('', limit);

  const byFirst = index.playersByFullName.searchPrefix(q, limit);
  const byLast  = index.playersByLastFirst.searchPrefix(q, limit);

  const seen = new Set<string>();
  const results: SearchPlayer[] = [];
  for (const p of [...byFirst, ...byLast]) {
    if (!seen.has(p.id) && results.length < limit) {
      seen.add(p.id);
      results.push(p);
    }
  }

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
      const [rawPlayers, rawTeams, regions] = await Promise.all([
        searchApi.getPlayers(),
        searchApi.getTeams(),
        searchApi.getInjuryRegions(),
      ]);

      const players: SearchPlayer[] = rawPlayers.map(p => ({
        id: p.player_id.toString(),
        teamId: p.team_id.toString(),
        firstName: p.player_first_name,
        lastName: p.player_last_name,
        photo: p.player_photo,
        teamName: p.team_name,
        relativeRisk: p.player_relative_risk,
        isInjured: p.player_is_injured,
      }));

      const teams: SearchTeam[] = rawTeams.map(t => ({
        id: t.team_id.toString(),
        name: t.team_name,
        avgRisk: t.avg_risk_pct,
        squadSize: t.squad_size,
      }));

      _cache = {
        teams,
        players,
        regions,
        index: buildIndex(teams, players, regions),
        loaded: true,
      };

      setData({ ..._cache });
    } catch {
      // Silently fail — search shows empty results rather than crashing
    }
  }, []);

  return { data, load };
}
