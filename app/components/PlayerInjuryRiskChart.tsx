import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Player } from '../data/mockData';

interface PlayerInjuryRiskChartProps {
  player: Player;
}

// Generate historical risk data based on current risk and trend
function generateHistoricalData(currentRisk: number, trend: number) {
  const data = [];
  const weeks = 12;

  // Calculate the starting risk by working backwards from current risk
  // trend is percentage change, so we reverse it
  let risk = currentRisk;
  const weeklyChange = trend / 4; // Divide trend by 4 to get approximate weekly change

  // Generate data from 12 weeks ago to now
  for (let i = weeks; i >= 0; i--) {
    const weekLabel = i === 0 ? 'Now' : `${i}w`;
    const calculatedRisk = i === 0 ? currentRisk : currentRisk - (weeklyChange * i);

    // Add some randomness to make it look more realistic, but keep it within bounds
    const randomVariation = (Math.random() - 0.5) * 3;
    const finalRisk = Math.max(0, Math.min(100, calculatedRisk + randomVariation));

    data.push({
      week: weekLabel,
      risk: Math.round(finalRisk * 10) / 10,
    });
  }

  return data.reverse();
}

export function PlayerInjuryRiskChart({ player }: PlayerInjuryRiskChartProps) {
  const historicalData = generateHistoricalData(player.injuryRisk, player.riskTrend);

  // Calculate risk zone colors
  const getRiskZoneColor = (risk: number) => {
    if (risk > 50) return '#DC2626'; // High risk - red
    if (risk > 35) return '#EA580C'; // Elevated risk - orange
    if (risk > 20) return '#0D9488'; // Moderate risk - teal
    return '#1A56DB'; // Low risk - blue
  };

  const currentRiskColor = getRiskZoneColor(player.injuryRisk);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">Injury Risk Trend</h3>
        <p className="text-sm text-[#6B7280]">Historical injury risk over the last 12 weeks</p>
      </div>

      {/* Current Risk Summary */}
      <div className="flex items-center justify-between mb-6 p-4 bg-[#F5F6FA] rounded-2xl">
        <div>
          <div className="text-xs uppercase text-[#6B7280] mb-1">Current Risk</div>
          <div
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--font-mono)', color: currentRiskColor }}
          >
            {player.injuryRisk}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-[#6B7280] mb-1">12-Week Trend</div>
          <div
            className="text-2xl font-bold flex items-center gap-1"
            style={{
              fontFamily: 'var(--font-mono)',
              color: player.riskTrend > 0 ? '#DC2626' : '#0D9488'
            }}
          >
            {player.riskTrend > 0 ? '↑' : '↓'}
            {Math.abs(player.riskTrend)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentRiskColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={currentRiskColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="week"
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '12px',
                padding: '8px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              labelStyle={{ color: '#1A1A2E', fontWeight: 600, marginBottom: '4px' }}
              itemStyle={{ color: currentRiskColor, fontFamily: 'var(--font-mono)' }}
              formatter={(value: number) => [`${value}%`, 'Risk']}
            />
            {/* Reference lines for risk zones */}
            <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={35} stroke="#EA580C" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={20} stroke="#0D9488" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Area
              type="monotone"
              dataKey="risk"
              stroke={currentRiskColor}
              strokeWidth={3}
              fill="url(#riskGradient)"
            />
            <Line
              type="monotone"
              dataKey="risk"
              stroke={currentRiskColor}
              strokeWidth={3}
              dot={{ fill: currentRiskColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Zone Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#1A56DB]"></div>
          <span className="text-[#6B7280]">Low (0-20%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0D9488]"></div>
          <span className="text-[#6B7280]">Moderate (20-35%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EA580C]"></div>
          <span className="text-[#6B7280]">Elevated (35-50%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#DC2626]"></div>
          <span className="text-[#6B7280]">High (50%+)</span>
        </div>
      </div>
    </div>
  );
}
