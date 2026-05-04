/**
 * Mapper functions: raw backend API types → internal frontend types.
 * All percentage values are already 0–100 integers from the backend — no conversion needed.
 */

import type { Player, InjuryRecord, RiskTrendEntry, SeasonStat, InjurySummaryData, Team } from '../data/mockData';
import type {
  ApiTeamOverview, ApiTeamPlayer, ApiPlayerCard, ApiPlayerGraph,
  ApiPlayerSeason, ApiInjuryRecord, ApiInjuryAnalysis,
} from './types';

// ── Teams ────────────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<number, string> = {
  42:   '#EF0107', // Arsenal
  66:   '#670E36', // Aston Villa
  499:  '#1E71B8', // Atalanta
  35:   '#DA291C', // Bournemouth
  55:   '#E30613', // Brentford
  51:   '#0057B8', // Brighton
  44:   '#6C1D45', // Burnley
  49:   '#034694', // Chelsea
  52:   '#1B458F', // Crystal Palace
  45:   '#003399', // Everton
  36:   '#000000', // Fulham
  57:   '#0044AA', // Ipswich
  63:   '#1D428A', // Leeds
  46:   '#003090', // Leicester
  40:   '#C8102E', // Liverpool
  1359: '#F78F1E', // Luton
  50:   '#6CABDD', // Manchester City
  33:   '#DA291C', // Manchester United
  34:   '#241F20', // Newcastle
  65:   '#DD0000', // Nottingham Forest
  62:   '#EE2737', // Sheffield Utd
  41:   '#D71920', // Southampton
  746:  '#EB172B', // Sunderland
  47:   '#132257', // Tottenham
  200:  '#FFED00', // Vitesse
  48:   '#7A263A', // West Ham
  39:   '#FDB913', // Wolves
};

export type TeamOverviewItem = Omit<Team, 'players'>;

export const mapTeamOverview = (t: ApiTeamOverview): TeamOverviewItem => ({
  id: String(t.team_id),
  name: t.team_name,
  abbreviation: t.team_name.slice(0, 3).toUpperCase(),
  accentColor: TEAM_COLORS[t.team_id] ?? '#1A56DB',
  logo: t.team_logo,
  squadSize: t.amount_of_players,
  avgRisk: Math.round(t.average_risk_of_injury),
  totalInjuries: t.active_injuries,
  percentInjured: Math.round(t.percent_of_squad_injured),
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
  injuryRisk: typeof p.player_injury_risk === 'number' ? p.player_injury_risk : 0,
  riskLevel: p.player_injury_risk === 'injured' ? 'Injured' : undefined,
  position: '',
  kitNumber: 0,
  age: 0,
  nationality: '',
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
  injuryRisk: p.player_injury_risk,
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
      // "injured" string or null/undefined → mark as injured; otherwise use value as-is
      risk: value === 'injured' || value === null || value === undefined
        ? ('Injured' as const)
        : Math.round((value as number) * 10) / 10,
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
    rating: s.player_season_rating,
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
    daysOut: i.player_injury_days_out ?? undefined,
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
