export function percentage(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, Math.round(value / total * 100))) : 0
}
