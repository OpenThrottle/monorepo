import * as React from 'react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { buildBadgeLabel, buildRows } from '../utils/chat-turn-usage-summary';
import { hasUsageCounts } from '../usage';
import type { ChatTurnUsageEvent } from '../types';

export interface ChatTurnUsageSummaryProps {
  readonly event: ChatTurnUsageEvent;
}

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

  // Hooks

  // Setup
  const hasError = event.error !== null && event.error.trim() !== '';
  const usage = event.usage;
  const rows = usage !== undefined ? buildRows(usage) : [];

  // Handlers

  // Markup

  // Life Cycle

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
