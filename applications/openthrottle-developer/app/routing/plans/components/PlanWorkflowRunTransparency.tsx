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
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  buildWorkflowRalphDebugBundleText,
  buildWorkflowRalphTuningDiffLabels,
  WORKFLOW_RALPH_CONFIG_PRECEDENCE,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PlanWorkflowRunTransparencyAuditTable } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunTransparencyRecentRuns } from '~/routing/plans/components/PlanWorkflowRunTransparencyRecentRuns';
import type { RecentRun } from '~/routing/plans/components/PlanWorkflowRunTransparencyRecentRuns';

export interface PlanWorkflowRunTransparencyProps {
  canonicalWorkflowCommand: string;
  planId: string;
  planRunAuditRows: PlanRunAuditRow[];
  recentPlanRuns: RecentRun[];
  workflowInput: WorkflowRalphRunOptionsInput;
  workflowTimeout: string;
  workingDirectory: string;
}

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

  // Setup
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
              <strong className="text-foreground font-medium">Required</strong>{' '}
              CLI target (one of):{' '}
              <code className="text-[0.65rem]">--plan &lt;uuid&gt;</code> or{' '}
              <code className="text-[0.65rem]">--task &lt;uuid&gt;</code>.
              Toolbar “Add to Queue” enqueues a{' '}
              <span className="text-foreground font-medium">plan-scoped</span>{' '}
              worker job with one execution backend for the whole run (Cursor or
              Claude Code).{' '}
              <strong className="text-foreground font-medium">
                Precedence
              </strong>
              : {WORKFLOW_RALPH_CONFIG_PRECEDENCE}. Configuration tab values and
              enqueue tuning sit at the CLI layer; omit fields to inherit from{' '}
              <code className="text-[0.65rem]">.workflow-ralph.json</code> in
              the worktree or repo root.
            </CardDescription>
            <div className="my-4 flex flex-wrap gap-2">
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
            <p className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase">
              Canonical argv (local CLI)
            </p>
            <pre
              className="bg-background text-foreground border-border max-h-36 overflow-x-auto overflow-y-auto rounded border p-2 font-mono text-[0.65rem] leading-relaxed break-all whitespace-pre-wrap"
              data-testid="PlanWorkflowRunTransparency-canonical-cli"
            >
              {canonicalWorkflowCommand}
            </pre>
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase">
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

          <PlanWorkflowRunTransparencyAuditTable
            planRunAuditRows={planRunAuditRows}
            workflowInput={workflowInput}
            workingDirectory={workingDirectory}
          />

          <PlanWorkflowRunTransparencyRecentRuns
            recentPlanRuns={recentPlanRuns}
          />
        </div>
      </CardContent>
    </Card>
  );
};
