import { getAllPlayers } from '../data/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

interface PredictionRecord {
  id: string;
  playerName: string;
  team: string;
  predictionDate: string;
  predictedRisk: number;
  actualInjury: boolean;
  injuryDate?: string;
  diagnosis?: string;
  daysUntilInjury?: number;
}

const PIE_DATA_CONFIG = [
  { name: 'True Positives',  color: '#10B981', description: 'Predicted high risk → Injury occurred' },
  { name: 'False Positives', color: '#F59E0B', description: 'Predicted high risk → No injury' },
  { name: 'False Negatives', color: '#EF4444', description: 'Predicted low risk → Injury occurred' },
  { name: 'True Negatives',  color: '#3B82F6', description: 'Predicted low risk → No injury' },
];

export function StatisticsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const predictionRecords = useMemo<PredictionRecord[]>(() =>
    getAllPlayers()
      .filter(player => player.injuryHistory.length > 0)
      .flatMap(player =>
        player.injuryHistory.map((injury, index) => {
          const injuryDate = new Date(injury.from);
          const predictionDate = new Date(injuryDate);
          predictionDate.setDate(predictionDate.getDate() - 7);
          return {
            id: `${player.id}-${index}`,
            playerName: `${player.firstName} ${player.lastName}`,
            team: player.teamName,
            predictionDate: predictionDate.toISOString().split('T')[0],
            predictedRisk: player.injuryRisk,
            actualInjury: true,
            injuryDate: injury.from,
            diagnosis: injury.diagnosis,
            daysUntilInjury: 7,
          };
        })
      ),
  []);

  const allPredictions = useMemo<PredictionRecord[]>(() => {
    const allPlayers = getAllPlayers();

    const lowRiskNoInjury: PredictionRecord[] = allPlayers
      .filter(p => p.injuryRisk < 35 && p.injuryHistory.length === 0)
      .slice(0, 15)
      .map(p => ({ id: `${p.id}-tn`, playerName: `${p.firstName} ${p.lastName}`, team: p.teamName, predictionDate: '2026-03-15', predictedRisk: p.injuryRisk, actualInjury: false }));

    const highRiskNoInjury: PredictionRecord[] = allPlayers
      .filter(p => p.injuryRisk > 50 && p.injuryHistory.length === 0)
      .slice(0, 8)
      .map(p => ({ id: `${p.id}-fp`, playerName: `${p.firstName} ${p.lastName}`, team: p.teamName, predictionDate: '2026-03-20', predictedRisk: p.injuryRisk, actualInjury: false }));

    return [...predictionRecords, ...lowRiskNoInjury, ...highRiskNoInjury]
      .sort((a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime());
  }, [predictionRecords]);

  const { truePositives, falsePositives, trueNegatives, falseNegatives, accuracy, precision, recall } = useMemo(() => {
    const tp = allPredictions.filter(p => p.predictedRisk > 50 && p.actualInjury).length;
    const fp = allPredictions.filter(p => p.predictedRisk > 50 && !p.actualInjury).length;
    const tn = allPredictions.filter(p => p.predictedRisk <= 50 && !p.actualInjury).length;
    const fn = allPredictions.filter(p => p.predictedRisk <= 50 && p.actualInjury).length;
    const total = allPredictions.length;
    return {
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
      accuracy:  Math.round(((tp + tn) / total) * 100),
      precision: tp > 0 ? Math.round((tp / (tp + fp)) * 100) : 0,
      recall:    tp > 0 ? Math.round((tp / (tp + fn)) * 100) : 0,
    };
  }, [allPredictions]);

  const pieData = useMemo(() => [
    { ...PIE_DATA_CONFIG[0], value: truePositives },
    { ...PIE_DATA_CONFIG[1], value: falsePositives },
    { ...PIE_DATA_CONFIG[2], value: falseNegatives },
    { ...PIE_DATA_CONFIG[3], value: trueNegatives },
  ], [truePositives, falsePositives, falseNegatives, trueNegatives]);

  const filteredPredictions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return allPredictions.filter(record =>
      record.playerName.toLowerCase().includes(query) ||
      record.team.toLowerCase().includes(query) ||
      (record.diagnosis && record.diagnosis.toLowerCase().includes(query))
    );
  }, [allPredictions, searchQuery]);

  const totalPredictions = allPredictions.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Prediction Accuracy</h1>
        <p className="text-[#6B7280]">Compare AI predictions with actual injury outcomes</p>
      </div>

      {/* Accuracy Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Overall Accuracy', value: `${accuracy}%`, color: '#0D9488', sub: `${truePositives + trueNegatives} of ${totalPredictions} correct` },
          { label: 'Precision',        value: `${precision}%`, color: '#3B82F6', sub: 'High-risk predictions accuracy' },
          { label: 'Recall',           value: `${recall}%`,    color: '#8B5CF6', sub: 'Injuries caught by predictions' },
          { label: 'Total Predictions',value: `${totalPredictions}`, color: '#1A1A2E', sub: 'Last 30 days' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
            <div className="text-sm text-[#6B7280] mb-2">{label}</div>
            <div className="text-4xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div className="text-xs text-[#6B7280] mt-2">{sub}</div>
          </div>
        ))}
      </div>

      {/* Confusion Matrix */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden mb-12">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6">Prediction Breakdown</h2>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="w-full lg:w-1/2 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '12px' }}
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} (${((value / totalPredictions) * 100).toFixed(1)}%)`,
                      props.payload.description,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full lg:w-1/2 space-y-4">
              {[
                { bg: 'from-green-50 to-green-100/50',   border: 'border-green-200',  dot: '#10B981', label: 'True Positives',  text: 'text-green-900',  subtext: 'text-green-700',  value: truePositives,  desc: 'Predicted high risk → Injury occurred' },
                { bg: 'from-orange-50 to-orange-100/50', border: 'border-orange-200', dot: '#F59E0B', label: 'False Positives', text: 'text-orange-900', subtext: 'text-orange-700', value: falsePositives, desc: 'Predicted high risk → No injury' },
                { bg: 'from-red-50 to-red-100/50',       border: 'border-red-200',    dot: '#EF4444', label: 'False Negatives', text: 'text-red-900',    subtext: 'text-red-700',    value: falseNegatives, desc: 'Predicted low risk → Injury occurred' },
                { bg: 'from-blue-50 to-blue-100/50',     border: 'border-blue-200',   dot: '#3B82F6', label: 'True Negatives',  text: 'text-blue-900',  subtext: 'text-blue-700',   value: trueNegatives,  desc: 'Predicted low risk → No injury' },
              ].map(({ bg, border, dot, label, text, subtext, value, desc }) => (
                <div key={label} className={`bg-gradient-to-br ${bg} rounded-2xl p-5 border-2 ${border}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dot }} />
                    <div className={`font-semibold ${text}`}>{label}</div>
                    <div className={`ml-auto text-2xl font-bold ${subtext}`} style={{ fontFamily: 'var(--font-mono)' }}>{value}</div>
                  </div>
                  <div className={`text-xs ${subtext} ml-7`}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Predictions */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1A1A2E]">Recent Predictions vs. Actual Outcomes</h2>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] w-5 h-5" />
              <input
                type="text"
                placeholder="Search by player, team, or injury..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  {['Player', 'Team', 'Date', 'Predicted Risk', 'Actual Outcome', 'Result'].map((h, i) => (
                    <th key={h} className={`py-3 px-2 text-sm font-semibold text-[#6B7280] ${i >= 3 ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-12 h-12 text-[#D1D5DB]" />
                        <div className="text-[#6B7280] font-semibold">No predictions found</div>
                        <div className="text-sm text-[#9CA3AF]">Try adjusting your search query</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPredictions.slice(0, 20).map((record) => {
                    const isHighRisk = record.predictedRisk > 50;
                    const isCorrect = (isHighRisk && record.actualInjury) || (!isHighRisk && !record.actualInjury);
                    const riskStyle = record.predictedRisk > 50
                      ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                      : record.predictedRisk > 35
                        ? { backgroundColor: '#FED7AA', color: '#EA580C' }
                        : { backgroundColor: '#D1FAE5', color: '#059669' };

                    return (
                      <tr key={record.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F5F6FA] transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-[#1A1A2E] text-sm">{record.playerName}</div>
                          {record.diagnosis && <div className="text-xs text-[#6B7280] mt-0.5">{record.diagnosis}</div>}
                        </td>
                        <td className="py-3 px-2 text-sm text-[#6B7280]">{record.team}</td>
                        <td className="py-3 px-2 text-sm text-[#6B7280]">{record.predictionDate}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', ...riskStyle }}>
                            {record.predictedRisk}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${record.actualInjury ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            <span className="text-base">{record.actualInjury ? '⚠️' : '✓'}</span>
                            {record.actualInjury ? 'Injured' : 'Healthy'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            <span className="text-base">{isCorrect ? '✓' : '✗'}</span>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
