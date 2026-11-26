'use client';

import * as React from 'react';

import { DIFF_LINE_TONES, DIFF_VIEW_EMPTY_LABEL } from '../data/diff-view';
import { classifyDiffLines } from '../utils/classifyDiffLine';
import { cn } from '../utils/cn';

export interface DiffViewProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** Unified diff text, as `git diff` prints it. */
  readonly patch: string;
}

/**
 * @description Renders unified patch text with line-level tones: added lines in the success
 * tone, removed lines in destructive, hunk headers muted. Dependency-free; the caller bounds its
 * height (it scrolls on both axes) and decides what an empty or binary file shows.
 */
export const DiffView = (props: DiffViewProps): React.ReactElement => {
  const { className, patch, ...rest } = props;

  // Hooks
  const lines = React.useMemo(() => {
    return classifyDiffLines(patch);
  }, [patch]);

  // Setup

  // Handlers

  // Markup
  const rows = lines.map((line, index) => {
    return (
      <div
        className={cn('px-2 whitespace-pre', DIFF_LINE_TONES[line.kind])}
        data-kind={line.kind}
        data-testid="DiffView-line"
        key={index}
      >
        {line.text === '' ? ' ' : line.text}
      </div>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit
  if (lines.length === 0) {
    return (
      <div
        className={cn('text-muted-foreground p-2 text-xs', className)}
        data-testid="DiffView"
        {...rest}
      >
        {DIFF_VIEW_EMPTY_LABEL}
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-auto font-mono text-xs leading-5', className)}
      data-testid="DiffView"
      {...rest}
    >
      <div className="min-w-max">{rows}</div>
    </div>
  );
};
