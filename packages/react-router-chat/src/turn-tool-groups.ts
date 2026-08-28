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

/**
 * A run of two or more adjacent tool groups / thinking blocks — everything an
 * agent did between two pieces of visible prose — folded into one row.
 *
 * @public
 */
export interface TurnTimelineActivityGroup {
  /** The constituent slots, in emission order. */
  readonly items: readonly TurnTimelineItem[];
  readonly kind: 'activity';
  /** Aggregate status across every nested tool (see {@link aggregateToolStatus}). */
  readonly status: ChatToolStatus;
  /** How many thinking segments the run contains. */
  readonly thinkingCount: number;
  /** How many tool calls the run contains, across all nested groups. */
  readonly toolCount: number;
}

/** One top-level render slot after the second-level activity fold. @public */
export type TurnTimelineSlot = TurnTimelineActivityGroup | TurnTimelineItem;

/**
 * Minimum number of adjacent slots before a run is worth wrapping. A lone tool
 * group or a lone thinking block renders better on its own than nested one
 * level deeper.
 *
 * @public
 */
export const ACTIVITY_GROUP_MIN_SLOTS = 2;

const isActivitySlot = (item: TurnTimelineItem): boolean =>
  item.kind === 'tools' || item.event.kind === 'thinking';

// A thinking event with no reasoning renders nothing (see ChatThinkingBlock),
// so it must not pad a run toward the fold threshold either.
const isRenderableSlot = (item: TurnTimelineItem): boolean =>
  item.kind === 'tools' ||
  item.event.kind !== 'thinking' ||
  item.event.text.trim() !== '';

const toolsOf = (items: readonly TurnTimelineItem[]): ChatTurnToolEvent[] =>
  items.flatMap((item) => (item.kind === 'tools' ? [...item.tools] : []));

/**
 * Second-level fold over {@link buildTurnTimeline}'s output: any run of adjacent
 * tool groups and thinking blocks — i.e. everything between two text/usage/
 * session events — collapses into one {@link TurnTimelineActivityGroup}, so a
 * long agentic turn reads as a single "activity" row rather than an endless
 * stack. Text, usage and session slots break the run and pass through
 * unchanged, as do runs shorter than {@link ACTIVITY_GROUP_MIN_SLOTS}. Pure and
 * render-time only.
 *
 * @public
 */
export const foldTurnActivity = (
  items: readonly TurnTimelineItem[],
): readonly TurnTimelineSlot[] => {
  const slots: TurnTimelineSlot[] = [];
  let run: TurnTimelineItem[] = [];

  const flush = (): void => {
    if (run.length >= ACTIVITY_GROUP_MIN_SLOTS) {
      const tools = toolsOf(run);
      slots.push({
        items: run,
        kind: 'activity',
        status: aggregateToolStatus(tools),
        thinkingCount: run.filter((item) => item.kind === 'event').length,
        toolCount: tools.length,
      });
    } else {
      slots.push(...run);
    }
    run = [];
  };

  for (const item of items) {
    if (!isRenderableSlot(item)) {
      continue;
    }
    if (isActivitySlot(item)) {
      run.push(item);
      continue;
    }
    flush();
    slots.push(item);
  }
  flush();

  return slots;
};
