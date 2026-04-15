import { teams } from '../data/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useState } from 'react';
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

export function StatisticsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Generate prediction records based on actual player data
  const predictionRecords: PredictionRecord[] = teams.flatMap(team =>
    team.players
      .filter(player => player.injuryHistory.length > 0)
      .flatMap(player =>
        player.injuryHistory.map((injury, index) => {
          const injuryDate = new Date(injury.date);
          const predictionDate = new Date(injuryDate);
          predictionDate.setDate(predictionDate.getDate() - 7);

          const daysUntil = 7;
          const wasHighRisk = player.injuryRisk > 50;

          return {
            id: `${player.id}-${index}`,
            playerName: `${player.firstName} ${player.lastName}`,
            team: team.name,
            predictionDate: predictionDate.toISOString().split('T')[0],
            predictedRisk: player.injuryRisk,
            actualInjury: true,
            injuryDate: injury.date,
            diagnosis: injury.diagnosis,
            daysUntilInjury: daysUntil
          };
        })
      )
  );

  // Add some false positive and true negative examples
  const allPlayers = teams.flatMap(team => team.players);
  const lowRiskNoInjury = allPlayers
    .filter(p => p.injuryRisk < 35 && p.injuryHistory.length === 0)
    .slice(0, 15)
    .map(p => ({
      id: `${p.id}-tn`,
      playerName: `${p.firstName} ${p.lastName}`,
      team: teams.find(t => t.players.includes(p))?.name || '',
      predictionDate: '2026-03-15',
      predictedRisk: p.injuryRisk,
      actualInjury: false
    }));

  const highRiskNoInjury = allPlayers
    .filter(p => p.injuryRisk > 50 && p.injuryHistory.length === 0)
    .slice(0, 8)
    .map(p => ({
      id: `${p.id}-fp`,
      playerName: `${p.firstName} ${p.lastName}`,
      team: teams.find(t => t.players.includes(p))?.name || '',
      predictionDate: '2026-03-20',
      predictedRisk: p.injuryRisk,
      actualInjury: false
    }));

  const allPredictions = [...predictionRecords, ...lowRiskNoInjury, ...highRiskNoInjury]
    .sort((a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime());

  // Calculate accuracy metrics
  const truePositives = allPredictions.filter(p => p.predictedRisk > 50 && p.actualInjury).length;
  const falsePositives = allPredictions.filter(p => p.predictedRisk > 50 && !p.actualInjury).length;
  const trueNegatives = allPredictions.filter(p => p.predictedRisk <= 50 && !p.actualInjury).length;
  const falseNegatives = allPredictions.filter(p => p.predictedRisk <= 50 && p.actualInjury).length;

  const totalPredictions = allPredictions.length;
  const accuracy = Math.round(((truePositives + trueNegatives) / totalPredictions) * 100);
  const precision = truePositives > 0 ? Math.round((truePositives / (truePositives + falsePositives)) * 100) : 0;
  const recall = truePositives > 0 ? Math.round((truePositives / (truePositives + falseNegatives)) * 100) : 0;

  // Filter predictions based on search query
  const filteredPredictions = allPredictions.filter(record => {
    const query = searchQuery.toLowerCase();
    return (
      record.playerName.toLowerCase().includes(query) ||
      record.team.toLowerCase().includes(query) ||
      (record.diagnosis && record.diagnosis.toLowerCase().includes(query))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Prediction Accuracy</h1>
        <p className="text-[#6B7280]">Compare AI predictions with actual injury outcomes</p>
      </div>

      {/* Accuracy Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
          <div className="text-sm text-[#6B7280] mb-2">Overall Accuracy</div>
          <div className="text-4xl font-bold text-[#0D9488]" style={{ fontFamily: 'var(--font-mono)' }}>
            {accuracy}%
          </div>
          <div className="text-xs text-[#6B7280] mt-2">
            {truePositives + trueNegatives} of {totalPredictions} correct
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
          <div className="text-sm text-[#6B7280] mb-2">Precision</div>
          <div className="text-4xl font-bold text-[#3B82F6]" style={{ fontFamily: 'var(--font-mono)' }}>
            {precision}%
          </div>
          <div className="text-xs text-[#6B7280] mt-2">
            High-risk predictions accuracy
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
          <div className="text-sm text-[#6B7280] mb-2">Recall</div>
          <div className="text-4xl font-bold text-[#8B5CF6]" style={{ fontFamily: 'var(--font-mono)' }}>
            {recall}%
          </div>
          <div className="text-xs text-[#6B7280] mt-2">
            Injuries caught by predictions
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
          <div className="text-sm text-[#6B7280] mb-2">Total Predictions</div>
          <div className="text-4xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
            {totalPredictions}
          </div>
          <div className="text-xs text-[#6B7280] mt-2">
            Last 30 days
          </div>
        </div>
      </div>

      {/* Confusion Matrix */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] overflow-hidden mb-12">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6">Prediction Breakdown</h2>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Pie Chart */}
            <div className="w-full lg:w-1/2 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'True Positives', value: truePositives, color: '#10B981', description: 'Predicted high risk → Injury occurred' },
                      { name: 'False Positives', value: falsePositives, color: '#F59E0B', description: 'Predicted high risk → No injury' },
                      { name: 'False Negatives', value: falseNegatives, color: '#EF4444', description: 'Predicted low risk → Injury occurred' },
                      { name: 'True Negatives', value: trueNegatives, color: '#3B82F6', description: 'Predicted low risk → No injury' },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'True Positives', value: truePositives, color: '#10B981' },
                      { name: 'False Positives', value: falsePositives, color: '#F59E0B' },
                      { name: 'False Negatives', value: falseNegatives, color: '#EF4444' },
                      { name: 'True Negatives', value: trueNegatives, color: '#3B82F6' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${((value / totalPredictions) * 100).toFixed(1)}%)`,
                      props.payload.description
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with detailed info */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-5 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-[#10B981]" />
                  <div className="font-semibold text-green-900">True Positives</div>
                  <div className="ml-auto text-2xl font-bold text-green-700" style={{ fontFamily: 'var(--font-mono)' }}>
                    {truePositives}
                  </div>
                </div>
                <div className="text-xs text-green-700 ml-7">
                  Predicted high risk → Injury occurred
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-5 border-2 border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-[#F59E0B]" />
                  <div className="font-semibold text-orange-900">False Positives</div>
                  <div className="ml-auto text-2xl font-bold text-orange-700" style={{ fontFamily: 'var(--font-mono)' }}>
                    {falsePositives}
                  </div>
                </div>
                <div className="text-xs text-orange-700 ml-7">
                  Predicted high risk → No injury
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-5 border-2 border-red-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-[#EF4444]" />
                  <div className="font-semibold text-red-900">False Negatives</div>
                  <div className="ml-auto text-2xl font-bold text-red-700" style={{ fontFamily: 'var(--font-mono)' }}>
                    {falseNegatives}
                  </div>
                </div>
                <div className="text-xs text-red-700 ml-7">
                  Predicted low risk → Injury occurred
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-5 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-[#3B82F6]" />
                  <div className="font-semibold text-blue-900">True Negatives</div>
                  <div className="ml-auto text-2xl font-bold text-blue-700" style={{ fontFamily: 'var(--font-mono)' }}>
                    {trueNegatives}
                  </div>
                </div>
                <div className="text-xs text-blue-700 ml-7">
                  Predicted low risk → No injury
                </div>
              </div>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
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
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[#6B7280]">Player</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[#6B7280]">Team</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[#6B7280]">Date</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-[#6B7280]">Predicted Risk</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-[#6B7280]">Actual Outcome</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-[#6B7280]">Result</th>
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

                    return (
                      <tr key={record.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F5F6FA] transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-[#1A1A2E] text-sm">{record.playerName}</div>
                          {record.diagnosis && (
                            <div className="text-xs text-[#6B7280] mt-0.5">{record.diagnosis}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-[#6B7280]">{record.team}</td>
                        <td className="py-3 px-2 text-sm text-[#6B7280]">{record.predictionDate}</td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              backgroundColor: record.predictedRisk > 50 ? '#FEE2E2' : record.predictedRisk > 35 ? '#FED7AA' : '#D1FAE5',
                              color: record.predictedRisk > 50 ? '#DC2626' : record.predictedRisk > 35 ? '#EA580C' : '#059669'
                            }}
                          >
                            {record.predictedRisk}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                            record.actualInjury
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            <span className="text-base">{record.actualInjury ? '⚠️' : '✓'}</span>
                            {record.actualInjury ? 'Injured' : 'Healthy'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                            isCorrect
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
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
