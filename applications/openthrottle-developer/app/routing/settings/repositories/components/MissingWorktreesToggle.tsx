import { cn, Label, Switch } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import { MISSING_WORKTREES_COPY } from '~/routing/settings/repositories/data/data.copy';
import {
  SHOW_MISSING_PARAM,
  SHOW_MISSING_VALUE,
} from '~/routing/settings/repositories/utils/missing-rows';

export interface MissingWorktreesToggleProps {
  className?: string;
  /** How many registered worktrees the last scan could not find on disk. */
  count: number;
  /** Whether those rows are currently shown. */
  showMissing: boolean;
}

/**
 * @description Reveals registered worktrees whose folders are gone. Off by default so the
 * table lists what is actually on disk; the state lives in the URL so it survives the
 * revalidation a prune triggers. Turning it on or off resets paging, since the row count changes.
 * Renders nothing on a machine with no missing worktrees.
 */
export const MissingWorktreesToggle = (
  props: MissingWorktreesToggleProps,
): React.ReactElement | null => {
  const { className, count, showMissing } = props;

  // Hooks
  const id = React.useId();
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleCheckedChange = React.useCallback(
    (checked: boolean) => {
      const next = new URLSearchParams(searchParams);

      if (checked) {
        next.set(SHOW_MISSING_PARAM, SHOW_MISSING_VALUE);
      } else {
        next.delete(SHOW_MISSING_PARAM);
      }
      next.delete('page');

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // Nothing to reveal — but stay visible while on, so it can be switched back off.
  if (count === 0 && !showMissing) return null;

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      data-testid="MissingWorktreesToggle"
      title={MISSING_WORKTREES_COPY.showMissingTitle}
    >
      <Switch
        checked={showMissing}
        id={id}
        onCheckedChange={handleCheckedChange}
        size="sm"
      />
      <Label className="text-xs font-normal whitespace-nowrap" htmlFor={id}>
        {MISSING_WORKTREES_COPY.showMissingLabel(count)}
      </Label>
    </div>
  );
};
