/**
 * @description Presentation helpers for a scheduled-run's token usage + cost. Formatting reuses the
 * shared `@openthrottle/agentic-token-usage` formatters (re-exported by `@openthrottle/react-router-chat`)
 * so the runs table + run detail render counts/costs identically to the chat UI. Kept out of the
 * components (component-shape audit) and modeled on react-router-chat's own chat-turn-usage-summary.
 */

import {
  formatTokenCount,
  formatUsageCost,
} from '@openthrottle/react-router-chat';

/** The per-run token/cost fields the UI surfaces — a structural subset of the run fragments. */
export interface RunUsage {
  readonly cacheReadTokens?: number | null;
  readonly cacheWriteTokens?: number | null;
  readonly costUsd?: number | null;
  readonly inputTokens?: number | null;
  readonly outputTokens?: number | null;
  readonly reasoningTokens?: number | null;
  readonly totalTokens?: number | null;
}

/** A labeled, formatted token/cost line for the detail breakdown + table tooltip. */
export interface RunUsageRow {
  readonly label: string;
  readonly value: string;
}

const EM_DASH = '—';

/** True when the run reported at least one token count or a cost. */
export const hasRunUsage = (usage: RunUsage): boolean =>
  usage.inputTokens != null ||
  usage.outputTokens != null ||
  usage.cacheReadTokens != null ||
  usage.cacheWriteTokens != null ||
  usage.reasoningTokens != null ||
  usage.totalTokens != null ||
  usage.costUsd != null;

/** Compact total-token display for the runs table; em dash when unreported. */
export const formatRunTotalTokens = (usage: RunUsage): string =>
  usage.totalTokens == null ? EM_DASH : formatTokenCount(usage.totalTokens);

/** Cost display for the runs table + detail; em dash when unpriced. */
export const formatRunCost = (usage: RunUsage): string =>
  formatUsageCost(usage.costUsd ?? undefined) ?? EM_DASH;

/** Per-kind token rows, only for the kinds the backend actually reported (for the detail breakdown). */
export const runUsageRows = (usage: RunUsage): RunUsageRow[] => {
  const rows: RunUsageRow[] = [];
  const push = (label: string, value: number | null | undefined): void => {
    if (value != null) {
      rows.push({ label, value: formatTokenCount(value) });
    }
  };

  push('Input', usage.inputTokens);
  push('Output', usage.outputTokens);
  push('Cache read', usage.cacheReadTokens);
  push('Cache write', usage.cacheWriteTokens);
  push('Reasoning', usage.reasoningTokens);
  push('Total', usage.totalTokens);

  return rows;
};

/** Single-line usage breakdown for a table cell's `title` tooltip; undefined when no usage. */
export const runUsageTooltip = (usage: RunUsage): string | undefined => {
  const parts = runUsageRows(usage).map((row) => `${row.label} ${row.value}`);
  const cost = formatUsageCost(usage.costUsd ?? undefined);
  if (cost != null) {
    parts.push(`Cost ${cost}`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
};

/** Pretty-print the run's JSON settings snapshot for display; null when absent/unparseable. */
export const formatSettingsSnapshot = (
  json: string | null | undefined,
): string | null => {
  if (json == null || json === '') {
    return null;
  }

  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // Fall back to the raw string rather than dropping it entirely.
    return json;
  }
};
