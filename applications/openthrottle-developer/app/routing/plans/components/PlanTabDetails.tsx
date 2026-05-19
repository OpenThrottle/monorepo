import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
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

interface PlanTabDetailsProps {
  readonly fullscreen: boolean;
  readonly plan: PlanDetailsFragment;
  readonly ralphTuningJson: string;
  readonly recentPlanRuns: PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'];
  readonly setFullscreen: React.SetStateAction<
    React.Dispatch<React.SetStateAction<boolean>>
  >;
  readonly workingDirectory?: string;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workflowTimeout: string;
}

export const PlanTabDetails = (props: PlanTabDetailsProps) => {
  const {
    fullscreen,
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
    !workflowValidation.ok || workspacePathError != null;
  const workflowRunBlockedReason = !workflowValidation.ok
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
        <Card
          className={classnames({
            'absolute inset-0 z-50': fullscreen,
            'border-transparent hover:border-transparent': fullscreen,
          })}
        >
          <PlanToolbar
            // className="bg-card rounded-lg border border-card-border p-4"
            className="p-4"
            planId={plan.id}
            planStatus={plan.status}
            planTitle={plan.title ?? 'Untitled'}
            ralphTuningJson={ralphTuningJson}
            workflowRunBlocked={workflowRunBlocked}
            workflowRunBlockedReason={workflowRunBlockedReason}
            workingDirectory={workingDirectory}
          />
          <div>
            <Button
              onClick={() => {
                setFullscreen((prev) => !prev);
              }}
            >
              Full Screen
            </Button>
          </div>
          {/* <CardContent> */}

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
            <>
              <Markdown
                className="p-4 md:p-8 text-wrap text-sm text-muted-foreground whitespace-normal"
                content={plan.description ?? ''}
              />
              {/* <p className="p-4 md:p-8 text-wrap text-sm text-muted-foreground whitespace-normal">
                {plan.description ?? ''}
              </p> */}
            </>
          )}

          {/* </CardContent> */}

          {/* <div>

          {(hasDescription || hasSummary) && (
            <div className="space-y-4">
              {hasDescription && (
                <div className="space-y-1">
                  <Markdown
                    className={classnames(
                      'text-sm my-8 text-muted-foreground whitespace-normal',
                      !expanded && 'line-clamp-4',
                    )}
                    content={plan.description ?? ''}
                  />
                  <p
                  className={classnames(
                    'text-md leading-relaxed transition-colors',
                    'text-muted-foreground hover:text-foreground',
                    // 'text-sidebar-foreground',
                    // showDescriptionPreview && 'line-clamp-4',
                  )}
                >
                  {plan.description}
                </p>
                  {isLongDescription && (
                    <Button onClick={() => setExpanded((e) => !e)}>
                      {expanded ? 'Show less' : 'Show more'}
                    </Button>
                  )}
                </div>
              )}
              {hasDescription && hasSummary && <Separator />}
              {hasSummary && (
                <div className="space-y-1">
                  <Blockquote
                    className={classnames(
                      'border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground',
                      showSummaryPreview && 'line-clamp-3',
                    )}
                  >
                    {plan.summary}
                  </Blockquote>
                  {isLongSummary && (
                    <Button onClick={() => setSummary((e) => !e)}>
                      {summary ? 'Show less' : 'Show more'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <CardFooter></CardFooter>
        </div> */}
        </Card>

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
