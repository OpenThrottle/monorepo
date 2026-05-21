export function formatIso(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

/**
 * Compact relative time for version-drift triage (same clock as the absolute timestamps).
 */
export function formatRelativeFromIso(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }

  const diffSec = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }

  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 48) {
    return rtf.format(diffHour, 'hour');
  }

  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 365) {
    return rtf.format(diffDay, 'day');
  }

  const diffMonth = Math.round(diffDay / 30);

  return rtf.format(diffMonth, 'month');
}

/**
 * Deterministic 32-bit fingerprint for comparing editor buffer vs saved API
 * content (debug only).
 */
export function fnv1a32Hex(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0).toString(16).padStart(8, '0');
}
