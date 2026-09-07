export function toIso(date: Date | string): string {
  return (date instanceof Date ? date : new Date(date)).toISOString();
}

export function parseNumeric(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
