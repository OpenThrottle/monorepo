import * as React from 'react';
import classnames from 'classnames';
import { Badge, CardDescription } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { Link } from 'react-router';
import type { PlanDetailIndexLoaderQuery } from '~/__generated__/graphql';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  buildWorkflowRalphDebugBundleText,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

type RecentRun =
  PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'][number];

export interface PlanWorkflowRunTransparencyProps {
  readonly canonicalWorkflowCommand: string;
  readonly className?: string;
  readonly planId: string;
  readonly recentPlanRuns: readonly RecentRun[];
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workflowTimeout: string;
}

const formatFinishedOn = (finishedOn: number | null | undefined): string => {
  if (finishedOn == null || Number.isNaN(finishedOn)) {
    return '—';
  }

  return new Date(finishedOn).toISOString();
};

/**
 * @description Plan detail: workflow-ralph argv preview, copyable debug bundle, and recent completed plan runs (job id → queue).
 */
export const PlanWorkflowRunTransparency = (
  props: PlanWorkflowRunTransparencyProps,
): React.ReactElement => {
  const {
    canonicalWorkflowCommand,
    className,
    planId,
    recentPlanRuns,
    workflowInput,
    workflowTimeout,
  } = props;

  const debugBundleText = React.useMemo(
    () =>
      buildWorkflowRalphDebugBundleText({
        iterationTimeoutText: workflowTimeout,
        planId,
        workflowInput,
      }),
    [planId, workflowInput, workflowTimeout],
  );

  return (
    <div
      className={classnames(
        'border-border bg-muted/30 space-y-3 rounded-md border p-3',
        className,
      )}
      data-testid="PlanWorkflowRunTransparency"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <CardDescription className="text-xs sm:max-w-xl">
          Same flags as{' '}
          <code className="text-xs">pnpm exec workflow-ralph --help</code> and{' '}
          <span className="font-mono text-[0.7rem]">
            tools/workflows/README.md
          </span>
          . Toolbar “Add to Queue” sends{' '}
          <span className="font-medium text-foreground">
            enqueueRalphTuning
          </span>{' '}
          only; the CLI preview can include{' '}
          <code className="text-[0.65rem]">--task</code> for local runs.
        </CardDescription>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <OpenThrottleClipboard
              label="Copy canonical workflow-ralph command"
              text={canonicalWorkflowCommand}
            />
          </Badge>
          <Badge variant="outline">
            <OpenThrottleClipboard
              label="Copy workflow debug bundle"
              text={debugBundleText.trim()}
            />
          </Badge>
          <Badge variant="secondary">
            <Link
              className="text-xs underline-offset-4 hover:underline"
              to={`/queues/${encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME)}`}
            >
              Queue: {PLAN_RUN_BULLMQ_QUEUE_NAME}
            </Link>
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-muted-foreground w-full min-w-[28rem] border-collapse text-xs">
          <caption className="caption-bottom pt-2 text-left text-[0.65rem]">
            Recent plan runs (metrics). Follow a job id to inspect payload and
            state in the queue UI.
          </caption>
          <thead>
            <tr className="border-border border-b text-left">
              <th className="text-foreground py-1.5 pr-2 font-medium">
                Job id
              </th>
              <th className="text-foreground py-1.5 pr-2 font-medium">
                Finished (UTC)
              </th>
              <th className="text-foreground py-1.5 font-medium">
                RSS end (MB)
              </th>
            </tr>
          </thead>
          <tbody>
            {recentPlanRuns.length === 0 ? (
              <tr>
                <td className="py-2 text-[0.7rem]" colSpan={3}>
                  No completed runs recorded for this plan yet. After you
                  enqueue from the toolbar, finished jobs appear here with a
                  link to the job detail view.
                </td>
              </tr>
            ) : (
              recentPlanRuns.map((row) => (
                <tr
                  className="border-border/60 border-b last:border-0"
                  key={row.jobId}
                >
                  <td className="py-1.5 pr-2 align-top font-mono text-[0.65rem]">
                    <Link
                      className="text-primary underline-offset-2 hover:underline"
                      to={planRunJobDetailPath(row.jobId)}
                    >
                      {row.jobId}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2 align-top font-mono text-[0.65rem]">
                    {formatFinishedOn(row.finishedOn)}
                  </td>
                  <td className="py-1.5 align-top font-mono text-[0.65rem]">
                    {row.taskRunMetrics?.atEnd.rssMb != null
                      ? row.taskRunMetrics.atEnd.rssMb.toFixed(1)
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
