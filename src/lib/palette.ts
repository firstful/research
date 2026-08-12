// Half-year → color (matches the frontier data's shipped palette, blue → green).
export const PERIOD_COLORS: Record<string, string> = {
  '2023H2': '#0ea5e9',
  '2024H1': '#22b8cf',
  '2024H2': '#10b981',
  '2025H1': '#34d399',
  '2025H2': '#4ade80',
  '2026H1': '#a3e635',
  '2026H2': '#facc15',
}

export const PERIODS = Object.keys(PERIOD_COLORS)

export function periodColor(period: string | null): string {
  if (!period) return '#64748b'
  return PERIOD_COLORS[period] ?? '#64748b'
}

export const BENCHMARKS = ['ARC-AGI', 'MMLU-Pro', 'GPQA', 'MATH-500', 'IFEval', 'BFCL']

export const ACCENT = '#34d399'
export const MUTED = '#94a3b8'
