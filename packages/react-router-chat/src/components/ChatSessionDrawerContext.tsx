import * as React from 'react';

import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatMessage } from '../types';
import {
  formatWindowLabel,
  summarizeSessionContext,
} from '../utils/session-context';
import { ChatContextMeterBar } from './ChatContextMeterBar';

export interface ChatSessionDrawerContextProps {
  readonly messages: readonly ChatMessage[];
}

/**
 * @description Body of the session drawer's Context section: the context-window
 * fill (only when the driver reports it), cumulative token rows for whichever
 * counts were reported, and the last turn's total. No per-category breakdown,
 * because no driver reports one.
 *
 * @public
 */
export const ChatSessionDrawerContext = (
  props: ChatSessionDrawerContextProps,
): React.ReactElement => {
  const { messages } = props;

  // Hooks
  const summary = React.useMemo(() => {
    return summarizeSessionContext(messages);
  }, [messages]);

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.context;
  const { lastTurnTotal, rows, window } = summary;
  const windowLabel =
    window === undefined ? '' : formatWindowLabel(copy.window, window);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (summary.isEmpty) {
    return (
      <p
        className="text-muted-foreground p-4 text-xs"
        data-testid="ChatSessionDrawerContext"
      >
        {copy.empty}
      </p>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 p-4"
      data-testid="ChatSessionDrawerContext"
    >
      {window !== undefined && (
        <div
          aria-label={windowLabel}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={window.percent}
          className="flex flex-col gap-1"
          data-testid="ChatSessionDrawerContext-window"
          role="meter"
        >
          <ChatContextMeterBar className="w-full" fill={window} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {windowLabel}
          </span>
        </div>
      )}
      <dl className="flex flex-col gap-0.5 text-xs tabular-nums">
        {rows.map((row) => (
          <div
            className="flex justify-between gap-2"
            data-testid={`ChatSessionDrawerContext-row-${row.key}`}
            key={row.key}
          >
            <dt className="text-muted-foreground">{copy.rows[row.key]}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
        {lastTurnTotal !== undefined && (
          <div
            className="flex justify-between gap-2"
            data-testid="ChatSessionDrawerContext-lastTurn"
          >
            <dt className="text-muted-foreground">{copy.lastTurn}</dt>
            <dd>{lastTurnTotal}</dd>
          </div>
        )}
      </dl>
    </div>
  );
};
