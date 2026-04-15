import { Player, getRiskColor } from '../data/mockData';

interface PlayerDetailsProps {
  player: Player;
}

export function PlayerDetails({ player }: PlayerDetailsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild':
        return '#0D9488';
      case 'Moderate':
        return '#EA580C';
      case 'Severe':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="overflow-hidden">
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
        {/* Advanced Stats */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Advanced Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#F5F6FA] rounded-2xl p-4">
              <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Avg Distance
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {player.avgDistance} km
              </div>
            </div>
            <div className="bg-[#F5F6FA] rounded-2xl p-4">
              <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Sprints/Match
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {player.sprintsPerMatch}
              </div>
            </div>
            <div className="bg-[#F5F6FA] rounded-2xl p-4">
              <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Fouls/Match
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {player.foulsAgainst}
              </div>
            </div>
            <div className="bg-[#F5F6FA] rounded-2xl p-4">
              <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Acute:Chronic
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {player.acuteChronicRatio}
              </div>
            </div>
            <div className="bg-[#F5F6FA] rounded-2xl p-4">
              <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Days Since Injury
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {player.daysSinceLastInjury}
              </div>
            </div>
            <div className="bg-[#F5F6FA] rounded-2xl p-4">
              <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Match Density
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {player.matchDensity}
              </div>
            </div>
          </div>
        </div>

        {/* Injury History */}
        <div>
          <h3 className="text-xl font-bold text-[#1A1A2E] mb-4">Injury History</h3>
          {player.injuryHistory.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280]">
              No injury history recorded
            </div>
          ) : (
            <div className="space-y-3">
              {player.injuryHistory.map((injury, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-[#F5F6FA] rounded-2xl hover:bg-[#EBEDF3] transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-[#1A1A2E]">{injury.diagnosis}</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: getSeverityColor(injury.severity) }}
                      >
                        {injury.severity}
                      </span>
                    </div>
                    <div className="text-sm text-[#6B7280]">
                      {injury.region} · {injury.duration}
                    </div>
                  </div>
                  <div className="text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {injury.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
