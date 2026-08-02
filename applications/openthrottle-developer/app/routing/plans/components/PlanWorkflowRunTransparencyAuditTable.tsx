import * as React from 'react';
import { Link } from 'react-router';
import type { PlanDetailIndexLoaderQuery } from '~/__generated__/graphql';
import { planRunJobDetailPath } from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { buildPlanRunSnapshotDiffLabels } from '~/routing/plans/utils/plan-run-config-snapshot-ui';
import { PlanRunProvenanceCell } from '~/routing/plans/components/PlanRunProvenanceCell';

export type PlanRunAuditRow =
  PlanDetailIndexLoaderQuery['planRunsByPlanId'][number];

export interface PlanWorkflowRunTransparencyAuditTableProps {
  planRunAuditRows: PlanRunAuditRow[];
  workflowInput: WorkflowRalphRunOptionsInput;
  workingDirectory: string;
}

/**
 * @description Queued run audit table for {@link PlanWorkflowRunTransparency}:
 * persisted plan_runs rows with a snapshot diff of enqueue-time config vs the
 * current Configuration tab values.
 */
export const PlanWorkflowRunTransparencyAuditTable = (
  props: PlanWorkflowRunTransparencyAuditTableProps,
): React.ReactElement => {
  const { planRunAuditRows, workflowInput, workingDirectory } = props;

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
          Queued run audit (persisted plan_runs rows). Snapshot diff compares
          enqueue-time config to current Configuration tab values.
        </caption>
        <thead>
          <tr className="border-border border-b text-left">
            <th className="text-foreground py-1.5 pr-2 font-medium">Job id</th>
            <th className="text-foreground py-1.5 pr-2 font-medium">
              Queued (UTC)
            </th>
            <th className="text-foreground py-1.5 pr-2 font-medium">Kind</th>
            <th className="text-foreground py-1.5 pr-2 font-medium">
              Provenance
            </th>
            <th className="text-foreground py-1.5 font-medium">
              vs current config
            </th>
          </tr>
        </thead>
        <tbody>
          {planRunAuditRows.length === 0 ? (
            <tr>
              <td className="py-2 text-[0.7rem]" colSpan={5}>
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
                    {row.bullmqJobId == null ? (
                      <span className="text-muted-foreground">CLI run</span>
                    ) : (
                      <Link
                        className="text-primary underline-offset-2 hover:underline"
                        to={planRunJobDetailPath(row.bullmqJobId)}
                      >
                        {row.bullmqJobId}
                      </Link>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 align-top font-mono text-[0.65rem]">
                    {new Date(row.createdAt).toISOString()}
                  </td>
                  <td className="py-1.5 pr-2 align-top text-[0.65rem]">
                    {row.runKind}
                  </td>
                  <td className="py-1.5 pr-2 align-top text-[0.65rem]">
                    <PlanRunProvenanceCell
                      branch={row.branch}
                      checkout={row.checkout}
                      pullRequest={row.pullRequest}
                    />
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
  );
};
