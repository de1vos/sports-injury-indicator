import { apiFetch } from './client';
import type { ApiReportedInjury } from './types';

export interface ReportedInjuryItem {
  startDate: string;
  endDate: string;
  firstName: string;
  lastName: string;
  teamName: string;
  diagnosis: string;
  region: string;
  severity: string;
  position: string;
  daysOut: number;
}

const mapReportedInjury = (i: ApiReportedInjury): ReportedInjuryItem => ({
  startDate: i.injury_date_start,
  endDate: i.injury_date_end,
  firstName: i.player_first_name,
  lastName: i.player_last_name,
  teamName: i.team_name,
  diagnosis: i.player_injury_diagnosis,
  region: i.player_injury_region,
  severity: i.player_injury_severity,
  position: i.player_position,
  daysOut: i.player_injury_days_out,
});

export const reportedInjuriesApi = {
  getAll: async (): Promise<ReportedInjuryItem[]> => {
    const data = await apiFetch<ApiReportedInjury[]>('/reported-injuries/');
    return data.map(mapReportedInjury);
  },
};
