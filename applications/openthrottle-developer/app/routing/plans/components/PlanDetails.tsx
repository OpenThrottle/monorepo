import * as React from 'react';
import classnames from 'classnames';
import {
  Blockquote,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Markdown,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { formatPlanDate } from '~/routing/plans/utils/formatters';
import type {
  PlanDetailIndexLoaderQuery,
  PlanDetailsFragment,
} from '~/__generated__/graphql';
import {
  PlanStatusBadge,
  isPlanStatusKey,
} from '~/routing/plans/components/PlanStatusBadge';
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

export interface PlanDetailsProps {
  readonly className?: string;
  readonly plan: PlanDetailsFragment;
  readonly ralphTuningJson: string;
  readonly recentPlanRuns: PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'];
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workflowTimeout: string;
}

export const PlanDetails = (props: PlanDetailsProps) => {
  const {
    className,
    plan,
    ralphTuningJson,
    recentPlanRuns,
    workflowInput,
    workflowTimeout,
  } = props;
  const { projectRelation: project } = plan;

  // Hooks
  const [expanded, setExpanded] = React.useState(false);
  const [summary, setSummary] = React.useState(false);

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
  const workflowRunBlocked = !workflowValidation.ok;
  const workflowRunBlockedReason = workflowValidation.ok
    ? undefined
    : workflowValidation.issues[0]?.message;

  // Setup
  // const isExpanded = isWorkflowOptionsExpanded(searchParams);
  const hasDescription = plan.description != null && plan.description !== '';
  const hasSummary = plan.summary != null && plan.summary !== '';
  const status = isPlanStatusKey(plan.status) ? plan.status : 'PENDING';

  const summaryLines = hasSummary ? (plan.summary!.split('\n').length ?? 0) : 0;
  const descriptionLines = hasDescription
    ? plan.description!.split('\n').length
    : 0;

  const isLongDescription = descriptionLines > DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES; // prettier-ignore
  const isLongSummary = summaryLines > DEFAULT_PLAN_SUMMARY_PREVIEW_LINES;

  const showSummaryPreview = hasSummary && isLongSummary && !summary;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="PlanDetails">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 w-full">
            <CardTitle className="flex items-center gap-4">
              <PlanStatusBadge status={status} />
              <h1 className="text-lg flex-1 text-highlight">{plan.title}</h1>
            </CardTitle>

            <PlanWorkflowRunTransparency
              canonicalWorkflowCommand={canonicalWorkflowCommand}
              planId={plan.id}
              recentPlanRuns={recentPlanRuns}
              workflowInput={workflowInput}
              workflowTimeout={workflowTimeout}
            />

            <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Author</dt>
                <dd>{plan.author}</dd>
              </div>
              {plan.assignee != null && plan.assignee !== '' && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Assignee</dt>
                  <dd>{plan.assignee}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd>{plan.category}</dd>
              </div>
              {project != null && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Project</dt>
                  <dd>
                    <Link
                      className="hover:text-foreground underline"
                      to={`/projects/${project.id}`}
                    >
                      {project.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatPlanDate(plan.createdAt)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatPlanDate(plan.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </CardHeader>

        {(hasDescription || hasSummary) && (
          <CardContent className="space-y-4">
            {hasDescription && (
              <div className="space-y-1">
                <Markdown
                  className={classnames(
                    'text-sm text-muted-foreground whitespace-normal',
                    expanded && 'line-clamp-4',
                  )}
                  content={plan.description ?? ''}
                />
                {/* <p
                  className={classnames(
                    'text-md leading-relaxed transition-colors',
                    'text-muted-foreground hover:text-foreground',
                    // 'text-sidebar-foreground',
                    showDescriptionPreview && 'line-clamp-4',
                  )}
                >
                  {plan.description}
                </p> */}
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
          </CardContent>
        )}

        <CardFooter>
          <PlanToolbar
            planId={plan.id}
            planStatus={plan.status}
            planTitle={plan.title ?? 'Untitled'}
            ralphTuningJson={ralphTuningJson}
            workflowRunBlocked={workflowRunBlocked}
            workflowRunBlockedReason={workflowRunBlockedReason}
          />
        </CardFooter>
      </Card>
    </div>
  );
};
