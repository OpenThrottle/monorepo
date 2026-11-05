import type { RunningIndicatorCopy } from '../data/data.chat-run-phase-copy';
import {
  CHAT_RUN_PHASE_LABEL,
  RUNNING_INDICATOR_SLOW_HINT,
  RUNNING_INDICATOR_SLOW_HINT_AFTER_MS,
} from '../data/data.chat-run-phase-copy';
import type { ChatRunPhase as ChatRunPhaseType } from '../types';
import { ChatRunPhase } from '../types';

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
    const defaultLabel = CHAT_RUN_PHASE_LABEL[phase];

    if (!trimmedDetail) {
      return defaultLabel;
    }

    switch (phase) {
      case ChatRunPhase.runningTool:
        return `Running ${trimmedDetail}…`;
      case ChatRunPhase.waiting:
        return `Waiting for ${trimmedDetail}…`;
      default:
        return defaultLabel;
    }
  })();

  const isGenericWait =
    phase === ChatRunPhase.connecting || phase === ChatRunPhase.waiting;
  const isSlowWait =
    isGenericWait &&
    elapsedMs !== undefined &&
    elapsedMs >= RUNNING_INDICATOR_SLOW_HINT_AFTER_MS;
  const hint = isSlowWait ? RUNNING_INDICATOR_SLOW_HINT : null;

  return { hint, label };
};
