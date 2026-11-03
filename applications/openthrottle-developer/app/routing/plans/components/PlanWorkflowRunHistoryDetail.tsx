import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { PlanRunMetaList } from '~/routing/plans/components/PlanRunMetaList';
import { PlanRunProvenanceCell } from '~/routing/plans/components/PlanRunProvenanceCell';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_RUN_HISTORY_META_FIELDS } from '~/routing/plans/data/data.plan-run-history';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { planRunJobDetailPath } from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  buildPlanRunSnapshotDiffLabels,
  readPlanRunSnapshotEffort,
  readPlanRunSnapshotWorkspacePath,
} from '~/routing/plans/utils/plan-run-config-snapshot-ui';
import { buildPlanRunMetaItems } from '~/routing/plans/utils/plan-run-sections';
import type { PlanRunJobMetrics } from '~/routing/plans/utils/plan-workflow-run-transparency';

export interface PlanWorkflowRunHistoryDetailProps {
  /** The run's completed-job metrics; null for runs with no job or no metrics yet. */
  readonly metrics: PlanRunJobMetrics | null;
  readonly row: PlanRunAuditRow;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workingDirectory: string;
}

interface DetailEntry {
  readonly key: string;
  readonly label: string;
  /** Repeats a column that is hidden below `sm`, so it shows only at narrow widths. */
  readonly narrowOnly: boolean;
  readonly value: React.ReactNode;
}

/**
 * @description The expanded body of a Run history row: a definition list of job id, kind,
 * finished time and end RSS (from the completed job's metrics), workspace, effort and the snapshot diff against the current Configuration tab values. Below
 * `sm` it also repeats Model / backend and Branch / PR, whose columns are hidden there. Add a
 * field by appending a {@link DetailEntry}.
 */
export const PlanWorkflowRunHistoryDetail = (
  props: PlanWorkflowRunHistoryDetailProps,
): React.ReactElement => {
  const { metrics, row, workflowInput, workingDirectory } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.history.detail;
  const diffLabels = buildPlanRunSnapshotDiffLabels(row.runConfigSnapshotJson, {
    workflowInput,
    workingDirectory,
  });
  const workspacePath = readPlanRunSnapshotWorkspacePath(
    row.runConfigSnapshotJson,
  );
  const effort = readPlanRunSnapshotEffort(row.runConfigSnapshotJson);
  const finishedOn = metrics?.finishedOn ?? null;
  const rssEndMb = metrics?.rssEndMb ?? null;

  // Handlers

  // Markup
  const jobValue =
    row.bullmqJobId == null ? (
      <span className="text-muted-foreground">{copy.noJob}</span>
    ) : (
      <Link
        className="text-primary font-mono text-xs underline-offset-2 hover:underline"
        to={planRunJobDetailPath(row.bullmqJobId)}
      >
        {row.bullmqJobId}
      </Link>
    );
  const diffValue =
    row.runConfigSnapshotJson == null ? (
      copy.none
    ) : diffLabels.length === 0 ? (
      copy.configMatches
    ) : (
      <ul className="list-inside list-disc">
        {diffLabels.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  const entries: readonly DetailEntry[] = [
    {
      key: 'modelBackend',
      label: copy.modelBackend,
      narrowOnly: true,
      value: (
        <PlanRunMetaList
          items={buildPlanRunMetaItems(row, PLAN_RUN_HISTORY_META_FIELDS)}
        />
      ),
    },
    {
      key: 'branch',
      label: copy.branch,
      narrowOnly: true,
      value: (
        <PlanRunProvenanceCell
          branch={row.branch}
          checkout={row.checkout}
          pullRequest={row.pullRequest}
        />
      ),
    },
    { key: 'jobId', label: copy.jobId, narrowOnly: false, value: jobValue },
    {
      key: 'runKind',
      label: copy.runKind,
      narrowOnly: false,
      value: row.runKind,
    },
    {
      key: 'finished',
      label: copy.finished,
      narrowOnly: false,
      value:
        finishedOn === null ? copy.none : <PlanRunTime value={finishedOn} />,
    },
    {
      key: 'rssEnd',
      label: copy.rssEnd,
      narrowOnly: false,
      value: (
        <span className="font-mono text-xs">
          {rssEndMb === null ? copy.none : rssEndMb.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'workspace',
      label: copy.workspace,
      narrowOnly: false,
      value: (
        <span className="font-mono text-xs break-all">
          {workspacePath ?? copy.none}
        </span>
      ),
    },
    {
      key: 'effort',
      label: copy.effort,
      narrowOnly: false,
      value: effort ?? copy.none,
    },
    {
      key: 'configDiff',
      label: copy.configDiff,
      narrowOnly: false,
      value: diffValue,
    },
  ];

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <dl
      aria-label={copy.ariaLabel}
      className="bg-muted/30 grid grid-cols-1 gap-x-6 gap-y-2 rounded-md px-3 py-2 text-sm sm:grid-cols-[max-content_1fr]"
      data-testid={`PlanWorkflowRunHistoryDetail-${row.id}`}
    >
      {entries.map((entry) => (
        <div
          className={cn('contents', { 'sm:hidden': entry.narrowOnly })}
          data-field={entry.key}
          key={entry.key}
        >
          <dt className="text-muted-foreground text-xs font-medium">
            {entry.label}
          </dt>
          <dd className="min-w-0">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
};
