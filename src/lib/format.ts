const compact = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

export function formatKrw(n: number): string {
  return `${compact.format(Math.round(n))}원`;
}

export function formatKrwShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (abs >= 1e4) return `${Math.round(n / 1e4)}만`;
  return compact.format(Math.round(n));
}

export function formatMultiple(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2)}×`;
}

export function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
