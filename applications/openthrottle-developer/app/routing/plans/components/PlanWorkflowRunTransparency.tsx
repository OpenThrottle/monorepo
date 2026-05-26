import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { Link } from 'react-router';
import type { PlanDetailIndexLoaderQuery } from '~/__generated__/graphql';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  buildWorkflowRalphDebugBundleText,
  buildWorkflowRalphTuningDiffLabels,
  formatWorkflowRalphExecutionBackendLabel,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { buildPlanRunSnapshotDiffLabels } from '~/routing/plans/utils/plan-run-config-snapshot-ui';

type RecentRun =
  PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'][number];

type PlanRunAuditRow =
  PlanDetailIndexLoaderQuery['planRunsByPlanId'][number];

export interface PlanWorkflowRunTransparencyProps {
  canonicalWorkflowCommand: string;
  planId: string;
  planRunAuditRows: PlanRunAuditRow[];
  recentPlanRuns: RecentRun[];
  workflowInput: WorkflowRalphRunOptionsInput;
  workflowTimeout: string;
  workingDirectory: string;
}

const formatFinishedOn = (finishedOn: number | null | undefined): string => {
  if (finishedOn == null || Number.isNaN(finishedOn)) {
    return '—';
  }

  return new Date(finishedOn).toISOString();
};

/**
 * @description Plan detail: canonical CLI copy, debug bundle (includes argv segments), diff vs
 * Configuration reset-to-defaults, recent completed plan runs (job id → queue), and queue link.
 */
export const PlanWorkflowRunTransparency = (
  props: PlanWorkflowRunTransparencyProps,
): React.ReactElement => {
  const {
    canonicalWorkflowCommand,
    planId,
    planRunAuditRows,
    recentPlanRuns,
    workflowInput,
    workingDirectory,
    workflowTimeout,
  } = props;

  // Hooks
  const debugBundleText = React.useMemo(
    () =>
      buildWorkflowRalphDebugBundleText({
        iterationTimeoutText: workflowTimeout,
        planId,
        workflowInput,
      }),
    [planId, workflowInput, workflowTimeout],
  );

  const tuningDiffLabels = React.useMemo(
    () => buildWorkflowRalphTuningDiffLabels(workflowInput, workflowTimeout),
    [workflowInput, workflowTimeout],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="mt-8">
      <CardHeader className="pb-0!" />
      <CardContent>
        <div
          data-testid="PlanWorkflowRunTransparency"
          id="plan-workflow-run-transparency"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <CardDescription className="text-xs">
              Flags match{' '}
              <code className="text-xs">pnpm exec workflow-ralph --help</code>{' '}
              and{' '}
              <span className="font-mono text-[0.7rem]">
                tools/workflows/README.md
              </span>
              .{' '}
              <strong className="font-medium text-foreground">Required</strong>{' '}
              CLI target (one of):{' '}
              <code className="text-[0.65rem]">--plan &lt;uuid&gt;</code> or{' '}
              <code className="text-[0.65rem]">--task &lt;uuid&gt;</code>.
              Toolbar “Add to Queue” enqueues a{' '}
              <span className="font-medium text-foreground">plan-scoped</span>{' '}
              worker job with one execution backend for the whole run (Cursor or
              Claude Code); use <code className="text-[0.65rem]">--task</code>{' '}
              in the preview when you run{' '}
              <code className="text-[0.65rem]">workflow-ralph</code> locally in
              task-centric mode.
            </CardDescription>
            <div className="flex flex-wrap gap-2 my-4">
              <Badge color="accent">
                <OpenThrottleClipboard
                  label="Copy canonical workflow-ralph command"
                  text={canonicalWorkflowCommand}
                />
              </Badge>
              <Badge color="accent">
                <OpenThrottleClipboard
                  label="Copy workflow debug bundle"
                  text={debugBundleText.trim()}
                />
              </Badge>
              <Badge color="accent">
                <Link
                  className="text-xs underline-offset-4 hover:underline"
                  to={`/queues/${encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME)}`}
                >
                  Queue: {PLAN_RUN_BULLMQ_QUEUE_NAME}
                </Link>
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
              Canonical argv (local CLI)
            </p>
            <pre
              className="bg-background text-foreground border-border max-h-36 overflow-x-auto overflow-y-auto rounded border p-2 font-mono text-[0.65rem] leading-relaxed whitespace-pre-wrap break-all"
              data-testid="PlanWorkflowRunTransparency-canonical-cli"
            >
              {canonicalWorkflowCommand}
            </pre>
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
              vs Configuration reset (CLI argv)
            </p>
            {tuningDiffLabels.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Tuning matches reset-to-defaults for this target — minimal flags
                after{' '}
                <code className="text-[0.65rem]">pnpm exec workflow-ralph</code>{' '}
                (only <code className="text-[0.65rem]">--plan</code> or{' '}
                <code className="text-[0.65rem]">--task</code> plus ids).
              </p>
            ) : (
              <ul className="text-muted-foreground list-inside list-disc text-xs">
                {tuningDiffLabels.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="text-muted-foreground w-full min-w-[28rem] border-collapse text-xs mt-8">
              <caption className="caption-bottom pt-2 text-left text-[0.65rem]">
                Queued run audit (persisted plan_runs rows). Snapshot diff compares
                enqueue-time config to current Configuration tab values.
              </caption>
              <thead>
                <tr className="border-border border-b text-left">
                  <th className="text-foreground py-1.5 pr-2 font-medium">
                    Job id
                  </th>
                  <th className="text-foreground py-1.5 pr-2 font-medium">
                    Queued (UTC)
                  </th>
                  <th className="text-foreground py-1.5 pr-2 font-medium">
                    Kind
                  </th>
                  <th className="text-foreground py-1.5 font-medium">
                    vs current config
                  </th>
                </tr>
              </thead>
              <tbody>
                {planRunAuditRows.length === 0 ? (
                  <tr>
                    <td className="py-2 text-[0.7rem]" colSpan={4}>
                      No queued run audit rows yet. After you enqueue from the
                      toolbar, each run records its resolved configuration here.
                    </td>
                  </tr>
                ) : (
                  planRunAuditRows.map((row) => {
                    const diffLabels = buildPlanRunSnapshotDiffLabels(
                      row.runConfigSnapshotJson,
                      { workflowInput, workingDirectory },
                    );

                    return (
                      <tr
                        className="border-border/60 border-b last:border-0"
                        key={row.id}
                      >
                        <td className="py-1.5 pr-2 align-top font-mono text-[0.65rem]">
                          <Link
                            className="text-primary underline-offset-2 hover:underline"
                            to={planRunJobDetailPath(row.bullmqJobId)}
                          >
                            {row.bullmqJobId}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-2 align-top font-mono text-[0.65rem]">
                          {row.createdAt}
                        </td>
                        <td className="py-1.5 pr-2 align-top text-[0.65rem]">
                          {row.runKind}
                        </td>
                        <td className="py-1.5 align-top text-[0.65rem]">
                          {row.runConfigSnapshotJson == null ? (
                            '—'
                          ) : diffLabels.length === 0 ? (
                            'Matches current config'
                          ) : (
                            <ul className="list-inside list-disc">
                              {diffLabels.map((line, index) => (
                                <li key={`${row.id}-${index}`}>{line}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="text-muted-foreground w-full min-w-[28rem] border-collapse text-xs mt-8">
              <caption className="caption-bottom pt-2 text-left text-[0.65rem]">
                Recent enqueue history (completed jobs for this plan). Each row
                shows which runner executed that run (one backend per job).
                After “Add to Queue” or “Run plan”, finished workers appear here
                — open a job id for payload and state in the queue UI.
              </caption>
              <thead>
                <tr className="border-border border-b text-left">
                  <th className="text-foreground py-1.5 pr-2 font-medium">
                    Job id
                  </th>
                  <th className="text-foreground py-1.5 pr-2 font-medium">
                    Runner
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
                    <td className="py-2 text-[0.7rem]" colSpan={4}>
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
        </div>
      </CardContent>
    </Card>
  );
};
