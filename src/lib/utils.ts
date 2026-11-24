export function inr(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export function discountPct(price: number, original: number | null): number | null {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// True while the store's UPI ID is still the seeded placeholder (never a real VPA).
export function isPlaceholderUpi(upi: string | undefined | null): boolean {
  const v = (upi || '').trim().toLowerCase();
  return !v || v === 'djshaggy@upi' || v.includes('example') || v.startsWith('yourname@') || v.startsWith('test@');
}

export const ACCENTS: Record<string, string> = {
  magenta: '#f34fd0', jade: '#2fd27d', azure: '#4f8cff',
  crimson: '#ff3b4e', gold: '#d8b45a', cyan: '#22d3ee',
};
