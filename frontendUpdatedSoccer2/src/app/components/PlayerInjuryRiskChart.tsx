import { useMemo } from 'react';
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from 'recharts';
import { Player } from '../data/mockData';

interface ChartPoint { week: string; risk: number | null; }

// GW1 of 2025/26 season started ~Aug 16 2025
const SEASON_START = new Date('2025-08-16');

function gwToDateRange(gw: number): [Date, Date] {
  const start = new Date(SEASON_START);
  start.setDate(start.getDate() + (gw - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return [start, end];
}

function generateGWData(player: Player): ChartPoint[] {
  const startGW = 13;
  const endGW = 32;
  const data: ChartPoint[] = [];

  for (let gw = startGW; gw <= endGW; gw++) {
    const [gwStart, gwEnd] = gwToDateRange(gw);

    const isInjured = player.injuryHistory.some(inj => {
      const from = new Date(inj.from);
      const until = new Date(inj.until);
      return from < gwEnd && until >= gwStart;
    });

    if (isInjured) {
      data.push({ week: `GW${gw}`, risk: null });
    } else {
      const progress = (gw - startGW) / (endGW - startGW);
      const baseRisk = player.injuryRisk - player.riskTrend * (1 - progress);
      const variation = (Math.random() - 0.5) * 4;
      data.push({
        week: `GW${gw}`,
        risk: Math.round(Math.max(0, Math.min(100, baseRisk + variation)) * 10) / 10,
      });
    }
  }

  return data;
}

function buildTrendData(player: Player): ChartPoint[] {
  if (!player.injuryRiskTrend?.length) return generateGWData(player);
  const entries = player.injuryRiskTrend.slice(-20);
  return entries.map(e => ({
    week: e.gw,
    risk: e.risk === 'Injured' ? null : Math.round(e.risk * 100 * 10) / 10,
  }));
}

const getRiskZoneColor = (risk: number) => {
  if (risk > 50) return '#DC2626';
  if (risk > 35) return '#EA580C';
  if (risk > 20) return '#0D9488';
  return '#1A56DB';
};

export function PlayerInjuryRiskChart({ player }: { player: Player }) {
  const chartData = useMemo(
    () => buildTrendData(player),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.id, player.injuryRisk, player.riskTrend, player.injuryRiskTrend],
  );
  const color = getRiskZoneColor(player.injuryRisk);
  const isRealData = !!player.injuryRiskTrend?.length;
  const hasGaps = chartData.some(d => d.risk === null);

  const gwsMissed = hasGaps ? chartData.filter(d => d.risk === null).length : 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">Injury Risk Trend</h3>
        <p className="text-sm text-[#6B7280]">
          Risk per gameweek — gaps indicate injury absence
        </p>
      </div>

      <div className="flex items-center justify-between mb-6 p-4 bg-[#F5F6FA] rounded-2xl">
        <div>
          <div className="text-xs uppercase text-[#6B7280] mb-1">Current Risk</div>
          <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-mono)', color }}>
            {player.injuryRisk}%
          </div>
        </div>
        {hasGaps ? (
          <div className="text-right">
            <div className="text-xs uppercase text-[#6B7280] mb-1">GWs Missed</div>
            <div className="text-2xl font-bold text-[#DC2626]" style={{ fontFamily: 'var(--font-mono)' }}>
              {gwsMissed}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-xs uppercase text-[#6B7280] mb-1">Season Trend</div>
            <div
              className="text-2xl font-bold flex items-center gap-1"
              style={{ fontFamily: 'var(--font-mono)', color: player.riskTrend > 0 ? '#DC2626' : '#0D9488' }}
            >
              {player.riskTrend > 0 ? '↑' : '↓'}{Math.abs(player.riskTrend)}%
            </div>
          </div>
        )}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`riskGradient-${player.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="week"
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              interval={3}
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              labelStyle={{ color: '#1A1A2E', fontWeight: 600, marginBottom: '4px' }}
              itemStyle={{ color: color, fontFamily: 'var(--font-mono)' }}
              formatter={(value: number | null) => value === null ? ['Injured', ''] : [`${value}%`, 'Risk']}
            />
            <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={35} stroke="#EA580C" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={20} stroke="#0D9488" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Area
              type="monotone"
              dataKey="risk"
              stroke={color}
              strokeWidth={3}
              fill={`url(#riskGradient-${player.id})`}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 flex-wrap text-xs">
        {[
          { color: '#1A56DB', label: 'Low (0-20%)' },
          { color: '#0D9488', label: 'Moderate (20-35%)' },
          { color: '#EA580C', label: 'Elevated (35-50%)' },
          { color: '#DC2626', label: 'High (50%+)' },
        ].map(({ color: c, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span className="text-[#6B7280]">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#6B7280]" />
          <span className="text-[#6B7280]">Gap = Injured</span>
        </div>
      </div>
    </div>
  );
}
