import * as React from 'react';
import { resolveRunningIndicatorCopy } from '../data/chat-run-phase-copy';
import { ChatRunPhase } from '../types';
import type { ChatRunPhase as ChatRunPhaseType } from '../types';

export interface RunningIndicatorProps {
  /**
   * A specific subject for the phase (e.g. a tool name for `runningTool`, a
   * model name for `waiting`), composed into the label when present.
   */
  readonly detail?: string | null;
  /** Milliseconds the turn has been in flight; drives the slow-wait hint. */
  readonly elapsedMs?: number;
  /**
   * Overrides the resolved primary label entirely. Escape hatch for callers
   * that already have a bespoke string; normally omit and let {@link phase}
   * drive the copy.
   */
  readonly label?: string;
  /** Coarse phase of the in-flight turn. Defaults to `waiting`. */
  readonly phase?: ChatRunPhaseType;
}

/** Subtle in-progress affordance shown until the turn's terminal event lands. */
export const RunningIndicator = (
  props: RunningIndicatorProps,
): React.ReactElement => {
  const { detail, elapsedMs, label, phase = ChatRunPhase.waiting } = props;

  // Hooks

  // Setup
  const copy = resolveRunningIndicatorCopy({ detail, elapsedMs, phase });
  const primary = label ?? copy.label;

  // Handlers

  // Markup
  return (
    <span
      aria-live="polite"
      className="text-muted-foreground flex flex-col gap-0.5 text-xs"
      data-testid="ChatTurnTimeline-running"
      role="status"
    >
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full motion-reduce:animate-none"
        />
        {primary}
      </span>
      {copy.hint ? (
        <span className="text-muted-foreground/70 pl-3">{copy.hint}</span>
      ) : null}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit
};
