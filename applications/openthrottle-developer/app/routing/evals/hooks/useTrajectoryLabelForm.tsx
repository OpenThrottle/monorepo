import { getActionError } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useFetcher } from 'react-router';

import { TRAJECTORY_LABEL_INTENT } from '~/routing/evals/config/defaults';
import type { TrajectoryVerdict } from '~/routing/evals/types';
import { parseTrajectoryVerdict } from '~/routing/evals/utils/parsers';

export interface UseTrajectoryLabelFormOptions {
  /** Your saved verdict, seeding the choice; `null` when you have not labelled yet. */
  readonly initialVerdict: string | null;
}

export interface UseTrajectoryLabelFormResult {
  /** The last submission's error, from the route action. */
  readonly error: string | undefined;
  readonly isRemoving: boolean;
  readonly isSaving: boolean;
  readonly onRemove: () => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  readonly onVerdictChange: (value: string) => void;
  readonly verdict: TrajectoryVerdict | null;
}

/**
 * @description State and submission for the trajectory label form. Saving and
 * removing go to the viewer route's action through one fetcher, so labelling
 * never navigates; the loader revalidates afterwards and the panel shows the
 * stored label. Pending state is per intent, so Save and Remove each show
 * their own progress.
 */
export const useTrajectoryLabelForm = (
  options: UseTrajectoryLabelFormOptions,
): UseTrajectoryLabelFormResult => {
  const { initialVerdict } = options;

  // Hooks
  const fetcher = useFetcher();
  const [verdict, setVerdict] = React.useState<TrajectoryVerdict | null>(
    parseTrajectoryVerdict(initialVerdict),
  );

  // Setup
  const pendingIntent =
    fetcher.state === 'idle' ? null : fetcher.formData?.get('intent');
  const isSaving = pendingIntent === TRAJECTORY_LABEL_INTENT.label;
  const isRemoving = pendingIntent === TRAJECTORY_LABEL_INTENT.remove;
  const error =
    fetcher.state === 'idle' ? getActionError(fetcher.data) : undefined;

  // Handlers
  const onVerdictChange = (value: string): void => {
    // Radix reports '' when the pressed item is pressed again; keep the choice.
    const next = parseTrajectoryVerdict(value);

    if (next !== null) {
      setVerdict(next);
    }
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void fetcher.submit(event.currentTarget, { method: 'post' });
  };

  const onRemove = (): void => {
    void fetcher.submit(
      { intent: TRAJECTORY_LABEL_INTENT.remove },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    error,
    isRemoving,
    isSaving,
    onRemove,
    onSubmit,
    onVerdictChange,
    verdict,
  };
};
