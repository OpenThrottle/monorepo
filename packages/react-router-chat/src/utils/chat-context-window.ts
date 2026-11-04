import type { ChatTokenUsage } from '../types';

/**
 * Fill bands for the context meter: `warning` from 75%, `critical` from 90%.
 * @public
 */
export const CHAT_CONTEXT_WINDOW_TONES = {
  critical: 'critical',
  normal: 'normal',
  warning: 'warning',
} as const;

/** @public */
export type ChatContextWindowTone =
  (typeof CHAT_CONTEXT_WINDOW_TONES)[keyof typeof CHAT_CONTEXT_WINDOW_TONES];

const WARNING_PERCENT = 75;
const CRITICAL_PERCENT = 90;

/**
 * How full the model's context window is, resolved from a usage snapshot.
 * @public
 */
export interface ChatContextWindowUsage {
  /** Rounded fill, clamped to 0–100. */
  readonly percent: number;
  readonly tone: ChatContextWindowTone;
  readonly usedTokens: number;
  readonly windowTokens: number;
}

const toneFor = (percent: number): ChatContextWindowTone => {
  if (percent >= CRITICAL_PERCENT) {
    return CHAT_CONTEXT_WINDOW_TONES.critical;
  }

  return percent >= WARNING_PERCENT
    ? CHAT_CONTEXT_WINDOW_TONES.warning
    : CHAT_CONTEXT_WINDOW_TONES.normal;
};

/**
 * @description The context-window fill carried by `usage`, or `undefined`
 * unless the backend reported both the occupancy (`contextTokens`) and the
 * window size (`contextWindowTokens`). Never estimated from turn totals: those
 * re-count the prompt once per model call.
 * @public
 */
export const resolveContextWindowUsage = (
  usage: ChatTokenUsage,
): ChatContextWindowUsage | undefined => {
  const { contextTokens, contextWindowTokens } = usage;

  if (
    contextTokens === undefined ||
    contextWindowTokens === undefined ||
    contextWindowTokens <= 0
  ) {
    return undefined;
  }

  const ratio = contextTokens / contextWindowTokens;
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));

  return {
    percent,
    tone: toneFor(percent),
    usedTokens: contextTokens,
    windowTokens: contextWindowTokens,
  };
};
