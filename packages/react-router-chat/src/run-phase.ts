import { ChatRunPhase, ChatToolStatus } from './types';
import type {
  ChatRunPhase as ChatRunPhaseType,
  ChatTurnEvent,
  ChatTurnToolEvent,
} from './types';

/** A resolved phase plus an optional subject (tool/model name) for the label. */
export interface ResolvedRunPhase {
  readonly detail: string | null;
  readonly phase: ChatRunPhaseType;
}

/**
 * Derive the running phase from an in-flight assistant turn's events. A tool
 * still `running` is the most informative signal, so it wins (naming the tool);
 * otherwise the latest non-session event decides — `thinking` while reasoning
 * streams, else a generic `waiting`. Pure; safe to call every render.
 *
 * @public
 */
export const deriveRunPhaseFromEvents = (
  events: readonly ChatTurnEvent[],
): ResolvedRunPhase => {
  const runningTool = [...events]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(
      (event): event is ChatTurnToolEvent =>
        event.kind === 'tool' && event.status === ChatToolStatus.running,
    )
    .at(-1);

  if (runningTool !== undefined) {
    return { detail: runningTool.name, phase: ChatRunPhase.runningTool };
  }

  const latest = [...events]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((event) => event.kind !== 'session')
    .at(-1);

  if (latest?.kind === 'thinking') {
    return { detail: null, phase: ChatRunPhase.thinking };
  }

  return { detail: null, phase: ChatRunPhase.waiting };
};

/**
 * Below this many ms since the turn started, the request is still in flight with
 * nothing back — show `connecting`.
 */
export const RUN_PHASE_CONNECTING_UNTIL_MS = 1_500;

/**
 * Once the pre-content wait passes this many ms with nothing streamed, escalate
 * to `stillWorking` so a slow backend never looks stalled.
 */
export const RUN_PHASE_STILL_WORKING_AFTER_MS = 15_000;

/**
 * Coarse phase for the pre-content gap (no events yet), from elapsed ms since
 * the turn was submitted: `connecting` → `waiting` → `stillWorking`. Pure.
 *
 * @public
 */
export const deriveRunPhaseFromElapsed = (
  elapsedMs: number,
): ChatRunPhaseType => {
  if (elapsedMs < RUN_PHASE_CONNECTING_UNTIL_MS) {
    return ChatRunPhase.connecting;
  }
  if (elapsedMs >= RUN_PHASE_STILL_WORKING_AFTER_MS) {
    return ChatRunPhase.stillWorking;
  }
  return ChatRunPhase.waiting;
};
