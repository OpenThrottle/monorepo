import * as React from 'react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { ChatTokenUsage } from '../types';
import type { ChatTurnUsageEvent } from '../types';
import { formatTokenCount, formatUsageCost, hasUsageCounts } from '../usage';

export interface ChatTurnUsageSummaryProps {
  readonly event: ChatTurnUsageEvent;
}

/** One label/value pair in the tooltip breakdown. */
interface UsageRow {
  readonly label: string;
  readonly value: string;
}

/** Build the ordered breakdown rows for whichever fields the backend reported. */
const buildRows = (usage: ChatTokenUsage): readonly UsageRow[] => {
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

/** Compact badge label: `↑ 1.2k · ↓ 340`, falling back to total or cost alone. */
const buildBadgeLabel = (usage: ChatTokenUsage): string => {
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

/**
 * Per-turn token/usage readout: a compact {@link Badge} (e.g. `↑ 1.2k · ↓ 340`)
 * with a hover {@link Tooltip} breakdown (input / output / cache / total / cost
 * / model). Best-effort — when the backend reported no counts the badge renders
 * nothing (an error still surfaces as an alert). The full breakdown is mirrored
 * into the badge's `aria-label` so it is available to assistive tech without a
 * hover.
 */
export const ChatTurnUsageSummary = (
  props: ChatTurnUsageSummaryProps,
): React.ReactElement | null => {
  const { event } = props;

  // Setup
  const hasError = event.error !== null && event.error.trim() !== '';
  const usage = event.usage;
  const rows = usage !== undefined ? buildRows(usage) : [];

  // 🔌 Short Circuit
  if (hasError) {
    return (
      <p className="text-destructive text-xs break-words" role="alert">
        {event.error}
      </p>
    );
  }

  // Nothing reported → render nothing (no zeros, no empty badge).
  if (!hasUsageCounts(usage) || usage === undefined || rows.length === 0) {
    return null;
  }

  const badgeLabel = buildBadgeLabel(usage);
  const ariaLabel = `Token usage — ${rows
    .map((row) => `${row.label}: ${row.value}`)
    .join(', ')}`;

  // Markup
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild={true}>
          <Badge
            aria-label={ariaLabel}
            className="cursor-default gap-1 font-medium tabular-nums"
            color="slate"
            data-testid="ChatTurnUsage"
            size="xs"
          >
            {badgeLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent data-testid="ChatTurnUsage-breakdown" side="top">
          <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs tabular-nums">
            {rows.map((row) => (
              <React.Fragment key={row.label}>
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right">{row.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
