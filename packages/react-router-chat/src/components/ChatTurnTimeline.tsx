import * as React from 'react';
import { ChatActivityGroup } from './ChatActivityGroup';
import { ChatMessageBody } from './ChatMessageBody';
import { ChatThinkingBlock } from './ChatThinkingBlock';
import { ChatToolCall } from './ChatToolCall';
import { ChatToolCallGroup } from './ChatToolCallGroup';
import { ChatTurnUsageSummary } from './ChatTurnUsageSummary';
import { RunningIndicator } from './RunningIndicator';
import { deriveRunPhaseFromEvents } from '../run-phase';
import { buildTurnTimeline, foldTurnActivity } from '../turn-tool-groups';
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

  // Hooks

  // Setup
  const isDone = events.some((event) => event.kind === 'usage');
  const ordered = React.useMemo(
    () => [...events].sort((a, b) => a.sortOrder - b.sortOrder),
    [events],
  );
  // Two-level fold: runs of consecutive tool events become groups, then any
  // adjacent run of those groups and thinking blocks collapses into one
  // activity row — so a long agentic turn reads as a line, not a flood.
  const items = React.useMemo(
    () => foldTurnActivity(buildTurnTimeline(ordered)),
    [ordered],
  );
  // While the turn is still in flight, name what it is currently doing (running
  // a tool, thinking, …) instead of a generic spinner.
  const runPhase = React.useMemo(
    () => deriveRunPhaseFromEvents(ordered),
    [ordered],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-1" data-testid="ChatTurnTimeline">
      {items.map((item) => {
        if (item.kind === 'activity') {
          const first = item.items[0];
          const anchor =
            first === undefined
              ? 0
              : first.kind === 'tools'
                ? (first.tools[0]?.sortOrder ?? 0)
                : first.event.sortOrder;

          return <ChatActivityGroup group={item} key={`activity-${anchor}`} />;
        }

        if (item.kind === 'tools') {
          const first = item.tools[0];
          const key = `tools-${first?.sortOrder ?? 0}`;

          // A lone tool renders as a single card; a run of ≥2 folds into a group.
          return item.tools.length === 1 && first !== undefined ? (
            <ChatToolCall event={first} key={key} />
          ) : (
            <ChatToolCallGroup key={key} tools={item.tools} />
          );
        }

        const { event } = item;
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
          case 'usage':
            return <ChatTurnUsageSummary event={event} key={key} />;
          default:
            return null;
        }
      })}
      {isDone ? null : (
        <RunningIndicator detail={runPhase.detail} phase={runPhase.phase} />
      )}
    </div>
  );
};
