import {
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useIsHydrated } from '~/global/hooks/useIsHydrated';
import { formatRunTime } from '~/routing/plans/utils/format-run-time';

export interface PlanRunTimeProps {
  readonly className?: string;
  /** An ISO timestamp from the run row; null/unparseable renders the copy fallback. */
  readonly value: string | null | undefined;
}

/**
 * @description A plan-run time as `<time>`: absolute UTC on the server and the hydrating render,
 * relative plus local time once hydrated (see {@link formatRunTime}), with UTC in a tooltip. It
 * does not tick; the label is as fresh as the last render.
 */
export const PlanRunTime = (props: PlanRunTimeProps): React.ReactElement => {
  const { className, value } = props;

  // Hooks
  const hydrated = useIsHydrated();

  // Setup
  const { iso, label, utcLabel } = formatRunTime(value, {
    hydrated,
    now: undefined,
  });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (iso === null) {
    return (
      <span
        className={cn('text-muted-foreground', className)}
        data-testid="PlanRunTime"
      >
        {label}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <time
          className={cn('tabular-nums', className)}
          data-testid="PlanRunTime"
          dateTime={iso}
        >
          {label}
        </time>
      </TooltipTrigger>
      <TooltipContent>{utcLabel}</TooltipContent>
    </Tooltip>
  );
};
