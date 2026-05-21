import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Markdown,
  TabsContent,
} from '@openthrottle/react-router-shadcn';
import type {
  PlanDetailIndexLoaderQuery,
  PlanDetailsFragment,
} from '~/__generated__/graphql';
import { PlanToolbar } from '~/routing/plans/components/PlanToolbar';
import { PlanWorkflowRunTransparency } from '~/routing/plans/components/PlanWorkflowRunTransparency';
import {
  DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES,
  DEFAULT_PLAN_SUMMARY_PREVIEW_LINES,
} from '~/routing/plans/config/defaults';
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
  ralphTuningJson: string;
  recentPlanRuns: PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'];
  setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  workingDirectory?: string;
  workflowInput: WorkflowRalphRunOptionsInput;
  workflowTimeout: string;
}

export const PlanTabDetails = (props: PlanTabDetailsProps) => {
  const {
    fullscreen,
    jobRunHooksBlocked = false,
    jobRunHooksBlockedReason,
    jobRunHooksJson = '',
    plan,
    ralphTuningJson,
    recentPlanRuns,
    setFullscreen,
    workingDirectory,
    workflowInput,
    workflowTimeout,
  } = props;

  // Hooks
  const [summary, _setSummary] = React.useState(false);

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

  // Setup
  // const isExpanded = isWorkflowOptionsExpanded(searchParams);
  const hasDescription = plan.description != null && plan.description !== '';
  const hasSummary = plan.summary != null && plan.summary !== '';
  // const status = isPlanStatusKey(plan.status) ? plan.status : 'PENDING';

  const summaryLines = hasSummary ? (plan.summary!.split('\n').length ?? 0) : 0;
  const descriptionLines = hasDescription
    ? plan.description!.split('\n').length
    : 0;

  const isLongSummary = summaryLines > DEFAULT_PLAN_SUMMARY_PREVIEW_LINES;

  const _isLongDescription = descriptionLines > DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES; // prettier-ignore
  const _showSummaryPreview = hasSummary && isLongSummary && !summary;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="overview">
      <div className="flex flex-col gap-4 md:gap-8">
        <PlanToolbar
          className="bg-card rounded-lg border border-card-border p-4"
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
          <Button
            className="absolute top-4 right-4 z-10"
            onClick={() => {
              setFullscreen((prev) => !prev);
            }}
          >
            Full Screen
          </Button>

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
            <div className="space-y-4 p-4 md:p-8">
              {hasSummary && (
                <div>
                  <h2 className="mb-4">Summary</h2>
                  <Markdown
                    className="text-wrap text-sm text-muted-foreground whitespace-normal"
                    content={plan.summary ?? ''}
                  />
                </div>
              )}

              <div>
                <h2 className="mb-4">Description</h2>
                <Markdown
                  className="text-wrap text-sm text-muted-foreground whitespace-normal"
                  content={plan.description ?? ''}
                />
              </div>
            </div>
          )}
        </div>

        <PlanWorkflowRunTransparency
          canonicalWorkflowCommand={canonicalWorkflowCommand}
          planId={plan.id}
          recentPlanRuns={recentPlanRuns}
          workflowInput={workflowInput}
          workflowTimeout={workflowTimeout}
        />
      </div>
    </TabsContent>
  );
};
