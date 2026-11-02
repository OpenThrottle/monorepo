/**
 * @description Open/mode state for the toolbar's {@link PlanRunDialog}, the resolved
 * repositories it names the checkout from, and the success toast fired when it enqueues
 * or schedules a run. The dialog owns its own submit fetcher, so the one-click Run's
 * toast (in `usePlanToolbar`) never sees these runs; this hook is their equivalent.
 */
import { toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import type {
  PlanRunDialogMode,
  PlanRunDialogSubmission,
} from '~/routing/plans/types';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { formatScheduledInstant } from '~/routing/plans/utils/plan-run-schedule';
import { addRecentWorkspacePath } from '~/routing/plans/utils/workspace-path';

export interface UsePlanToolbarRunDialogOptions {
  /** @description The loader's deferred repositories; the checkout is named from them once resolved. */
  readonly repositories?: Promise<
    readonly PlanRunConfigRepositoryFieldsFragment[]
  >;
  /** @description Recorded as a recent workspace path when a run is enqueued. */
  readonly workingDirectory?: string;
}

export interface UsePlanToolbarRunDialogResult {
  readonly mode: PlanRunDialogMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly onOpenDialog: (mode: PlanRunDialogMode) => void;
  readonly onSubmitted: (submission: PlanRunDialogSubmission) => void;
  readonly open: boolean;
  /** @description Resolved repositories; empty until the deferred promise settles. */
  readonly repositories: readonly PlanRunConfigRepositoryFieldsFragment[];
}

export const usePlanToolbarRunDialog = (
  options: UsePlanToolbarRunDialogOptions,
): UsePlanToolbarRunDialogResult => {
  const { repositories, workingDirectory } = options;

  // Hooks
  const [mode, setMode] = React.useState<PlanRunDialogMode>('run');
  const [open, setOpen] = React.useState(false);
  const emptyRepositories = React.useMemo(
    () => Promise.resolve<readonly PlanRunConfigRepositoryFieldsFragment[]>([]),
    [],
  );
  const resolvedRepositories = usePlanDeferredValue(
    repositories ?? emptyRepositories,
  );

  // Setup

  // Handlers
  const onOpenDialog = (nextMode: PlanRunDialogMode): void => {
    setMode(nextMode);
    setOpen(true);
  };

  const onSubmitted = (submission: PlanRunDialogSubmission): void => {
    if (submission.mode === 'schedule') {
      toast.success(PLAN_TOOLBAR_COPY.runScheduledToast, {
        description: PLAN_TOOLBAR_COPY.runScheduledToastDescription(
          formatScheduledInstant(submission.result.scheduledFor),
        ),
      });

      return;
    }

    if (workingDirectory != null && workingDirectory.trim() !== '') {
      addRecentWorkspacePath(workingDirectory.trim());
    }

    toast.success(PLAN_TOOLBAR_COPY.runQueuedToast, {
      description: PLAN_TOOLBAR_COPY.runQueuedToastDescription(
        submission.result.jobId,
        PLAN_RUN_BULLMQ_QUEUE_NAME,
        planRunJobDetailPath(submission.result.jobId),
      ),
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    mode,
    onOpenChange: setOpen,
    onOpenDialog,
    onSubmitted,
    open,
    repositories: resolvedRepositories ?? [],
  };
};
