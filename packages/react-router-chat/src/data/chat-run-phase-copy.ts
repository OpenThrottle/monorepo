import { ChatRunPhase } from '../types';
import type { ChatRunPhase as ChatRunPhaseType } from '../types';

/**
 * Default human label per {@link ChatRunPhase}. Kept out of
 * {@link RunningIndicator} per the repo's component/data split. A phase with a
 * known `detail` (a tool or model name) composes a more specific string in
 * {@link resolveRunningIndicatorCopy}; these are the detail-less fallbacks.
 * @public
 */
export const CHAT_RUN_PHASE_LABEL: Record<ChatRunPhaseType, string> = {
  [ChatRunPhase.connecting]: 'Connecting…',
  [ChatRunPhase.runningTool]: 'Running a tool…',
  [ChatRunPhase.stillWorking]: 'Still working…',
  [ChatRunPhase.thinking]: 'Thinking…',
  [ChatRunPhase.waiting]: 'Waiting for the model…',
};

/**
 * Once a generic wait (`connecting`/`waiting`) has run this long with nothing
 * back, the indicator surfaces a muted "taking longer than usual" hint so a
 * slow backend does not read as a stall. Purely presentational; it does not
 * change the phase itself.
 */
export const RUNNING_INDICATOR_SLOW_HINT_AFTER_MS = 12_000;

/** Muted secondary line shown once {@link RUNNING_INDICATOR_SLOW_HINT_AFTER_MS} elapses. */
export const RUNNING_INDICATOR_SLOW_HINT = 'This is taking longer than usual…';

/** Resolved copy for the running indicator: a primary label and optional hint. */
export interface RunningIndicatorCopy {
  readonly hint: string | null;
  readonly label: string;
}

/**
 * Pure phase → copy resolver for {@link RunningIndicator}. Composes a specific
 * label when a `detail` (tool/model name) is known, otherwise falls back to
 * {@link CHAT_RUN_PHASE_LABEL}. When a generic wait has exceeded
 * {@link RUNNING_INDICATOR_SLOW_HINT_AFTER_MS} it adds a muted `hint`.
 * @public
 */
export const resolveRunningIndicatorCopy = ({
  detail,
  elapsedMs,
  phase,
}: {
  readonly detail?: string | null;
  readonly elapsedMs?: number;
  readonly phase: ChatRunPhaseType;
}): RunningIndicatorCopy => {
  const trimmedDetail = detail?.trim() ? detail.trim() : null;

  const label = ((): string => {
    switch (phase) {
      case ChatRunPhase.runningTool:
        return trimmedDetail
          ? `Running ${trimmedDetail}…`
          : CHAT_RUN_PHASE_LABEL[phase];
      case ChatRunPhase.waiting:
        return trimmedDetail
          ? `Waiting for ${trimmedDetail}…`
          : CHAT_RUN_PHASE_LABEL[phase];
      default:
        return CHAT_RUN_PHASE_LABEL[phase];
    }
  })();

  const isGenericWait =
    phase === ChatRunPhase.connecting || phase === ChatRunPhase.waiting;
  const hint =
    isGenericWait &&
    elapsedMs !== undefined &&
    elapsedMs >= RUNNING_INDICATOR_SLOW_HINT_AFTER_MS
      ? RUNNING_INDICATOR_SLOW_HINT
      : null;

  return { hint, label };
};
