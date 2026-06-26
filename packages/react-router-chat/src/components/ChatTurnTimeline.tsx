import * as React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Markdown,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown } from 'lucide-react';
import { ChatMessageBody } from './ChatMessageBody';
import { ChatThinkingBlock } from './ChatThinkingBlock';
import { ChatToolCall } from './ChatToolCall';
import { formatJsonPayload } from '../utils/index';
import type { ChatTurnEvent, ChatTurnUsageEvent } from '../types';

export interface ChatTurnTimelineProps {
  /** Structured, ordered events for an assistant turn. */
  readonly events: readonly ChatTurnEvent[];
}

/** Collapsed token/usage summary from the terminal usage event. */
const ChatTurnUsageSummary = (props: {
  readonly event: ChatTurnUsageEvent;
}): React.ReactElement | null => {
  const { event } = props;
  const usage = formatJsonPayload(event.usageJson);
  const hasError = event.error !== null && event.error.trim() !== '';

  // 🔌 Short Circuit
  if (hasError) {
    return (
      <p className="text-destructive text-xs break-words" role="alert">
        {event.error}
      </p>
    );
  }

  if (usage === null) {
    return null;
  }

  // Markup
  return (
    <Collapsible className="text-muted-foreground" data-testid="ChatTurnUsage">
      <CollapsibleTrigger
        className="flex items-center gap-1 text-[0.7rem] font-medium [&[data-state=open]>svg]:rotate-180"
        data-testid="ChatTurnUsage-trigger"
      >
        <ChevronDown
          aria-hidden="true"
          className="h-3 w-3 shrink-0 transition-transform duration-200"
        />
        <span>Usage</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Markdown
          className="text-[0.7rem] break-words [&_pre]:whitespace-pre-wrap"
          content={usage}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};

/** Subtle in-progress affordance shown until the turn's terminal event lands. */
const RunningIndicator = (): React.ReactElement => (
  <p
    aria-live="polite"
    className="text-muted-foreground flex items-center gap-1.5 text-xs"
    data-testid="ChatTurnTimeline-running"
    role="status"
  >
    <span
      aria-hidden="true"
      className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full motion-reduce:animate-none"
    />
    Working…
  </p>
);

/**
 * @description Renders an assistant turn as an ordered timeline that interleaves
 * thinking blocks, tool cards, and streamed text segments in true emission
 * order (by `sortOrder`). A subtle running indicator shows until the terminal
 * `usage` event lands; usage is summarized in a collapsed footer. Text segments
 * keep markdown rendering. Use only when structured `events` are present;
 * callers fall back to the flat `body` otherwise.
 *
 * @publicApi
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
