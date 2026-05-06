export function getRelativeRiskMeta(value: number | null | undefined): { color: string; label: string } {
  if (value == null) return { color: '#6B7280', label: '—' };
  if (value > 2.0) return { color: '#A92C2C', label: 'Critical' };
  if (value >= 1.5) return { color: '#FFAA00', label: 'Monitor' };
  return { color: '#004F2D', label: 'Durable' };
}
