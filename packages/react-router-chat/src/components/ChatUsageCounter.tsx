import * as React from 'react';
import clsx from 'clsx';
import { resolveTotalTokens } from '../utils/chat-usage-counter';
import type { ChatTokenUsage } from '../types';
import { formatTokenCount, formatUsageCost, hasUsageCounts } from '../usage';

export interface ChatUsageCounterProps {
  readonly className?: string;
  /**
   * When true the counter reads as a live running total (à la Claude's
   * composer) with a subtle pulsing dot; when false it is a settled
   * conversation total. Purely presentational.
   */
  readonly streaming?: boolean;
  /** Cumulative session usage; the counter renders nothing when it has no counts. */
  readonly usage: ChatTokenUsage;
}

/**
 * Compact, muted running token counter for the composer footer — the
 * Claude-style "N tokens" readout. Presentational: the consumer owns the
 * cumulative {@link ChatTokenUsage} (summed across turns via `sumUsage`) and
 * passes it in. Renders nothing when nothing was reported.
 *
 * @public
 */
export const ChatUsageCounter = (
  props: ChatUsageCounterProps,
): React.ReactElement | null => {
  const { className, streaming = false, usage } = props;

  // Hooks

  // Setup
  const total = resolveTotalTokens(usage);
  const cost = formatUsageCost(usage.costUsd);
  const parts: string[] = [];

  if (total !== undefined) {
    parts.push(`${formatTokenCount(total)} tokens`);
  }
  if (cost !== undefined) {
    parts.push(cost);
  }

  const label = parts.join(' · ');
  const intent = streaming ? 'Live token usage' : 'Conversation total';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!hasUsageCounts(usage) || label === '') {
    return null;
  }

  return (
    <span
      aria-label={`${intent}: ${label}`}
      className={clsx(
        'text-muted-foreground inline-flex items-center gap-1.5 text-[0.7rem] tabular-nums',
        className,
      )}
      data-testid="ChatUsageCounter"
      title={intent}
    >
      {streaming ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current opacity-70 motion-safe:animate-pulse"
          data-testid="ChatUsageCounter-live"
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
};
