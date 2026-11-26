import type { ChatMessage, ChatTokenUsage } from '../types';
import { formatTokenCount, formatUsageCost, sumUsage } from '../usage';
import type { ChatContextWindowUsage } from './chat-context-window';
import { resolveContextWindowUsage } from './chat-context-window';
import { fillTemplate } from './fillTemplate';
import { resolveTotalTokens } from './resolveTotalTokens';

/** One label/value row in the Context section, keyed for stable test ids. */
export interface SessionContextRow {
  readonly key: SessionContextRowKey;
  readonly value: string;
}

/** Rows the Context section can show, in display order. */
export type SessionContextRowKey =
  | 'cacheRead'
  | 'cacheWrite'
  | 'cost'
  | 'input'
  | 'output'
  | 'reasoning'
  | 'total';

/** Everything the Context section shows, derived from the thread. */
export interface SessionContextSummary {
  /** True when no turn has reported any usage. */
  readonly isEmpty: boolean;
  /** Last turn's total tokens, formatted; undefined when it reported none. */
  readonly lastTurnTotal: string | undefined;
  /** Cumulative rows; only fields the backend reported. */
  readonly rows: readonly SessionContextRow[];
  /** Window fill from the latest turn that reported it. */
  readonly window: ChatContextWindowUsage | undefined;
}

const collectTurnUsages = (
  messages: readonly ChatMessage[],
): readonly ChatTokenUsage[] => {
  const usages: ChatTokenUsage[] = [];

  for (const message of messages) {
    for (const event of message.events ?? []) {
      if (event.kind === 'usage' && event.usage !== undefined) {
        usages.push(event.usage);
      }
    }
  }

  return usages;
};

const buildRows = (usage: ChatTokenUsage): readonly SessionContextRow[] => {
  const rows: SessionContextRow[] = [];
  const counts: ReadonlyArray<
    readonly [SessionContextRowKey, number | undefined]
  > = [
    ['input', usage.inputTokens],
    ['output', usage.outputTokens],
    ['cacheRead', usage.cacheReadTokens],
    ['cacheWrite', usage.cacheWriteTokens],
    ['reasoning', usage.reasoningTokens],
    ['total', resolveTotalTokens(usage)],
  ];

  for (const [key, count] of counts) {
    if (count !== undefined) {
      rows.push({ key, value: formatTokenCount(count) });
    }
  }

  const cost = formatUsageCost(usage.costUsd);
  if (cost !== undefined) {
    rows.push({ key: 'cost', value: cost });
  }

  return rows;
};

/**
 * @description Derive the Context section from the thread's `usage` events:
 * cumulative counts via `sumUsage`, the window fill from the LATEST turn that
 * reported it (never a sum, which re-counts the prompt), and the last turn's
 * total. No per-category breakdown: no driver reports one.
 * @public
 */
export const summarizeSessionContext = (
  messages: readonly ChatMessage[],
): SessionContextSummary => {
  const usages = collectTurnUsages(messages);
  const lastUsage = usages.at(-1);
  const empty: ChatTokenUsage = {};
  const total = usages.reduce((sum, usage) => sumUsage(sum, usage), empty);
  let window: ChatContextWindowUsage | undefined;

  for (const usage of usages) {
    window = resolveContextWindowUsage(usage) ?? window;
  }

  const lastTotal =
    lastUsage === undefined ? undefined : resolveTotalTokens(lastUsage);

  const rows = buildRows(total);

  return {
    isEmpty: rows.length === 0 && window === undefined,
    lastTurnTotal:
      lastTotal === undefined ? undefined : formatTokenCount(lastTotal),
    rows,
    window,
  };
};

/**
 * @description The "used / window · N%" label for a window fill, built from the
 * section's copy template.
 * @public
 */
export const formatWindowLabel = (
  template: string,
  fill: ChatContextWindowUsage,
): string => {
  return fillTemplate(template, {
    percent: String(fill.percent),
    used: formatTokenCount(fill.usedTokens),
    window: formatTokenCount(fill.windowTokens),
  });
};
