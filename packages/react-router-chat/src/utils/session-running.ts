import { isRecord } from '@openthrottle/nodejs-utils';

import type { ChatMessage, ChatTurnToolEvent } from '../types';
import { CHAT_TOOL_STATUS } from '../types';

/** Tool names Claude uses to launch a subagent. */
const AGENT_TOOL_NAMES: readonly string[] = ['agent', 'task'];

/** What the Running section shows for one in-flight tool call. */
export interface RunningToolItem {
  /** Subagent description (or type) for an agent call; the tool name otherwise. */
  readonly key: string;
  readonly label: string;
}

/** The in-flight turn split into plain tools and subagents. */
export interface SessionRunningSummary {
  readonly agents: readonly RunningToolItem[];
  readonly message: ChatMessage | undefined;
  readonly tools: readonly RunningToolItem[];
}

/**
 * @description The assistant message a running turn is filling: the thread's
 * last assistant message. `pending` is not used because it clears as soon as
 * the first event streams in. Callers pair this with the host's streaming flag.
 */
export const findInFlightMessage = (
  messages: readonly ChatMessage[],
): ChatMessage | undefined => {
  return messages.findLast((message) => message.role === 'assistant');
};

/** Whether a tool call launches a subagent (Claude's `Task` / `Agent`). */
export const isAgentTool = (event: ChatTurnToolEvent): boolean => {
  return AGENT_TOOL_NAMES.includes(event.name.toLowerCase());
};

/**
 * @description Label for a subagent call from its arguments: `description`,
 * else `subagent_type`, else the tool name. Malformed or absent args fall back
 * to the name.
 */
export const describeAgentCall = (event: ChatTurnToolEvent): string => {
  if (event.argsJson === null) {
    return event.name;
  }
  try {
    const parsed: unknown = JSON.parse(event.argsJson);
    if (!isRecord(parsed)) {
      return event.name;
    }
    for (const field of ['description', 'subagent_type']) {
      const value = parsed[field];
      if (typeof value === 'string' && value.trim() !== '') {
        return value.trim();
      }
    }
  } catch {
    return event.name;
  }

  return event.name;
};

/**
 * @description Running tool calls and subagents of the in-flight message, in
 * event order. With no assistant message the lists are empty.
 */
export const summarizeSessionRunning = (
  messages: readonly ChatMessage[],
): SessionRunningSummary => {
  const message = findInFlightMessage(messages);
  const running = [...(message?.events ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(
      (event): event is ChatTurnToolEvent =>
        event.kind === 'tool' && event.status === CHAT_TOOL_STATUS.running,
    );
  const toItem = (event: ChatTurnToolEvent): RunningToolItem => {
    const label = isAgentTool(event) ? describeAgentCall(event) : event.name;

    return { key: event.callId ?? `${event.name}-${event.sortOrder}`, label };
  };

  return {
    agents: running.filter(isAgentTool).map(toItem),
    message,
    tools: running.filter((event) => !isAgentTool(event)).map(toItem),
  };
};

/** Compact duration: `42s`, `3m 05s`, `1h 02m`. Negative input reads as 0s. */
export const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
};
