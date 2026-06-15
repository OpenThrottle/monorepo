import * as React from 'react';
import classnames from 'classnames';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import type {
  PlanDetailIndexLoaderQuery,
  PlanDetailsFragment,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';
import { PlanToolbar } from '~/routing/plans/components/PlanToolbar';
import { PlanWorkflowRunTransparency } from '~/routing/plans/components/PlanWorkflowRunTransparency';
import {
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  parseWorkflowRunIterationTimeoutSeconds,
  validateWorkflowRalphRunOptionsState,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { validateWorkspacePathClient } from '~/routing/plans/utils/workspace-path';
import { EditorWindow } from '@openthrottle/react-router-editor';

export interface PlanTabDetailsProps {
  fullscreen: boolean;
  jobRunHooksBlocked?: boolean;
  jobRunHooksBlockedReason?: string;
  jobRunHooksJson?: string;
  plan: PlanDetailsFragment;
  planRunAuditRows: PlanDetailIndexLoaderQuery['planRunsByPlanId'];
  ralphTuningJson: string;
  recentPlanRuns: PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'];
  setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  tasks: PlanTaskRowFragment[];
  workflowInput: WorkflowRalphRunOptionsInput;
  workflowTimeout: string;
  workingDirectory?: string;
}

export const PlanTabDetails = (
  props: PlanTabDetailsProps,
): React.ReactElement => {
  const {
    fullscreen,
    jobRunHooksBlocked = false,
    jobRunHooksBlockedReason,
    jobRunHooksJson = '',
    plan,
    planRunAuditRows,
    ralphTuningJson,
    recentPlanRuns,
    // setFullscreen,
    tasks,
    workingDirectory,
    workflowInput,
    workflowTimeout,
  } = props;

  // Hooks

  // Setup
  const canonicalWorkflowCommand = React.useMemo(() => {
    const merged: WorkflowRalphRunOptionsInput = {
      ...workflowInput,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(workflowTimeout),
    };

    return formatWorkflowRalphCommandLine(buildWorkflowRalphOptionArgs(merged));
  }, [workflowInput, workflowTimeout]);

  const workflowValidation = validateWorkflowRalphRunOptionsState(
    workflowInput,
    workflowTimeout,
    { requireCliTargetIds: true },
  );
  const workspacePathError = validateWorkspacePathClient(
    workingDirectory ?? '',
  );
  const workflowRunBlocked =
    !workflowValidation.ok || workspacePathError != null || jobRunHooksBlocked;
  const workflowRunBlockedReason = jobRunHooksBlocked
    ? (jobRunHooksBlockedReason ??
      'Fix job run lifecycle hooks in Configuration.')
    : !workflowValidation.ok
      ? workflowValidation.issues[0]?.message
      : workspacePathError;
  const hasSummary = plan.summary != null && plan.summary !== '';
  const requirements = React.useMemo(() => {
    return tasks
      .map((task) => JSON.parse(task.requirementsJson))
      .filter((requirement) => requirement.length > 0);
  }, [tasks]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="overview">
      <div className="flex flex-col gap-4 md:gap-8">
        <PlanToolbar
          className="bg-card border-card-border rounded-lg border p-4"
          // className="p-4"
          jobRunHooksJson={jobRunHooksJson}
          planId={plan.id}
          planStatus={plan.status}
          planTitle={plan.title ?? 'Untitled'}
          ralphTuningJson={ralphTuningJson}
          workflowRunBlocked={workflowRunBlocked}
          workflowRunBlockedReason={workflowRunBlockedReason}
          workingDirectory={workingDirectory}
        />

        <div
          className={classnames('bg-card', {
            'absolute inset-0 z-50 h-full w-full': fullscreen,
            'border-transparent hover:border-transparent': fullscreen,
            relative: !fullscreen,
          })}
        >
          {fullscreen ? (
            <EditorWindow
              className="flex-1 transition-all duration-300"
              height={fullscreen ? '100vh' : '300px'}
              language="markdown"
              options={{
                minimap: { enabled: false },
              }}
              value={plan.description ?? ''}
              width="100%"
              wrapperProps={{ className: 'transition-all duration-300' }}
              // onChange={handleEditorChange}
            />
          ) : (
            <div className="bg-card border-card-border space-y-4 rounded-lg border p-4 md:p-8">
              {hasSummary && (
                <div>
                  <h2 className="mb-4">Summary</h2>
                  <MarkdownRenderer source={plan.summary ?? ''} />
                </div>
              )}

              <div>
                <h2 className="mb-4">Description</h2>
                <MarkdownRenderer source={plan.description ?? ''} />
              </div>

              {requirements.length > 0 ? (
                <>
                  <h2 className="mb-4">Requirements</h2>
                  <MarkdownRenderer
                    source={requirements
                      .map((requirement) => `- ${requirement}`)
                      .join('\n')}
                  />
                </>
              ) : (
                <OpenThrottleEmptyState
                  className="p-0!"
                  description="This plan and its tasks have no requirements. Modify the plan and its tasks to add requirements."
                  title="No Requirements"
                />
              )}
            </div>
          )}
        </div>

        <PlanWorkflowRunTransparency
          canonicalWorkflowCommand={canonicalWorkflowCommand}
          planId={plan.id}
          planRunAuditRows={planRunAuditRows}
          recentPlanRuns={recentPlanRuns}
          workflowInput={workflowInput}
          workflowTimeout={workflowTimeout}
          workingDirectory={workingDirectory ?? ''}
        />
      </div>
    </TabsContent>
  );
};
