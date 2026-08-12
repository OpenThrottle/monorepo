import { ChatToolStatus } from './types';
import type { ChatTurnEvent, ChatTurnToolEvent } from './types';

/** A run of two or more consecutive tool events, folded for display. */
export interface TurnTimelineToolGroup {
  readonly kind: 'tools';
  readonly tools: readonly ChatTurnToolEvent[];
}

/** Any single non-tool event (text/thinking/usage/session), rendered as-is. */
export interface TurnTimelineEventItem {
  readonly event: ChatTurnEvent;
  readonly kind: 'event';
}

/** One render slot in the turn timeline. @public */
export type TurnTimelineItem = TurnTimelineEventItem | TurnTimelineToolGroup;

/**
 * Fold an already-`sortOrder`-ordered event list into render slots: runs of
 * consecutive `tool` events become a single {@link TurnTimelineToolGroup}
 * (even a run of one — the renderer decides whether to group or show a lone
 * card); any non-tool event breaks the run and passes through as an `event`
 * slot. Pure and render-time only — no state-shape change.
 *
 * @public
 */
export const buildTurnTimeline = (
  events: readonly ChatTurnEvent[],
): readonly TurnTimelineItem[] => {
  const items: TurnTimelineItem[] = [];
  let run: ChatTurnToolEvent[] = [];

  const flush = (): void => {
    if (run.length > 0) {
      items.push({ kind: 'tools', tools: run });
      run = [];
    }
  };

  for (const event of events) {
    if (event.kind === 'tool') {
      run.push(event);
      continue;
    }
    flush();
    items.push({ event, kind: 'event' });
  }
  flush();

  return items;
};

/**
 * Aggregate status for a folded tool group, in precedence order: any still
 * `running` → running (the group is live), else any `failed` → failed, else
 * `succeeded`. Empty groups report `succeeded`. Drives the group's summary pill.
 *
 * @public
 */
export const aggregateToolStatus = (
  tools: readonly ChatTurnToolEvent[],
): ChatToolStatus => {
  if (tools.some((tool) => tool.status === ChatToolStatus.running)) {
    return ChatToolStatus.running;
  }
  if (tools.some((tool) => tool.status === ChatToolStatus.failed)) {
    return ChatToolStatus.failed;
  }
  return ChatToolStatus.succeeded;
};

/**
 * The "active" step a collapsed group surfaces: the most recent still-running
 * tool, else the last tool in the run. Returns null only for an empty group.
 *
 * @public
 */
export const activeToolOf = (
  tools: readonly ChatTurnToolEvent[],
): ChatTurnToolEvent | null => {
  const lastRunning = tools
    .filter((tool) => tool.status === ChatToolStatus.running)
    .at(-1);

  return lastRunning ?? tools.at(-1) ?? null;
};
