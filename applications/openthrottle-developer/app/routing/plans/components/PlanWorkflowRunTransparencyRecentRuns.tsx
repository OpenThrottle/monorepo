import * as React from 'react';
import { Link } from 'react-router';
import type { PlanDetailIndexLoaderQuery } from '~/__generated__/graphql';
import {
  formatWorkflowRalphExecutionBackendLabel,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { formatFinishedOn } from '~/routing/plans/utils/plan-workflow-run-transparency';

export type RecentRun =
  PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'][number];

export interface PlanWorkflowRunTransparencyRecentRunsProps {
  recentPlanRuns: RecentRun[];
}

/**
 * @description Recent enqueue-history table for
 * {@link PlanWorkflowRunTransparency}: completed jobs for the plan with the
 * runner that executed each run and a link into the queue job detail view.
 */
export const PlanWorkflowRunTransparencyRecentRuns = (
  props: PlanWorkflowRunTransparencyRecentRunsProps,
): React.ReactElement => {
  const { recentPlanRuns } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="overflow-x-auto">
      <table className="text-muted-foreground mt-8 w-full min-w-[28rem] border-collapse text-xs">
        <caption className="caption-bottom pt-2 text-left text-[0.65rem]">
          Recent enqueue history (completed jobs for this plan). Each row shows
          which runner executed that run (one backend per job). After “Add to
          Queue” or “Run plan”, finished workers appear here — open a job id for
          payload and state in the queue UI.
        </caption>
        <thead>
          <tr className="border-border border-b text-left">
            <th className="text-foreground py-1.5 pr-2 font-medium">Job id</th>
            <th className="text-foreground py-1.5 pr-2 font-medium">Runner</th>
            <th className="text-foreground py-1.5 pr-2 font-medium">
              Finished (UTC)
            </th>
            <th className="text-foreground py-1.5 font-medium">RSS end (MB)</th>
          </tr>
        </thead>
        <tbody>
          {recentPlanRuns.length === 0 ? (
            <tr>
              <td className="py-2 text-[0.7rem]" colSpan={4}>
                No completed runs recorded for this plan yet. After you enqueue
                from the toolbar, finished jobs appear here with a link to the
                job detail view.
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
                <td className="py-1.5 pr-2 align-top text-[0.65rem]">
                  {formatWorkflowRalphExecutionBackendLabel(
                    row.executionBackend,
                  )}
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
  );
};
