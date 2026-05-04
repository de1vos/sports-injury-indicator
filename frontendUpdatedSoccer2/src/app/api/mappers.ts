/**
 * Mapper functions: raw backend API types → internal frontend types.
 * All percentage values: backend sends 0–1, frontend shows 0–100.
 */

import type { Player, InjuryRecord, RiskTrendEntry, SeasonStat, InjurySummaryData, Team } from '../data/mockData';
import type {
  ApiTeamOverview, ApiTeamPlayer, ApiPlayerCard, ApiPlayerGraph,
  ApiPlayerSeason, ApiInjuryRecord, ApiInjuryAnalysis,
} from './types';

// ── Teams ────────────────────────────────────────────────────────────────────

export type TeamOverviewItem = Omit<Team, 'players'>;

export const mapTeamOverview = (t: ApiTeamOverview): TeamOverviewItem => ({
  id: String(t.team_id),
  name: t.team_name,
  abbreviation: t.team_name.slice(0, 3).toUpperCase(),
  accentColor: '#1A56DB',       // not provided by API
  logo: t.team_logo,
  squadSize: t.amount_of_players,
  avgRisk: Math.round(t.average_risk_of_injury * 100),
  totalInjuries: t.total_season_injuries,
  totalMinutesLost: 0,
});

// ── Player list (mini cards) ─────────────────────────────────────────────────

export type TeamPlayerListItem = Pick<
  Player,
  'id' | 'firstName' | 'lastName' | 'position' | 'kitNumber' | 'age' |
  'nationality' | 'injuryRisk' | 'riskLevel' | 'photo'
>;

export const mapTeamPlayer = (p: ApiTeamPlayer): TeamPlayerListItem => ({
  id: String(p.player_id),
  firstName: p.player_first_name,
  lastName: p.player_last_name,
  injuryRisk: Math.round(p.player_injury_risk * 100),
  position: '',
  kitNumber: 0,
  age: 0,
  nationality: '',
  riskLevel: undefined,
  photo: undefined,
});

// ── Full player card ─────────────────────────────────────────────────────────

export const mapPlayerCard = (p: ApiPlayerCard, playerId?: string): Player => ({
  id: playerId ?? (p.player_id != null ? String(p.player_id) : ''),
  firstName: p.player_first_name,
  lastName: p.player_last_name,
  age: p.player_age,
  weight: p.player_weight,
  height: p.player_height,
  photo: p.player_photo,
  image: p.player_photo,
  position: p.player_position,
  kitNumber: p.player_kit_number,
  nationality: p.nation_name,
  injuryRisk: Math.round(p.player_injury_risk * 100),
  riskLevel: p.player_injury_status === 'available' ? 'Fit' : 'Injured',
  riskTrend: p.player_injury_trend ?? 0,
  injuries: p.player_season_injuries,
  minutesPlayed: p.player_season_minutes,
  minutesMissed: p.player_season_missed_games * 90,
  daysSinceLastInjury: 0,
  gamesPlayed: 0,
  avgDistance: 0,
  sprintsPerMatch: 0,
  foulsAgainst: 0,
  acuteChronicRatio: 0,
  matchDensity: 0,
  marketValue: '',
  injuryHistory: [],
  riskFactors: undefined,
  injuryRiskTrend: undefined,
  seasonStats: undefined,
  workloadData: undefined,
  injurySummaryData: undefined,
  nextMatch: undefined,
  preferredFoot: undefined,
  dateOfBirth: undefined,
});

// ── Risk trend graph ─────────────────────────────────────────────────────────

export const mapGraph = (data: ApiPlayerGraph): { entries: RiskTrendEntry[]; currentGw: string | null } => {
  const currentGw = typeof data.graph_data_current_gw === 'string' ? data.graph_data_current_gw : null;
  const entries = Object.entries(data)
    .filter(([key]) => /^gw_\d+$/.test(key))
    .map(([key, value]) => ({
      gw: `GW${key.replace('gw_', '')}`,
      season: 2025,
      risk: value === null || value === undefined
        ? ('Injured' as const)
        : Math.round((value as number) * 100 * 10) / 10,
    }))
    .sort((a, b) =>
      parseInt(a.gw.replace('GW', '')) - parseInt(b.gw.replace('GW', ''))
    );
  return { entries, currentGw };
};

// ── Season stats ─────────────────────────────────────────────────────────────

export const mapSeasons = (data: ApiPlayerSeason[]): SeasonStat[] =>
  data.map(s => ({
    season: s.player_season_year,
    appearances: s.player_season_appearances,
    minutes: s.player_season_minutes,
    rating: 0,
    goals: s.player_season_goals,
    assists: s.player_season_assists,
    tackles: s.player_season_tackles,
    interceptions: null,
    duels_total: s.player_season_duels_total,
    duels_won: 0,
    dribbles_attempts: s.player_season_dribbles_attempts,
    dribbles_success: 0,
    fouls_committed: s.player_season_fouls_commited,
    fouls_drawn: s.player_season_fouls_drawn,
    yellow_cards: s.player_season_yellow_cards,
    red_cards: s.player_season_red_cards,
  }));

// ── Injury history ───────────────────────────────────────────────────────────

export const mapInjuryHistory = (data: ApiInjuryRecord[]): InjuryRecord[] =>
  data.map(i => ({
    diagnosis: i.player_injury_type,
    region: i.player_injury_region,
    from: i.player_injury_start,
    until: i.player_injury_end,
    severity: i.player_injury_severity,
    daysOut: undefined,
  }));

// ── Injury analysis ──────────────────────────────────────────────────────────

export const mapInjuryAnalysis = (data: ApiInjuryAnalysis): InjurySummaryData => ({
  career_total_injuries: data.player_total_injuries,
  injuries_this_season: data.player_season_injuries,
  days_since_last_injury: data.player_days_since_injury,
  matches_missed_this_season: data.player_total_games_missed,
  minutes_missed_this_season: 0,
  matches_missed_career: 0,
});
