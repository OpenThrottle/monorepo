/**
 * @description Reasoning-effort vocabulary and the per-CLI mapping onto each agent CLI's own flag
 * values. This is the single mapping table: the Ralph/plan-run drivers (`buildShellCommand`) and the
 * chat composer's argv builders in `@openthrottle/openthrottle-agentic-utils` both consume it, so
 * the two surfaces can never drift. Every mapper returns `undefined` for an omitted level; the
 * caller then emits no flag and the CLI keeps its own default. A CLI with no reasoning knob
 * (cursor, antigravity) has no mapper and ignores the level.
 */

/**
 * @description Reasoning-effort levels a run can request (the chat composer's vocabulary).
 * @public
 */
export const DRIVER_REASONING_EFFORTS = {
  extraHigh: 'extraHigh',
  high: 'high',
  low: 'low',
  max: 'max',
  medium: 'medium',
  ultra: 'ultra',
} as const;

/**
 * @description One of the {@link DRIVER_REASONING_EFFORTS} values.
 * @public
 */
export type DriverReasoningEffort =
  (typeof DRIVER_REASONING_EFFORTS)[keyof typeof DRIVER_REASONING_EFFORTS];

/**
 * @description Maps a level onto claude's `--effort` vocabulary (`low`/`medium`/`high`/`xhigh`/
 * `max`), or `undefined` to omit the flag. `extraHigh` → `xhigh`; both `max` and `ultra` → `max`
 * (claude's ceiling).
 * @public
 */
export function claudeEffortFlag(
  reasoning: DriverReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case DRIVER_REASONING_EFFORTS.low:
      return 'low';
    case DRIVER_REASONING_EFFORTS.medium:
      return 'medium';
    case DRIVER_REASONING_EFFORTS.high:
      return 'high';
    case DRIVER_REASONING_EFFORTS.extraHigh:
      return 'xhigh';
    case DRIVER_REASONING_EFFORTS.max:
    case DRIVER_REASONING_EFFORTS.ultra:
      return 'max';
    default:
      return undefined;
  }
}

/**
 * @description Maps a level onto codex's `model_reasoning_effort` value (`low`/`medium`/`high`), or
 * `undefined` to omit the override. codex/OpenAI cap reasoning at `high`, so
 * `extraHigh`/`max`/`ultra` all clamp to `high`.
 * @public
 */
export function codexReasoningEffort(
  reasoning: DriverReasoningEffort | undefined,
): string | undefined {
  return lowMediumHighEffort(reasoning);
}

/**
 * @description Maps a level onto grok's `--reasoning-effort` value (`low`/`medium`/`high`), or
 * `undefined` to omit the flag. grok exposes the low/medium/high triple, so
 * `extraHigh`/`max`/`ultra` clamp to `high`.
 * @public
 */
export function grokReasoningEffort(
  reasoning: DriverReasoningEffort | undefined,
): string | undefined {
  return lowMediumHighEffort(reasoning);
}

/**
 * @description Maps a level onto an opencode `--variant` token, or `undefined` to omit the flag.
 * Uses opencode's documented `minimal`/`high`/`max` plus OpenAI-style middles: `low`→`low`,
 * `medium`→`medium`, `high`/`extraHigh`→`high`, `max`/`ultra`→`max`.
 * @public
 */
export function opencodeVariant(
  reasoning: DriverReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case DRIVER_REASONING_EFFORTS.low:
      return 'low';
    case DRIVER_REASONING_EFFORTS.medium:
      return 'medium';
    case DRIVER_REASONING_EFFORTS.high:
    case DRIVER_REASONING_EFFORTS.extraHigh:
      return 'high';
    case DRIVER_REASONING_EFFORTS.max:
    case DRIVER_REASONING_EFFORTS.ultra:
      return 'max';
    default:
      return undefined;
  }
}

/** The `low`/`medium`/`high` triple shared by codex and grok; everything above `high` clamps. */
function lowMediumHighEffort(
  reasoning: DriverReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case DRIVER_REASONING_EFFORTS.low:
      return 'low';
    case DRIVER_REASONING_EFFORTS.medium:
      return 'medium';
    case DRIVER_REASONING_EFFORTS.high:
    case DRIVER_REASONING_EFFORTS.extraHigh:
    case DRIVER_REASONING_EFFORTS.max:
    case DRIVER_REASONING_EFFORTS.ultra:
      return 'high';
    default:
      return undefined;
  }
}
