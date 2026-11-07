/**
 * @description Reads an interactive Claude Code session transcript (`~/.claude/projects/…/<id>.jsonl`)
 * as per-task ATIF trajectories. One session runs a whole plan, so it is cut at the OpenThrottle
 * task boundaries the transcript itself records: a task segment starts at the earliest of
 * `update_task(IN_PROGRESS)`, `claim_plan_messages` and `begin_task_session` for that task id, and
 * ends at `update_task(COMPLETED|BLOCKED|SKIPPED)` plus that task's `git commit` when it follows
 * immediately. Steps between task segments (and plan wrap-up through `settle_plan_run`) are
 * plan-level segments with `taskId: null`. A session that never started an OpenThrottle task yields
 * nothing — that is the privacy boundary (docs/openthrottle/eval-system-adr.md § Decision 2).
 *
 * Session lines share the shape of `claude -p --output-format stream-json` events (`assistant`
 * lines carry content blocks, `user` lines carry tool results), so the stream mapper does the
 * reading. What differs is usage: one API request is written as several `assistant` lines that
 * repeat the same `usage`, so usage is counted once per `requestId`.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { AtifTrajectory } from '../../types/atif.ts';
import type { ConversationStreamChunk } from '../conversation-backend/types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../conversation-backend/types.ts';
import { createStructuredChunkReader } from '../structured-output/chunk-reader.ts';
import { capTrajectory } from './cap-trajectory.ts';
import { chunksToAtif } from './chunks-to-atif.ts';
import { TRAJECTORY_TRANSPORT_BYTES } from './trajectory-record.ts';

/** OpenThrottle MCP tool names end with these, whatever the server alias (`mcp__<alias>__<tool>`). */
const BEGIN_TASK_TOOL = '__begin_task_session';
const CLAIM_MESSAGES_TOOL = '__claim_plan_messages';
const REGISTER_RUN_TOOL = '__register_plan_run';
const SETTLE_RUN_TOOL = '__settle_plan_run';
const UPDATE_TASK_TOOL = '__update_task';

/** Task statuses that open a task segment. */
const START_TASK_STATUS = 'IN_PROGRESS';

/** Task statuses that end a task's work. */
const TERMINAL_TASK_STATUSES: ReadonlySet<string> = new Set([
  'BLOCKED',
  'COMPLETED',
  'SKIPPED',
]);

/** A Bash whose command runs `git commit` is the task's trailing commit. */
const GIT_COMMIT_COMMAND = /\bgit\s+commit\b/;

/** Budget for each embedded subagent, so delegated work cannot crowd out the task itself. */
const SUBAGENT_TRANSPORT_BYTES = 160 * 1024;

interface ToolUse {
  readonly id: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly name: string;
}

const stringOf = (value: unknown): string | undefined => {
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/** Main-thread lines only: older transcripts inline subagent lines flagged `isSidechain`. */
const isMainLine = (event: unknown): event is Record<string, unknown> => {
  return isRecord(event) && event.isSidechain !== true;
};

const toolUsesOf = (event: unknown): readonly ToolUse[] => {
  if (!isRecord(event) || event.type !== 'assistant') {
    return [];
  }

  const message = isRecord(event.message) ? event.message : undefined;
  const content = Array.isArray(message?.content) ? message.content : [];

  return content.flatMap((block: unknown): ToolUse[] => {
    if (!isRecord(block) || block.type !== 'tool_use') {
      return [];
    }

    const id = stringOf(block.id);
    const name = stringOf(block.name);
    const input = isRecord(block.input) ? block.input : {};

    return id === undefined || name === undefined ? [] : [{ id, input, name }];
  });
};

/** A tool result's content as text: a string as-is, or the text parts of a content array. */
const toolResultText = (content: unknown): unknown => {
  if (!Array.isArray(content)) {
    return content;
  }

  return content
    .map((part: unknown) => {
      const isText = isRecord(part) && typeof part.text === 'string';

      return isText ? part.text : '';
    })
    .join('');
};

/** `[{ tool_use_id, content }]` for every tool result on a `user` line. */
const toolResultsOf = (
  event: unknown,
): readonly { readonly content: string; readonly toolUseId: string }[] => {
  if (!isRecord(event) || event.type !== 'user') {
    return [];
  }

  const message = isRecord(event.message) ? event.message : undefined;
  const content = Array.isArray(message?.content) ? message.content : [];

  return content.flatMap((block: unknown) => {
    if (!isRecord(block) || block.type !== 'tool_result') {
      return [];
    }

    const toolUseId = stringOf(block.tool_use_id);
    const text = toolResultText(block.content);
    const isUsable = toolUseId !== undefined && typeof text === 'string';

    return isUsable ? [{ content: text, toolUseId }] : [];
  });
};

/**
 * @description One stretch of a session transcript, as line indexes into the events the caller
 * parsed. `taskId` is the OpenThrottle task for a task segment, or `null` for a plan-level gap /
 * wrap-up. `closed` means a later boundary exists, so the segment will not grow. `toolUseId` is the
 * idempotency key fragment: the task's `begin_task_session` id when present, else the start
 * marker's id (or the first tool-use id in a plan-level segment).
 * @public
 */
export interface ClaudeSessionTaskSegment {
  readonly closed: boolean;
  readonly endIndex: number;
  readonly planId: string | undefined;
  readonly startIndex: number;
  readonly taskId: string | null;
  readonly toolUseId: string;
}

interface TaskMarker {
  readonly index: number;
  readonly planId: string | undefined;
  readonly toolUseId: string;
}

interface TaskBounds {
  readonly begin: TaskMarker | undefined;
  readonly end: TaskMarker | undefined;
  readonly start: TaskMarker;
  readonly taskId: string;
}

interface MutableTaskBounds {
  begin: TaskMarker | undefined;
  end: TaskMarker | undefined;
  start: TaskMarker | undefined;
}

const isCommitBash = (use: ToolUse): boolean => {
  if (use.name !== 'Bash') {
    return false;
  }

  const command = stringOf(use.input.command);

  return command !== undefined && GIT_COMMIT_COMMAND.test(command);
};

/** Exclusive end index after `useIds` have all received a tool result, capped at `stopAt`. */
const exclusiveEndAfterResults = (
  events: readonly unknown[],
  fromIndex: number,
  useIds: ReadonlySet<string>,
  stopAt: number,
): number => {
  if (useIds.size === 0) {
    return Math.min(fromIndex + 1, stopAt);
  }

  const pending = new Set(useIds);
  let end = Math.min(fromIndex + 1, stopAt);

  for (
    let index = fromIndex + 1;
    index < stopAt && pending.size > 0;
    index += 1
  ) {
    if (!isMainLine(events[index])) {
      end = index + 1;
      continue;
    }

    for (const result of toolResultsOf(events[index])) {
      pending.delete(result.toolUseId);
    }

    end = index + 1;
  }

  return end;
};

/**
 * End of a task after its terminal `update_task`, including an immediate trailing `git commit`
 * Bash (and its result) when present before `stopAt`.
 */
const exclusiveEndAfterTerminal = (
  events: readonly unknown[],
  terminal: TaskMarker,
  stopAt: number,
): number => {
  let end = exclusiveEndAfterResults(
    events,
    terminal.index,
    new Set([terminal.toolUseId]),
    stopAt,
  );

  for (let index = end; index < stopAt; index += 1) {
    if (!isMainLine(events[index])) {
      continue;
    }

    const uses = toolUsesOf(events[index]);

    if (uses.length === 0) {
      continue;
    }

    if (!uses.every(isCommitBash)) {
      break;
    }

    end = exclusiveEndAfterResults(
      events,
      index,
      new Set(
        uses.map((use) => {
          return use.id;
        }),
      ),
      stopAt,
    );
    break;
  }

  return end;
};

const firstToolUseIdInRange = (
  events: readonly unknown[],
  startIndex: number,
  endIndex: number,
): string | undefined => {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (!isMainLine(events[index])) {
      continue;
    }

    const [use] = toolUsesOf(events[index]);

    if (use !== undefined) {
      return use.id;
    }
  }

  return undefined;
};

const planIdNear = (
  events: readonly unknown[],
  startIndex: number,
  fallback: string | undefined,
): string | undefined => {
  if (fallback !== undefined) {
    return fallback;
  }

  for (let index = startIndex; index >= 0; index -= 1) {
    if (!isMainLine(events[index])) {
      continue;
    }

    for (const use of toolUsesOf(events[index])) {
      const planId = stringOf(use.input.planId);

      if (planId !== undefined) {
        return planId;
      }
    }
  }

  return undefined;
};

const collectTaskBounds = (
  events: readonly unknown[],
): {
  readonly settleIndex: number | undefined;
  readonly settleToolUseId: string | undefined;
  readonly tasks: readonly TaskBounds[];
} => {
  const byTask = new Map<string, MutableTaskBounds>();
  let settleIndex: number | undefined;
  let settleToolUseId: string | undefined;

  const touch = (taskId: string): MutableTaskBounds => {
    const existing = byTask.get(taskId);

    if (existing !== undefined) {
      return existing;
    }

    const created: MutableTaskBounds = {
      begin: undefined,
      end: undefined,
      start: undefined,
    };
    byTask.set(taskId, created);

    return created;
  };

  const noteStart = (
    taskId: string,
    marker: TaskMarker,
    isBegin: boolean,
  ): void => {
    const entry = touch(taskId);

    if (isBegin && entry.begin === undefined) {
      entry.begin = marker;
    }

    if (entry.start === undefined || marker.index < entry.start.index) {
      entry.start = marker;
    }
  };

  events.forEach((event, index) => {
    if (!isMainLine(event)) {
      return;
    }

    for (const use of toolUsesOf(event)) {
      const planId = stringOf(use.input.planId);
      const marker = { index, planId, toolUseId: use.id };

      if (use.name.endsWith(SETTLE_RUN_TOOL)) {
        settleIndex = index;
        settleToolUseId = use.id;
        continue;
      }

      if (use.name.endsWith(BEGIN_TASK_TOOL)) {
        const taskId = stringOf(use.input.taskId);

        if (taskId !== undefined) {
          noteStart(taskId, marker, true);
        }

        continue;
      }

      if (use.name.endsWith(CLAIM_MESSAGES_TOOL)) {
        const taskId = stringOf(use.input.taskId);

        if (taskId !== undefined) {
          noteStart(taskId, marker, false);
        }

        continue;
      }

      if (!use.name.endsWith(UPDATE_TASK_TOOL)) {
        continue;
      }

      const taskId = stringOf(use.input.id);
      const status = stringOf(use.input.status);

      if (taskId === undefined || status === undefined) {
        continue;
      }

      if (status === START_TASK_STATUS) {
        noteStart(taskId, marker, false);
        continue;
      }

      if (TERMINAL_TASK_STATUSES.has(status)) {
        const entry = touch(taskId);

        if (entry.end === undefined || index > entry.end.index) {
          entry.end = marker;
        }
      }
    }
  });

  const tasks = [...byTask.entries()].flatMap(([taskId, entry]) => {
    if (entry.start === undefined) {
      return [];
    }

    return [
      {
        begin: entry.begin,
        end: entry.end,
        start: entry.start,
        taskId,
      },
    ];
  });

  tasks.sort((left, right) => {
    return left.start.index - right.start.index;
  });

  return { settleIndex, settleToolUseId, tasks };
};

const planLevelSegment = (
  events: readonly unknown[],
  startIndex: number,
  endIndex: number,
  closed: boolean,
  planId: string | undefined,
  toolUseId: string,
): ClaudeSessionTaskSegment | undefined => {
  if (startIndex >= endIndex) {
    return undefined;
  }

  return {
    closed,
    endIndex,
    planId: planIdNear(events, startIndex, planId),
    startIndex,
    taskId: null,
    toolUseId: firstToolUseIdInRange(events, startIndex, endIndex) ?? toolUseId,
  };
};

/**
 * @description The task and plan-level segments in a session's events, in order.
 * @public
 */
export const findClaudeSessionTaskSegments = (
  events: readonly unknown[],
): readonly ClaudeSessionTaskSegment[] => {
  const { settleIndex, settleToolUseId, tasks } = collectTaskBounds(events);

  if (tasks.length === 0) {
    return [];
  }

  const taskSegments: ClaudeSessionTaskSegment[] = tasks.map(
    (task, position) => {
      const nextStart = tasks[position + 1]?.start.index;
      const stopAt = nextStart ?? settleIndex ?? events.length;
      const terminal = task.end;
      let endIndex: number;

      if (terminal !== undefined) {
        endIndex = exclusiveEndAfterTerminal(events, terminal, stopAt);
      } else if (nextStart !== undefined) {
        endIndex = nextStart;
      } else if (settleIndex === undefined) {
        endIndex = events.length;
      } else {
        const settleIds =
          settleToolUseId === undefined ? [] : [settleToolUseId];
        endIndex = exclusiveEndAfterResults(
          events,
          settleIndex,
          new Set(settleIds),
          events.length,
        );
      }

      const closed =
        terminal !== undefined ||
        nextStart !== undefined ||
        settleIndex !== undefined;

      return {
        closed,
        endIndex,
        planId: task.begin?.planId ?? task.start.planId,
        startIndex: task.start.index,
        taskId: task.taskId,
        toolUseId: task.begin?.toolUseId ?? task.start.toolUseId,
      };
    },
  );

  const segments: ClaudeSessionTaskSegment[] = [];

  taskSegments.forEach((segment, position) => {
    const previous = taskSegments[position - 1];

    if (previous !== undefined) {
      const gap = planLevelSegment(
        events,
        previous.endIndex,
        segment.startIndex,
        true,
        previous.planId ?? segment.planId,
        `plan-gap:${previous.toolUseId}:${segment.toolUseId}`,
      );

      if (gap !== undefined) {
        segments.push(gap);
      }
    }

    segments.push(segment);
  });

  const last = taskSegments[taskSegments.length - 1];

  if (last !== undefined && last.closed && last.endIndex < events.length) {
    const wrapUpClosed = settleIndex !== undefined;
    let wrapUpEnd = events.length;

    if (settleIndex !== undefined) {
      const settleIds = settleToolUseId === undefined ? [] : [settleToolUseId];
      wrapUpEnd = exclusiveEndAfterResults(
        events,
        settleIndex,
        new Set(settleIds),
        events.length,
      );
    }

    const wrapUpToolUseId = settleToolUseId ?? `plan-wrap:${last.toolUseId}`;
    const wrapUp = planLevelSegment(
      events,
      last.endIndex,
      Math.max(wrapUpEnd, last.endIndex),
      wrapUpClosed,
      last.planId,
      wrapUpToolUseId,
    );

    if (wrapUp !== undefined) {
      segments.push(wrapUp);
    }
  }

  return segments;
};

/**
 * @description The plan run the session registered, read from the last `register_plan_run`
 * result (a JSON string carrying `run.id`); `undefined` when the events hold none.
 * @public
 */
export const findClaudeSessionPlanRunId = (
  events: readonly unknown[],
): string | undefined => {
  const registerIds = new Set<string>();
  let planRunId: string | undefined;

  for (const event of events) {
    for (const use of toolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_TOOL)) {
        registerIds.add(use.id);
      }
    }

    for (const result of toolResultsOf(event)) {
      if (registerIds.has(result.toolUseId)) {
        planRunId = runIdOf(result.content) ?? planRunId;
      }
    }
  }

  return planRunId;
};

function runIdOf(content: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(content);
    const run = isRecord(parsed) && isRecord(parsed.run) ? parsed.run : {};

    return stringOf(run.id);
  } catch {
    return undefined;
  }
}

/**
 * @description The ids of subagents spawned in these events (`Agent` results record
 * `toolUseResult.agentId`), in order; their transcripts are `subagents/agent-<id>.jsonl`.
 * @public
 */
export const findClaudeSessionSubagentIds = (
  events: readonly unknown[],
): readonly string[] => {
  const ids = events.flatMap((event) => {
    const result = isRecord(event) ? event.toolUseResult : undefined;
    const agentId = isRecord(result) ? stringOf(result.agentId) : undefined;

    return agentId === undefined ? [] : [agentId];
  });

  return [...new Set(ids)];
};

/**
 * @description How a task segment ended, from its last `update_task` call for that task:
 * `completed`, `blocked` or `skipped`, else `unknown`.
 * @public
 */
export const claudeSessionTaskOutcome = (
  events: readonly unknown[],
  taskId: string | null,
): string => {
  if (taskId === null) {
    let settleOutcome = 'unknown';

    for (const event of events) {
      for (const use of toolUsesOf(event)) {
        const status = stringOf(use.input.status);

        if (use.name.endsWith(SETTLE_RUN_TOOL) && status !== undefined) {
          settleOutcome = status.toLowerCase();
        }
      }
    }

    return settleOutcome;
  }

  let outcome = 'unknown';

  for (const event of events) {
    for (const use of toolUsesOf(event)) {
      const status = stringOf(use.input.status);
      const isThisTask = stringOf(use.input.id) === taskId;
      const isTerminal =
        status !== undefined && TERMINAL_TASK_STATUSES.has(status);

      if (use.name.endsWith(UPDATE_TASK_TOOL) && isThisTask && isTerminal) {
        outcome = status.toLowerCase();
      }
    }
  }

  return outcome;
};

/**
 * @description The session events as chunks: the stream mapper's reading, consolidated text, and
 * one usage chunk per `requestId`.
 * @public
 */
export const claudeSessionEventsToChunks = (
  events: readonly unknown[],
): readonly ConversationStreamChunk[] => {
  const reader = createStructuredChunkReader('claude');
  const countedRequests = new Set<string>();

  if (reader === undefined) {
    return [];
  }

  return events.flatMap((event) => {
    if (
      !isRecord(event) ||
      (event.type !== 'assistant' && event.type !== 'user')
    ) {
      return [];
    }

    const chunks = [...reader(event)];
    const requestId = stringOf(event.requestId);
    const message = isRecord(event.message) ? event.message : undefined;
    const isNewRequest =
      requestId !== undefined && !countedRequests.has(requestId);

    if (
      event.type === 'assistant' &&
      isNewRequest &&
      isRecord(message?.usage)
    ) {
      countedRequests.add(requestId);
      chunks.push({
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: { usage: message.usage },
      });
    }

    return chunks;
  });
};

const modelOf = (events: readonly unknown[]): string | undefined => {
  for (const event of events) {
    const message = isRecord(event) ? event.message : undefined;
    const model = isRecord(message) ? stringOf(message.model) : undefined;

    if (model !== undefined && model !== '<synthetic>') {
      return model;
    }
  }

  return undefined;
};

const timestampsOf = (events: readonly unknown[]): readonly number[] => {
  return events.flatMap((event) => {
    const raw = isRecord(event) ? stringOf(event.timestamp) : undefined;
    const time = raw === undefined ? Number.NaN : Date.parse(raw);

    return Number.isNaN(time) ? [] : [time];
  });
};

/** `tool_use_id → agentId` for every Agent result in these events. */
const spawnedAgentByCallId = (
  events: readonly unknown[],
): ReadonlyMap<string, string> => {
  const byCallId = new Map<string, string>();

  for (const event of events) {
    const result = isRecord(event) ? event.toolUseResult : undefined;
    const agentId = isRecord(result) ? stringOf(result.agentId) : undefined;
    const [toolResult] = toolResultsOf(event);

    if (agentId !== undefined && toolResult !== undefined) {
      byCallId.set(toolResult.toolUseId, agentId);
    }
  }

  return byCallId;
};

/**
 * Stamps ATIF's `subagent_trajectory_ref` on each result that spawned an embedded subagent, so a
 * reader can place the subagent under the call that started it rather than guessing from text.
 */
const withSubagentRefs = (
  trajectory: AtifTrajectory,
  spawned: ReadonlyMap<string, string>,
  embeddedIds: ReadonlySet<string>,
): AtifTrajectory => {
  const steps = trajectory.steps.map((step) => {
    if (step.observation === undefined) {
      return step;
    }

    const results = step.observation.results.map((result) => {
      const callId = result.source_call_id;
      const agentId = callId === undefined ? undefined : spawned.get(callId);
      const isEmbedded = agentId !== undefined && embeddedIds.has(agentId);

      return isEmbedded
        ? { ...result, subagent_trajectory_ref: { trajectory_id: agentId } }
        : result;
    });

    return { ...step, observation: { results } };
  });

  return { ...trajectory, steps };
};

/**
 * @description A subagent spawned inside the task, with its own transcript events.
 * @public
 */
export interface ClaudeSessionSubagent {
  readonly agentId: string;
  readonly events: readonly unknown[];
}

/**
 * @description Everything needed to turn one task segment into a trajectory.
 * @public
 */
export interface BuildClaudeSessionTrajectoryInput {
  readonly agentVersion: string;
  readonly openthrottle: Readonly<Record<string, unknown>>;
  /** The segment's events (`events.slice(segment.startIndex, segment.endIndex)`). */
  readonly segmentEvents: readonly unknown[];
  readonly subagents: readonly ClaudeSessionSubagent[];
  /** OpenThrottle task id, or `null` for a plan-level segment. */
  readonly taskId: string | null;
}

/**
 * @description A task segment's trajectory, capped for transport, with the run facts.
 * @public
 */
export interface ClaudeSessionTrajectoryRecord {
  readonly durationMs: number | null;
  readonly model: string | undefined;
  readonly outcome: string;
  readonly trajectory: AtifTrajectory;
  readonly trajectoryJson: string;
  readonly truncated: boolean;
}

const subagentTrajectory = (
  subagent: ClaudeSessionSubagent,
  agentVersion: string,
): { readonly trajectory: AtifTrajectory; readonly truncated: boolean } => {
  const trajectory = chunksToAtif({
    agentName: 'claude',
    agentVersion,
    chunks: claudeSessionEventsToChunks(subagent.events.filter(isRecord)),
    driverId: 'claude',
    modelName: modelOf(subagent.events),
    openthrottle: { agentId: subagent.agentId },
    prompt: undefined,
    reportsToolCalls: true,
  });
  const capped = capTrajectory(
    { ...trajectory, trajectory_id: subagent.agentId },
    { observationBytes: 16 * 1024, totalBytes: SUBAGENT_TRANSPORT_BYTES },
  );

  return { trajectory: capped.trajectory, truncated: capped.truncated };
};

/**
 * @description Builds one task segment's trajectory, subagents embedded, capped to the transport
 * limit. Returns `undefined` when the segment produced no chunks at all.
 * @public
 */
export const buildClaudeSessionTrajectory = (
  input: BuildClaudeSessionTrajectoryInput,
): ClaudeSessionTrajectoryRecord | undefined => {
  const mainEvents = input.segmentEvents.filter(isMainLine);
  const chunks = claudeSessionEventsToChunks(mainEvents);

  if (chunks.length === 0) {
    return undefined;
  }

  const model = modelOf(mainEvents);
  const main = chunksToAtif({
    agentName: 'claude',
    agentVersion: input.agentVersion,
    chunks,
    driverId: 'claude',
    modelName: model,
    openthrottle: input.openthrottle,
    prompt: undefined,
    reportsToolCalls: true,
  });
  const subagents = input.subagents.map((subagent) => {
    return subagentTrajectory(subagent, input.agentVersion);
  });
  let embedded: AtifTrajectory = main;

  if (subagents.length > 0) {
    const embeddedIds = new Set(
      input.subagents.map((subagent) => {
        return subagent.agentId;
      }),
    );

    embedded = {
      ...withSubagentRefs(main, spawnedAgentByCallId(mainEvents), embeddedIds),
      subagent_trajectories: subagents.map((subagent) => {
        return subagent.trajectory;
      }),
    };
  }

  const capped = capTrajectory(embedded, {
    observationBytes: 16 * 1024,
    totalBytes: TRAJECTORY_TRANSPORT_BYTES,
  });
  const times = timestampsOf(mainEvents);
  const durationMs =
    times.length < 2 ? null : Math.max(...times) - Math.min(...times);

  return {
    durationMs,
    model,
    outcome: claudeSessionTaskOutcome(mainEvents, input.taskId),
    trajectory: capped.trajectory,
    trajectoryJson: JSON.stringify(capped.trajectory),
    truncated:
      capped.truncated ||
      subagents.some((subagent) => {
        return subagent.truncated;
      }),
  };
};
