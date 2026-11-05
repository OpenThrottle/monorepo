import type { ChatRunPhase as ChatRunPhaseType } from '../types';
import { ChatRunPhase } from '../types';

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
