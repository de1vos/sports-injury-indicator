export function getRelativeRiskMeta(value: number | null | undefined): { color: string; label: string } {
  if (value == null) return { color: '#6B7280', label: '—' };
  if (value > 2.0) return { color: '#DC2626', label: 'Critical' };
  if (value >= 1.5) return { color: '#EA580C', label: 'Monitor' };
  return { color: '#0D9488', label: 'Durable' };
}
