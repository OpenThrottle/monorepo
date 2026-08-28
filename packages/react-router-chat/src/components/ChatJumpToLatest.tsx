import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import { ArrowDown } from 'lucide-react';

export interface ChatJumpToLatestProps {
  readonly className?: string;
  /** Whether the view is currently following the bottom. Hidden when it is. */
  readonly isPinned: boolean;
  /** Scroll to the bottom and re-engage following. */
  readonly onJump: () => void;
}

const JUMP_LABEL = 'Jump to latest';

/**
 * @description The way back down. Appears only once the reader has scrolled
 * away from a live thread — while the view is following the bottom there is
 * nothing to jump to, so it stays out of the way entirely. Clicking it scrolls
 * to the newest message and re-engages following, which is also what sending a
 * message does; the control just makes that reachable without typing.
 *
 * Renders as a plain pill and takes its placement from the surface that hosts
 * it, since the composer sits in a different place in a docked page than in a
 * dialog.
 *
 * @public
 */
export const ChatJumpToLatest = (
  props: ChatJumpToLatestProps,
): React.ReactElement | null => {
  const { className, isPinned, onJump } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isPinned) {
    return null;
  }

  return (
    <Button
      aria-label={JUMP_LABEL}
      className={clsx('rounded-full shadow-md', className)}
      data-testid="ChatJumpToLatest"
      onClick={onJump}
      size="sm"
      type="button"
      variant="secondary"
    >
      <ArrowDown aria-hidden="true" />
      {JUMP_LABEL}
    </Button>
  );
};
