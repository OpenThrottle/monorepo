import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import { TriangleAlertIcon } from 'lucide-react';
import * as React from 'react';

import { TRAJECTORY_VIEWER_COPY } from '~/routing/evals/data/data.copy';

export interface TrajectoryErrorsProps {
  readonly className?: string;
  /** `extra.openthrottle.errors`: what the runner saw go wrong. Never empty here. */
  readonly errors: readonly string[];
}

/**
 * @description The run-level errors OpenThrottle recorded for a trajectory,
 * shown above the timeline so a reader sees them before reading the steps.
 */
export const TrajectoryErrors = (
  props: TrajectoryErrorsProps,
): React.ReactElement => {
  const { className, errors } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const items = errors.map((error, index) => {
    return (
      <li className="font-mono text-xs break-words" key={`${index}-${error}`}>
        {error}
      </li>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Alert
      className={cn(className)}
      data-testid="TrajectoryErrors"
      variant="destructive"
    >
      <TriangleAlertIcon />
      <AlertTitle>{TRAJECTORY_VIEWER_COPY.errorsHeading}</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">{items}</ul>
      </AlertDescription>
    </Alert>
  );
};
