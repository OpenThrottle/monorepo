import { toast } from '@openthrottle/react-router-shadcn';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import { planRunJobDetailPath } from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowRunHistoryRowActionsProps {
  readonly bullmqJobId: string | null;
  readonly runId: string;
}

/**
 * @description The ⋯ menu on a Run history row: Open job (only when the run has a BullMQ job) and
 * Copy run id. PR and editor links stay inline in the row's provenance cell; Kill and Settle stay
 * in the plan toolbar.
 */
export const PlanWorkflowRunHistoryRowActions = (
  props: PlanWorkflowRunHistoryRowActionsProps,
): React.ReactElement => {
  const { bullmqJobId, runId } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.history.actions;

  // Handlers
  const handleCopyRunId = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(runId);
      toast.success(copy.copiedToast);
    } catch {
      toast.error(copy.copyFailedToast);
    }
  };

  // Markup
  const openJob: GlobalPopoverAction[] =
    bullmqJobId === null
      ? []
      : [
          {
            id: 'openJob',
            kind: 'link',
            label: copy.openJob,
            to: planRunJobDetailPath(bullmqJobId),
          },
        ];
  const actions: GlobalPopoverAction[] = [
    ...openJob,
    {
      id: 'copyRunId',
      kind: 'select',
      label: copy.copyRunId,
      onSelect: () => {
        void handleCopyRunId();
      },
    },
  ];

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={`${copy.menuAriaLabelPrefix} ${runId}`}
      testId={`PlanWorkflowRunHistoryRowActions-${runId}`}
    />
  );
};
