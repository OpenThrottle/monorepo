import * as React from 'react';
import { ChatMessageBody } from './ChatMessageBody';
import { ChatThinkingBlock } from './ChatThinkingBlock';
import { ChatToolCall } from './ChatToolCall';
import { ChatTurnUsageSummary } from './ChatTurnUsageSummary';
import { RunningIndicator } from './RunningIndicator';
import type { ChatTurnEvent } from '../types';

export interface ChatTurnTimelineProps {
  /** Structured, ordered events for an assistant turn. */
  readonly events: readonly ChatTurnEvent[];
}

/**
 * @description Renders an assistant turn as an ordered timeline that interleaves
 * thinking blocks, tool cards, and streamed text segments in true emission
 * order (by `sortOrder`). A subtle running indicator shows until the terminal
 * `usage` event lands; usage is summarized in a collapsed footer. Text segments
 * keep markdown rendering. Use only when structured `events` are present;
 * callers fall back to the flat `body` otherwise.
 *
 * @public
 */
export const ChatTurnTimeline = (
  props: ChatTurnTimelineProps,
): React.ReactElement => {
  const { events } = props;

  // Setup
  const ordered = React.useMemo(
    () => [...events].sort((a, b) => a.sortOrder - b.sortOrder),
    [events],
  );
  const isDone = events.some((event) => event.kind === 'usage');

  // Markup
  return (
    <div className="flex flex-col gap-1" data-testid="ChatTurnTimeline">
      {ordered.map((event) => {
        const key = `${event.kind}-${event.sortOrder}`;

        switch (event.kind) {
          case 'session':
            return null;
          case 'text':
            return (
              <ChatMessageBody body={event.text} key={key} role="assistant" />
            );
          case 'thinking':
            return <ChatThinkingBlock key={key} text={event.text} />;
          case 'tool':
            return <ChatToolCall event={event} key={key} />;
          case 'usage':
            return <ChatTurnUsageSummary event={event} key={key} />;
          default:
            return null;
        }
      })}
      {isDone ? null : <RunningIndicator />}
    </div>
  );
};
