import type { ChatTokenUsage } from '../types';
import { formatTokenCount, formatUsageCost } from '../usage';

/** One label/value pair in the tooltip breakdown. */
export interface UsageRow {
  readonly label: string;
  readonly value: string;
}

/**
 * Build the ordered breakdown rows for whichever fields the backend reported.
 * Kept out of {@link ChatTurnUsageSummary} per the repo's component/utils split.
 * @public
 */
export const buildRows = (usage: ChatTokenUsage): readonly UsageRow[] => {
  const rows: UsageRow[] = [];

  if (usage.inputTokens !== undefined) {
    rows.push({ label: 'Input', value: formatTokenCount(usage.inputTokens) });
  }
  if (usage.outputTokens !== undefined) {
    rows.push({ label: 'Output', value: formatTokenCount(usage.outputTokens) });
  }
  if (usage.cacheReadTokens !== undefined) {
    rows.push({
      label: 'Cache read',
      value: formatTokenCount(usage.cacheReadTokens),
    });
  }
  if (usage.cacheWriteTokens !== undefined) {
    rows.push({
      label: 'Cache write',
      value: formatTokenCount(usage.cacheWriteTokens),
    });
  }
  if (usage.totalTokens !== undefined) {
    rows.push({ label: 'Total', value: formatTokenCount(usage.totalTokens) });
  }

  const cost = formatUsageCost(usage.costUsd);
  if (cost !== undefined) {
    rows.push({ label: 'Cost', value: cost });
  }
  if (usage.model !== undefined) {
    rows.push({ label: 'Model', value: usage.model });
  }

  return rows;
};

/**
 * Compact badge label: `↑ 1.2k · ↓ 340`, falling back to total or cost alone.
 * Kept out of {@link ChatTurnUsageSummary} per the repo's component/utils split.
 * @public
 */
export const buildBadgeLabel = (usage: ChatTokenUsage): string => {
  const parts: string[] = [];

  if (usage.inputTokens !== undefined) {
    parts.push(`↑ ${formatTokenCount(usage.inputTokens)}`);
  }
  if (usage.outputTokens !== undefined) {
    parts.push(`↓ ${formatTokenCount(usage.outputTokens)}`);
  }
  if (parts.length === 0 && usage.totalTokens !== undefined) {
    parts.push(`Σ ${formatTokenCount(usage.totalTokens)}`);
  }

  const cost = formatUsageCost(usage.costUsd);
  if (parts.length === 0 && cost !== undefined) {
    parts.push(cost);
  }

  return parts.join(' · ');
};
