import { useMemo, useState, useEffect } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Player } from '../data/mockData';

interface ChartPoint { week: string; risk: number | null; injuredLine: number | null; injured?: boolean; prevSeason?: boolean; }

// GW1 of 2025/26 season started ~Aug 16 2025
const SEASON_START = new Date('2025-08-16');

function currentGW(): number {
  const seasonStart = SEASON_START.getTime();
  return Math.max(1, Math.min(38, Math.ceil((Date.now() - seasonStart) / (7 * 86_400_000))));
}

function gwToDateRange(gw: number): [Date, Date] {
  const start = new Date(SEASON_START);
  start.setDate(start.getDate() + (gw - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return [start, end];
}

function generateGWData(player: Player): ChartPoint[] {
  const curGW = currentGW();
  const raw: Omit<ChartPoint, 'injuredLine'>[] = [];

  for (let gw = curGW + 1; gw <= 38; gw++) {
    const progress = (gw - (curGW + 1)) / Math.max(1, 38 - curGW);
    const baseRisk = player.injuryRisk - player.riskTrend * 0.5 * (1 - progress);
    const variation = (Math.random() - 0.5) * 4;
    raw.push({
      week: `GW${gw}`,
      risk: Math.round(Math.max(0, Math.min(100, baseRisk + variation)) * 10) / 10,
      prevSeason: true,
    });
  }

  for (let gw = 1; gw <= curGW; gw++) {
    const [gwStart, gwEnd] = gwToDateRange(gw);
    const isInjured = player.injuryHistory.some(inj => {
      const from = new Date(inj.from);
      const until = inj.until ? new Date(inj.until) : new Date('9999-12-31');
      return from < gwEnd && until >= gwStart;
    });

    if (isInjured) {
      raw.push({ week: `GW${gw}`, risk: null, injured: true });
    } else {
      const progress = gw / curGW;
      const baseRisk = player.injuryRisk - player.riskTrend * (1 - progress);
      const variation = (Math.random() - 0.5) * 4;
      raw.push({
        week: `GW${gw}`,
        risk: Math.round(Math.max(0, Math.min(100, baseRisk + variation)) * 10) / 10,
      });
    }
  }

  return addInjuredLine(raw);
}

function buildTrendData(player: Player, currentGw: number): ChartPoint[] {
  if (!player.injuryRiskTrend?.length) return generateGWData(player);

  const gwNum = (e: { gw: string }) => parseInt(e.gw.replace('GW', ''), 10);

  const all = [...player.injuryRiskTrend].sort((a, b) => gwNum(a) - gwNum(b));

  // GW numbers ABOVE currentGw belong to the PREVIOUS season (e.g., GW35–38 from 2024/25
  // that ran before the current season started). They sit on the LEFT of the chart.
  // GW numbers AT OR BELOW currentGw are the current season — rightmost, ending at "Now".
  const prevSeason  = all.filter(e => gwNum(e) >  currentGw);   // e.g. GW35–38 from last year
  const currentSzn  = all.filter(e => gwNum(e) <= currentGw);   // GW1–currentGw this year

  const prevSlice = prevSeason;
  const currSlice = currentSzn;

  const toPoint = (e: typeof all[0], isPrev: boolean): Omit<ChartPoint, 'injuredLine'> => ({
    week: e.gw,
    risk: e.risk === 'Injured' ? null : Math.round((e.risk as number) * 10) / 10,
    injured: e.risk === 'Injured' ? true : undefined,
    prevSeason: isPrev || undefined,
  });

  const raw = [
    ...prevSlice.map(e => toPoint(e, true)),
    ...currSlice.map(e => toPoint(e, false)),
  ];

  return addInjuredLine(raw);
}

function addInjuredLine(data: Omit<ChartPoint, 'injuredLine'>[]): ChartPoint[] {
  const result: ChartPoint[] = data.map(d => ({ ...d, injuredLine: null }));
  for (let i = 0; i < result.length; i++) {
    if (result[i].injured) {
      result[i].injuredLine = 100;
      if (i > 0 && !result[i - 1].injured && result[i - 1].risk !== null)
        result[i - 1].injuredLine = result[i - 1].risk;
    } else if (i > 0 && result[i - 1].injured && result[i].risk !== null) {
      result[i].injuredLine = result[i].risk;
    }
  }
  return result;
}

function getInjurySpans(data: ChartPoint[]): Array<{ x1: string; x2: string }> {
  const spans: Array<{ x1: string; x2: string }> = [];
  let start: string | null = null;
  let lastInjuredWeek: string | null = null;

  for (const d of data) {
    if (d.injured) {
      if (!start) start = d.week;
      lastInjuredWeek = d.week;
    } else if (start && lastInjuredWeek) {
      // End at the LAST injured week (not the first non-injured week) so the
      // right-side gap mirrors the left-side gap — both bridge dots sit outside the shade.
      spans.push({ x1: start, x2: lastInjuredWeek });
      start = null;
      lastInjuredWeek = null;
    }
  }

  // Trailing (open-ended) injury: shade all the way to the last dot
  if (start && lastInjuredWeek) {
    spans.push({ x1: start, x2: lastInjuredWeek });
  }

  return spans;
}

const getRiskZoneColor = (risk: number) => {
  if (risk > 50) return '#DC2626';
  if (risk > 35) return '#EA580C';
  if (risk > 20) return '#0D9488';
  return '#1A56DB';
};

const ANIM_DURATION = 1400;

export function PlayerInjuryRiskChart({ player, currentGw: currentGwProp }: { player: Player; currentGw?: number }) {
  // Prefer the API-supplied value; fall back to date-computed GW — never hardcoded
  const currentGw = currentGwProp ?? currentGW();
  const chartData = useMemo(
    () => buildTrendData(player, currentGw),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.id, player.injuryRisk, player.riskTrend, player.injuryRiskTrend, currentGw],
  );

  const color = getRiskZoneColor(player.injuryRisk);
  const hasGaps = chartData.some(d => d.risk === null);
  const gwsMissed = hasGaps ? chartData.filter(d => d.risk === null).length : 0;

  // Injured check: also treat 99%+ risk as effectively injured
  const today = new Date().toISOString().split('T')[0];
  const isCurrentlyInjured =
    player.injuryRisk >= 99 ||
    player.riskLevel === 'Injured' ||
    (player.injuryHistory ?? []).some(entry => !entry.until || entry.until >= today);

  // "Now" sits at the current GW — always the rightmost visible point
  const nowLabel = `GW${currentGw}`;

  // Previous season weeks — amber shading on the LEFT
  const prevSeasonWeeks = chartData.filter(d => d.prevSeason).map(d => d.week);
  const prevSeasonFirst = prevSeasonWeeks[0];
  const prevSeasonLast = prevSeasonWeeks[prevSeasonWeeks.length - 1];

  // ── Counter animation (0 → risk%) — skipped when injured ──────────────────
  const [displayRisk, setDisplayRisk] = useState(0);
  useEffect(() => {
    if (isCurrentlyInjured) { setDisplayRisk(0); return; }
    const target = player.injuryRisk;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / ANIM_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayRisk(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [player.id, player.injuryRisk, isCurrentlyInjured]);

  // ── Stats box fade — same duration as the chart lines ─────────────────────
  const [statsVisible, setStatsVisible] = useState(false);
  useEffect(() => {
    setStatsVisible(false);
    const t = setTimeout(() => setStatsVisible(true), 30);
    return () => clearTimeout(t);
  }, [player.id]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">Injury Risk Trend</h3>
        <p className="text-sm text-[#6B7280]">
          Risk per gameweek — shaded regions indicate injury absence
        </p>
      </div>

      {/* Stats box — fades in together with the chart lines */}
      <div
        className="flex items-center justify-between mb-6 p-4 bg-[#F5F6FA] rounded-2xl"
        style={{
          opacity: statsVisible ? 1 : 0,
          transform: statsVisible ? 'translateY(0)' : 'translateY(4px)',
          transition: `opacity ${ANIM_DURATION}ms cubic-bezier(0.22,1,0.36,1), transform ${ANIM_DURATION}ms cubic-bezier(0.22,1,0.36,1)`,
        }}
      >
        <div>
          <div className="text-xs uppercase text-[#6B7280] mb-1">Current Risk</div>
          <div
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--font-mono)', color: isCurrentlyInjured ? '#DC2626' : color }}
          >
            {isCurrentlyInjured ? 'INJURED' : `${displayRisk}%`}
          </div>
        </div>

        {isCurrentlyInjured ? (
          <div className="text-right">
            <div className="text-xs uppercase text-[#6B7280] mb-1">GWs Missed</div>
            <div className="text-2xl font-bold text-[#DC2626]" style={{ fontFamily: 'var(--font-mono)' }}>
              {gwsMissed}
            </div>
          </div>
        ) : hasGaps ? (
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
              <linearGradient id="injuredGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6B7280" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#6B7280" stopOpacity={0.02} />
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
            {/* Previous season — amber filled box on the LEFT */}
            {prevSeasonFirst && prevSeasonLast && (
              <ReferenceArea
                x1={prevSeasonFirst}
                x2={prevSeasonLast}
                fill="#F59E0B"
                fillOpacity={0.12}
                stroke="#F59E0B"
                strokeOpacity={0.2}
                label={{ value: 'Prev Season', position: 'insideTopLeft', fill: '#D97706', fontSize: 10, dy: 4 }}
              />
            )}
            {/* Boundary line between prev season and current season */}
            {prevSeasonLast && (
              <ReferenceLine
                x={prevSeasonLast}
                stroke="#9CA3AF"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            )}
            {/* Current GW "Now" marker */}
            <ReferenceLine
              x={nowLabel}
              stroke="#1A56DB"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.55}
              label={{ value: 'Now', position: 'insideTopRight', fill: '#1A56DB', fontSize: 10, dy: 4 }}
            />
            {getInjurySpans(chartData).map(({ x1, x2 }, i) => (
              <ReferenceArea key={i} x1={x1} x2={x2} fill="url(#injuredGradient)" fillOpacity={1} stroke="none" />
            ))}
            <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={35} stroke="#EA580C" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={20} stroke="#0D9488" strokeDasharray="3 3" strokeOpacity={0.3} />
            {/* Grey injured line — renders below the risk line */}
            <Line
              type="monotone"
              dataKey="injuredLine"
              stroke="#6B7280"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ fill: '#6B7280', r: 3, strokeWidth: 0 }}
              activeDot={false}
              connectNulls={false}
              tooltipType="none"
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={ANIM_DURATION}
              animationEasing="ease-out"
            />
            {/* Risk line — renders on top */}
            <Line
              type="monotone"
              dataKey="risk"
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={ANIM_DURATION}
              animationEasing="ease-out"
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
          <span className="text-[#6B7280]">Injured</span>
        </div>
        {prevSeasonFirst && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-3 rounded bg-[#F59E0B] opacity-40" />
            <span className="text-[#6B7280]">Prev Season</span>
          </div>
        )}
      </div>
    </div>
  );
}
