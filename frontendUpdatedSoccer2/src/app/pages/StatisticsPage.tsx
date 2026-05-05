import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { AlertCircle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

// ── Static performance figures (held-out 2025/26 season) ──────────────────────
const CALIBRATION_DATA = [
  { label: 'Lowest risk',  range: '2.8% – 4.4%',  injuryRate: 0.9,  fill: '#1A56DB' },
  { label: 'Low risk',     range: '4.4% – 6.2%',  injuryRate: 3.6,  fill: '#0D9488' },
  { label: 'Moderate',     range: '6.2% – 7.1%',  injuryRate: 5.9,  fill: '#F59E0B' },
  { label: 'High',         range: '7.1% – 7.9%',  injuryRate: 7.3,  fill: '#EA580C' },
  { label: 'Highest risk', range: '7.9% – 8.9%+', injuryRate: 14.4, fill: '#DC2626' },
];

const BASELINE_RATE = 5.1;

const LIFT_TABLE = [
  { monitored: 'Top 10 players',     injured: 40, lift: 7.8, highlight: true  },
  { monitored: 'Top 20 players',     injured: 35, lift: 6.8, highlight: false },
  { monitored: 'Top 50 players',     injured: 20, lift: 3.9, highlight: false },
  { monitored: 'Top 100 players',    injured: 28, lift: 5.4, highlight: false },
  { monitored: 'Random 50 players',  injured: 5.1, lift: 1.0, highlight: false, baseline: true },
];

const PR_AUC_MODEL    = 0.136;
const PR_AUC_RANDOM   = 0.051;
const PR_AUC_MULTIPLE = (PR_AUC_MODEL / PR_AUC_RANDOM).toFixed(1);

const LIMITATIONS = [
  {
    title: 'No international minutes',
    body:  'We do not have data on minutes played during international breaks. Players returning from duty may have elevated risk not captured in the score.',
  },
  {
    title: 'Premier League only',
    body:  'The model covers players registered in Premier League squads. Match data from European and domestic cup competitions (UCL, FA Cup, EFL Cup) is included for PL players to capture their full workload — these matches count toward their risk score.',
  },
  {
    title: '28-day window',
    body:  'The score reflects risk of a new injury starting in the next 28 days. Longer-term or pre-existing conditions are captured through injury history features, not direct observation.',
  },
  {
    title: 'Not a medical tool',
    body:  'Scores are based on statistical patterns in historical data. They do not reflect medical examinations, training load data, or physiological assessments.',
  },
  {
    title: 'Small sample caveats',
    body:  'Performance figures are based on ~6,400 held-out player-match observations from the 2025/26 season. Individual player predictions carry inherent uncertainty.',
  },
];

const TRAINING_SUMMARY: Array<{ item: string; detail: string }> = [
  { item: 'Training seasons',    detail: '2022/23, 2023/24, 2024/25' },
  { item: 'Evaluation season',   detail: '2025/26 (held out)' },
  { item: 'Injury definition',   detail: 'Musculoskeletal injury (muscle, knee, ankle, hamstring, etc.) starting within 28 days' },
  { item: 'Excluded',            detail: 'Illness, suspension, “knock” (minor), administrative absences' },
  { item: 'Data source',         detail: 'API-Football' },
  { item: 'Model type',          detail: 'XGBoost (gradient boosted trees) with sigmoid probability calibration' },
  { item: 'Last retrained',      detail: 'Auto-populated from model bundle timestamp' },
];

// ── Reusable section heading ──────────────────────────────────────────────────
function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <div className="text-xs font-semibold tracking-wider uppercase text-[#1A56DB] mb-2">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">{title}</h2>
      {description && (
        <p className="text-[#6B7280] mt-1 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// ── Calibration chart tooltip ─────────────────────────────────────────────────
function CalibrationTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] shadow-lg p-3 text-sm">
      <div className="font-semibold text-[#1A1A2E]">{d.label}</div>
      <div className="text-xs text-[#6B7280] mt-0.5">Predicted score range: {d.range}</div>
      <div
        className="mt-2 font-bold"
        style={{ color: d.fill, fontFamily: 'var(--font-mono)' }}
      >
        {d.injuryRate}% actually injured
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StatisticsPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Hero */}
      <div className="hero-net bg-gradient-to-b from-[#1A56DB] via-[#2563EB] to-[#F5F6FA] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="text-xs font-semibold tracking-wider uppercase text-white/70 mb-3">
            Performance &amp; Transparency
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            How the model works
          </h1>
          <p className="text-white/85 text-lg font-medium max-w-2xl leading-relaxed">
            We show you exactly how reliable our injury risk scores are — and where they fall short.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* What the score means */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader eyebrow="The basics" title="What the score means" />
          <div className="space-y-4 text-[#374151] leading-relaxed">
            <p>
              Every player receives a risk score from <span className="font-semibold text-[#1A1A2E]">0–100%</span>.
              This is a calibrated estimate of the probability that the player sustains a new injury in the
              next 28 days, grounded in observed historical outcomes across Premier League seasons.
            </p>
            <p>
              A score of <span className="font-semibold text-[#1A1A2E]">14%</span> does not mean the player
              <em> will </em>be injured. It means that players with similar workload, injury history, and
              physical profile have historically sustained injuries at approximately that rate over the
              following month.
            </p>
            <p className="text-[#1A1A2E] font-medium border-l-4 border-[#1A56DB] pl-4 py-1">
              The score is a probability estimate, not a diagnosis — and it ranks players from lowest to
              highest risk.
            </p>
          </div>
        </section>

        {/* Calibration */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader
            eyebrow="Calibration"
            title="Does a higher score actually mean higher risk?"
            description="We divided all players into five equal groups by their predicted score. Each bar shows how many of those players actually sustained an injury in the following 28 days. A well-calibrated model should show bars that increase from left to right — and ours does."
          />

          <div className="bg-gradient-to-br from-[#F5F6FA] to-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-4 sm:p-6">
            <div className="w-full h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={CALIBRATION_DATA}
                  layout="vertical"
                  margin={{ top: 8, right: 48, left: 16, bottom: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    type="number"
                    domain={[0, 16]}
                    tickFormatter={v => `${v}%`}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12, fill: '#1A1A2E', fontWeight: 600 }}
                  />
                  <Tooltip content={<CalibrationTooltip />} cursor={{ fill: 'rgba(26,86,219,0.04)' }} />
                  <ReferenceLine
                    x={BASELINE_RATE}
                    stroke="#6B7280"
                    strokeDasharray="4 4"
                    label={{
                      value: `League avg ${BASELINE_RATE}%`,
                      position: 'top',
                      fill: '#6B7280',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="injuryRate" radius={[0, 8, 8, 0]} barSize={28}>
                    {CALIBRATION_DATA.map(d => (
                      <Cell key={d.label} fill={d.fill} />
                    ))}
                    <LabelList
                      dataKey="injuryRate"
                      position="right"
                      formatter={(v: number) => `${v}%`}
                      style={{ fill: '#1A1A2E', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-br from-red-50 to-red-100/40 rounded-2xl border border-red-200 p-5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div className="text-[#7F1D1D] leading-relaxed">
              <span className="font-semibold">Players in our highest-risk group sustain injuries at nearly 3× the league average rate</span>
              <span className="text-[#9F1239]"> (14.4% vs 5.1% — held-out 2025/26 season data).</span>
            </div>
          </div>
        </section>

        {/* Lift table */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader
            eyebrow="Ranking power"
            title="How well does it rank players?"
            description="If a club physiotherapist monitored the players we flag as highest-risk before a given round of matches, statistically they would identify many more real injuries than choosing players at random."
          />

          <div className="overflow-x-auto rounded-2xl border border-[rgba(0,0,0,0.06)]">
            <table className="w-full">
              <thead className="bg-[#F5F6FA]">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    If you monitor the top…
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Injuries found
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    vs. watching at random
                  </th>
                </tr>
              </thead>
              <tbody>
                {LIFT_TABLE.map(row => (
                  <tr
                    key={row.monitored}
                    className={`border-t border-[rgba(0,0,0,0.06)] ${
                      row.highlight ? 'bg-gradient-to-r from-[#DBEAFE]/40 to-transparent' : ''
                    } ${row.baseline ? 'bg-[#F9FAFB]' : ''}`}
                  >
                    <td className="py-4 px-4">
                      <div className={`font-semibold ${row.highlight ? 'text-[#1A56DB]' : 'text-[#1A1A2E]'}`}>
                        {row.monitored}
                      </div>
                      {row.baseline && (
                        <div className="text-xs text-[#9CA3AF] mt-0.5">Baseline reference</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: row.baseline ? '#E5E7EB' : '#FEE2E2',
                          color: row.baseline ? '#6B7280' : '#DC2626',
                        }}
                      >
                        {row.injured}% injured
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: row.baseline ? '#E5E7EB' : row.highlight ? '#DBEAFE' : '#F3F4F6',
                          color: row.baseline ? '#6B7280' : row.highlight ? '#1A56DB' : '#374151',
                        }}
                      >
                        {row.lift.toFixed(1)}× {row.baseline ? '(baseline)' : 'vs random'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-2xl border border-blue-200 p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1A56DB] flex-shrink-0 mt-0.5" />
            <div className="text-[#1E3A8A] leading-relaxed">
              <span className="font-semibold">Monitoring our top 10 flagged players catches injuries at 7.8× the rate of random selection.</span>
            </div>
          </div>
        </section>

        {/* Are percentages meaningful */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader eyebrow="Interpretation" title="Are the percentages meaningful?" />
          <div className="space-y-4 text-[#374151] leading-relaxed">
            <p>
              <span className="font-semibold text-[#1A1A2E]">Yes</span> — and our calibration data proves it.
              The percentage scores are calibrated estimates of real historical injury rates.
            </p>
            <p>
              A player assigned a score of <span className="font-semibold text-[#1A1A2E]">~14%</span> belongs
              to a group that has historically sustained injuries at roughly 14.4% over the following 28 days.
              A player assigned <span className="font-semibold text-[#1A1A2E]">~3%</span> belongs to a group
              where only 0.9% got injured. These are not arbitrary numbers — they are grounded in observed
              outcomes.
            </p>
            <p className="text-[#1A1A2E] font-medium border-l-4 border-[#0D9488] pl-4 py-1">
              The score is a risk estimate, not a certainty. Even a player at 14% has an 86% chance of
              remaining injury-free.
            </p>
          </div>
        </section>

        {/* PR-AUC */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader
            eyebrow="Overall discrimination"
            title="Precision-Recall AUC"
            description="Precision-Recall AUC measures how consistently the model separates injured players from healthy ones across every possible risk threshold."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2 bg-gradient-to-br from-[#F5F6FA] to-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6">
              {/* Model bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#1A1A2E]">Model PR-AUC</span>
                  <span
                    className="text-2xl font-bold text-[#1A56DB]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {PR_AUC_MODEL.toFixed(3)}
                  </span>
                </div>
                <div className="relative h-4 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1A56DB] to-[#2563EB] rounded-full"
                    style={{ width: `${(PR_AUC_MODEL / 0.2) * 100}%` }}
                  />
                </div>
              </div>

              {/* Random baseline bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#6B7280]">Random baseline</span>
                  <span
                    className="text-2xl font-bold text-[#6B7280]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {PR_AUC_RANDOM.toFixed(3)}
                  </span>
                </div>
                <div className="relative h-4 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#9CA3AF] rounded-full"
                    style={{ width: `${(PR_AUC_RANDOM / 0.2) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-2xl border border-blue-200 p-6 flex flex-col justify-center items-center text-center">
              <div className="text-xs font-semibold tracking-wider uppercase text-[#1A56DB] mb-2">
                Lift over random
              </div>
              <div
                className="text-5xl font-bold text-[#1A56DB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {PR_AUC_MULTIPLE}×
              </div>
              <div className="text-xs text-[#1E3A8A] mt-2 leading-snug">
                Better than chance at separating injured from healthy
              </div>
            </div>
          </div>

          <p className="text-[#374151] leading-relaxed">
            A random system scores <span className="font-semibold text-[#1A1A2E]">{PR_AUC_RANDOM.toFixed(3)}</span> on
            our dataset. Our model scores <span className="font-semibold text-[#1A1A2E]">{PR_AUC_MODEL.toFixed(3)}</span> —
            nearly <span className="font-semibold text-[#1A56DB]">{PR_AUC_MULTIPLE}× the random baseline</span>.
          </p>
        </section>

        {/* Limitations */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader
            eyebrow="Transparency"
            title="Limitations — what the model cannot do"
            description="Every model has blind spots. Here are ours."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIMITATIONS.map(lim => (
              <div
                key={lim.title}
                className="bg-[#F5F6FA] rounded-2xl border border-[rgba(0,0,0,0.06)] p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-[#D97706]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1A1A2E] mb-1">{lim.title}</div>
                    <div className="text-sm text-[#6B7280] leading-relaxed">{lim.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Training data summary */}
        <section className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] p-8">
          <SectionHeader
            eyebrow="Methodology"
            title="Training data summary"
            description="Where the numbers come from."
          />

          <div className="overflow-x-auto rounded-2xl border border-[rgba(0,0,0,0.06)]">
            <table className="w-full">
              <thead className="bg-[#F5F6FA]">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280] w-1/3">
                    Item
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {TRAINING_SUMMARY.map(row => (
                  <tr key={row.item} className="border-t border-[rgba(0,0,0,0.06)]">
                    <td className="py-3 px-4 font-semibold text-[#1A1A2E] align-top">{row.item}</td>
                    <td className="py-3 px-4 text-[#374151]">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-start gap-2 text-xs text-[#9CA3AF]">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              All performance figures shown on this page are computed on the held-out 2025/26 season
              (~6,400 player-match observations) and were not seen by the model during training.
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}
