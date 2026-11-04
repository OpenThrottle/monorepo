import { TABLE_ROW_LIMIT } from '../config/index.ts';
import type { WindowCount } from '../types/index.ts';

/**
 * @description Formatting helpers for `report.md`: number/duration/currency formatting and the
 * small table primitives every section is built from.
 */

/** A Markdown table, or an explicit "no rows" note when `rows` is empty. */
export function renderTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  if (rows.length === 0) {
    return '_(no rows in this window)_';
  }
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

/** The "showing the top N of M rows" note, or an empty string when nothing was cut. */
export function renderCapNote(totalCount: number, shownCount: number): string {
  return totalCount > shownCount
    ? `\n\n_Showing the top ${shownCount} of ${totalCount} rows._`
    : '';
}

/** Formats an integer with thousands separators, or `n/a` when absent. */
export function formatInt(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'n/a'
    : value.toLocaleString('en-US');
}

/** Formats a 0–1 ratio as a one-decimal percentage, or `n/a` when absent. */
export function formatRatio(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'n/a'
    : `${(value * 100).toFixed(1)}%`;
}

/** Formats a dollar amount to two decimals, or `n/a` when absent. */
export function formatUsd(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'n/a'
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

/** Formats seconds as the largest sensible unit (s, m, h, d), or `n/a` when absent. */
export function formatSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'n/a';
  if (value < 60) return `${value.toFixed(0)}s`;
  if (value < 3600) return `${(value / 60).toFixed(1)}m`;
  if (value < 86400) return `${(value / 3600).toFixed(1)}h`;
  return `${(value / 86400).toFixed(1)}d`;
}

/** Formats milliseconds, deferring to {@link formatSeconds} from one second up. */
export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'n/a';
  if (value < 1000) return `${value.toFixed(0)}ms`;
  return formatSeconds(value / 1000);
}

/** Sorts a copy of `rows` by `count` descending (ties broken by original order) and caps it. */
export function takeTopByCount<T extends { readonly count: number }>(
  rows: readonly T[],
  limit: number = TABLE_ROW_LIMIT,
): { readonly shown: readonly T[]; readonly total: number } {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  return { shown: sorted.slice(0, limit), total: rows.length };
}

/** Formats a {@link WindowCount} with the strategy that produced it. */
export function formatWindowCount(value: WindowCount): string {
  return `${formatInt(value.count)} (source: ${value.source})`;
}
