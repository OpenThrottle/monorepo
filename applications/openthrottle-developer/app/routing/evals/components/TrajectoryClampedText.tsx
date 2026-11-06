import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { TRAJECTORY_CLAMP_CHARS } from '~/routing/evals/config/defaults';
import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import { clampTrajectoryText } from '~/routing/evals/utils/formatters';

export interface TrajectoryClampedTextProps {
  readonly className?: string;
  /** Lines shown before the expand control appears. */
  readonly maxLines: number;
  /** Monospace for tool output and JSON; proportional for prose. */
  readonly mono: boolean;
  readonly text: string;
}

/**
 * @description Long text cut to `maxLines` until expanded. The cut happens in
 * JS (a string slice), not CSS, so a large observation adds nothing to the DOM
 * until a reader asks for it; the toggle is a real button with
 * `aria-expanded` and is absent when nothing was cut.
 */
export const TrajectoryClampedText = (
  props: TrajectoryClampedTextProps,
): React.ReactElement => {
  const { className, maxLines, mono, text } = props;

  // Hooks
  const [expanded, setExpanded] = React.useState(false);
  const contentId = React.useId();

  // Setup
  const { isClamped, lineCount, visible } = clampTrajectoryText(text, {
    maxChars: TRAJECTORY_CLAMP_CHARS,
    maxLines,
  });
  const shown = expanded || !isClamped ? text : `${visible}…`;
  const { collapse, expand, lines } = TRAJECTORY_TIMELINE_COPY;
  const toggleLabel = expanded ? collapse : `${expand} (${lineCount} ${lines})`;

  // Handlers
  const onToggle = (): void => {
    setExpanded((current) => {
      return !current;
    });
  };

  // Markup
  const toggle = (
    <Button
      aria-controls={contentId}
      aria-expanded={expanded}
      className="h-auto px-0 py-1"
      onClick={onToggle}
      size="sm"
      type="button"
      variant="link"
    >
      {toggleLabel}
    </Button>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('min-w-0', className)}
      data-testid="TrajectoryClampedText"
    >
      <pre
        className={cn(
          'text-sm break-words whitespace-pre-wrap',
          mono ? 'font-mono text-xs' : 'font-sans',
        )}
        id={contentId}
      >
        {shown}
      </pre>
      {isClamped ? toggle : null}
    </div>
  );
};
