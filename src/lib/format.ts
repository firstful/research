export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export function fmtGb(n: number | null | undefined): string {
  return fmt(n, 1)
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(0)}%`
}

export function fmtB(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n >= 100 ? `${Math.round(n)}B` : `${n.toFixed(1)}B`
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function toolBadge(tool: string): { label: string; tone: string } {
  switch (tool) {
    case 'clean':
      return { label: 'clean', tone: 'ok' }
    case 'garbled':
      return { label: 'garbled', tone: 'warn' }
    case 'refused':
      return { label: 'refused', tone: 'bad' }
    case 'hallucinated':
      return { label: 'hallucinated', tone: 'bad' }
    default:
      return { label: 'unknown', tone: 'mute' }
  }
}
