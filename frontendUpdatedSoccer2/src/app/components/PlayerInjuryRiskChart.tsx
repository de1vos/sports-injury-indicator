import { useMemo, useState, useEffect } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Player } from '../data/mockData';

interface ChartPoint { week: string; risk: number | null; injured?: boolean; }

const TOTAL_GWS = 38;

function buildTrendData(
  player: Player,
  currentGw: string | null | undefined,
): { points: ChartPoint[]; prevCount: number } {
  const trend = player.injuryRiskTrend;
  if (!trend?.length) return { points: [], prevCount: 0 };

  const sorted = [...trend].sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return parseInt(a.gw.replace('GW', '')) - parseInt(b.gw.replace('GW', ''));
  });

  const maxSeason = Math.max(...sorted.map(e => e.season));

  // Cap current season at the supplied currentGw, or the last entry of max season
  const currentGwNum = currentGw
    ? parseInt(currentGw.replace('GW', ''))
    : parseInt(sorted.filter(e => e.season === maxSeason).at(-1)?.gw.replace('GW', '') ?? '38');

  const currentSeasonEntries = sorted.filter(
    e => e.season === maxSeason && parseInt(e.gw.replace('GW', '')) <= currentGwNum,
  );

  const prevNeeded = Math.max(0, TOTAL_GWS - currentSeasonEntries.length);
  const prevSeasonEntries = prevNeeded > 0
    ? sorted.filter(e => e.season < maxSeason).slice(-prevNeeded)
    : [];

  const allEntries = [...prevSeasonEntries, ...currentSeasonEntries];

  const points: ChartPoint[] = allEntries.map(e => ({
    week: e.gw,
    risk: e.risk === 'Injured' ? null : Math.round((e.risk as number) * 10) / 10,
    injured: e.risk === 'Injured' ? true : undefined,
  }));

  return { points, prevCount: prevSeasonEntries.length };
}

function getInjurySpans(data: ChartPoint[]): Array<{ x1: string; x2: string }> {
  const spans: Array<{ x1: string; x2: string }> = [];
  let start: string | null = null;
  for (const d of data) {
    if (d.injured && !start) start = d.week;
    if (!d.injured && start) { spans.push({ x1: start, x2: d.week }); start = null; }
  }
  if (start) spans.push({ x1: start, x2: data[data.length - 1].week });
  return spans;
}

const getRiskZoneColor = (risk: number) => {
  if (risk > 50) return '#DC2626';
  if (risk > 35) return '#EA580C';
  if (risk > 20) return '#0D9488';
  return '#1A56DB';
};

export function PlayerInjuryRiskChart({
  player,
  currentGw,
}: {
  player: Player;
  currentGw?: string | null;
}) {
  const [animatedRisk, setAnimatedRisk] = useState(0);

  useEffect(() => {
    setAnimatedRisk(0);
    const target = player.injuryRisk;
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    const interval = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedRisk(target);
        clearInterval(timer);
      } else {
        setAnimatedRisk(Math.round(current));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [player.injuryRisk]);

  const { points: chartData, prevCount } = useMemo(
    () => buildTrendData(player, currentGw),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.id, player.injuryRisk, player.riskTrend, player.injuryRiskTrend, currentGw],
  );

  const color = getRiskZoneColor(player.injuryRisk);
  const hasGaps = chartData.some(d => d.risk === null);
  const gwsMissed = hasGaps ? chartData.filter(d => d.risk === null).length : 0;

  const prevSeasonEnd = prevCount > 0 ? chartData[prevCount - 1]?.week : null;
  const prevSeasonStart = prevCount > 0 ? chartData[0]?.week : null;

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
        <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">Injury Risk Trend</h3>
        <p className="text-sm text-[#6B7280]">No graph data available for this player.</p>
      </div>
    );
  }

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
          <div className="text-5xl font-bold" style={{ fontFamily: 'var(--font-mono)', color }}>
            {animatedRisk}%
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
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${player.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={0.1} />
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
              formatter={(value: unknown, _name: unknown, props: any) => {
                if (value === null || value === undefined || props?.payload?.injured) {
                  return ['Injured', ''];
                }
                return [`${value}%`, 'Risk'];
              }}
            />
            {/* Previous season yellow background */}
            {prevSeasonStart && prevSeasonEnd && (
              <ReferenceArea
                x1={prevSeasonStart}
                x2={prevSeasonEnd}
                fill="#F59E0B"
                fillOpacity={0.12}
                stroke="#F59E0B"
                strokeOpacity={0.3}
              />
            )}
            {/* Injury period red background */}
            {getInjurySpans(chartData).map(({ x1, x2 }, i) => (
              <ReferenceArea key={i} x1={x1} x2={x2} fill="#DC2626" fillOpacity={0.4} stroke="#DC2626" strokeOpacity={0.5} />
            ))}
            <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={35} stroke="#EA580C" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={20} stroke="#0D9488" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Area
              type="monotone"
              dataKey="risk"
              stroke={color}
              strokeWidth={3}
              fill={`url(#gradient-${player.id})`}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </ComposedChart>
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
          <span className="text-[#6B7280]">Shaded = Injured</span>
        </div>
        {prevCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F59E0B', opacity: 0.7 }} />
            <span className="text-[#6B7280]">Previous season</span>
          </div>
        )}
      </div>
    </div>
  );
}
