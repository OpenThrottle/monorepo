import * as React from 'react';
import classnames from 'classnames';
import {
  Badge,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { Link, useSearchParams } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { PlanDetailsFragment } from '~/__generated__/graphql';
import {
  PlanStatusBadge,
  isPlanStatusKey,
} from '~/routing/plans/components/PlanStatusBadge';
import { PlanToolbar } from '~/routing/plans/components/PlanToolbar';
import { WorkflowRunOptions } from '~/routing/plans/components/WorkflowRunOptions';
import { formatPlanDate } from '~/routing/plans/utils/formatters';
import {
  DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES,
  DEFAULT_PLAN_SUMMARY_PREVIEW_LINES,
} from '~/routing/plans/config/defaults';
import {
  buildRalphPlanRunTuningInputFromWorkflowRunOptions,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
  isWorkflowRunOptionsExpandedFromSearchParams,
} from '~/routing/plans/utils/workflow-run-options-search-param';

export interface PlanDetailsProps {
  readonly className?: string;
  readonly plan: PlanDetailsFragment;
}

export const PlanDetails = (props: PlanDetailsProps) => {
  const { className, plan } = props;
  const { projectRelation: project } = plan;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);

  const workflowRunOptionsExpanded =
    isWorkflowRunOptionsExpandedFromSearchParams(searchParams);

  const [workflowRunInput, setWorkflowRunInput] =
    React.useState<WorkflowRalphRunOptionsInput>(() =>
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
    );
  const [workflowIterationTimeoutText, setWorkflowIterationTimeoutText] =
    React.useState('');

  React.useEffect(() => {
    setWorkflowRunInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
    );
    setWorkflowIterationTimeoutText('');
  }, [plan.id]);

  const ralphTuningJson = React.useMemo((): string => {
    const merged: WorkflowRalphRunOptionsInput = {
      ...workflowRunInput,
      iterationTimeoutSeconds: parseWorkflowRunIterationTimeoutSeconds(
        workflowIterationTimeoutText,
      ),
    };
    const tuning = buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);
    return tuning === undefined ? '' : JSON.stringify(tuning);
  }, [workflowRunInput, workflowIterationTimeoutText]);

  const setWorkflowRunOptionsExpanded = (expanded: boolean): void => {
    const next = new URLSearchParams(searchParams);
    if (expanded) {
      next.set(
        WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
        WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
      );
    } else {
      next.delete(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM);
    }
    setSearchParams(next, { replace: true });
  };

  // Setup
  const hasDescription = plan.description != null && plan.description !== '';
  const hasSummary = plan.summary != null && plan.summary !== '';
  const descriptionLines = hasDescription
    ? plan.description!.split('\n').length
    : 0;
  const summaryLines = hasSummary ? (plan.summary!.split('\n').length ?? 0) : 0;
  const isLongDescription = descriptionLines > DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES; // prettier-ignore
  const isLongSummary = summaryLines > DEFAULT_PLAN_SUMMARY_PREVIEW_LINES;
  const showDescriptionPreview =
    hasDescription && isLongDescription && !descriptionExpanded;

  const showSummaryPreview = hasSummary && isLongSummary && !summaryExpanded;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="PlanDetails">
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 w-full">
            <CardTitle className="flex items-center gap-2 justify-between">
              <h1 className="text-2xl text-highlight">{plan.title}</h1>
              <Badge>
                <OpenThrottleClipboard
                  className="cursor-pointer whitespace-nowrap"
                  label="Copy workflow command"
                  text={`pnpm exec workflow-ralph --plan ${plan.id}`}
                />
              </Badge>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2 text-sm mb-6">
              <PlanStatusBadge
                status={isPlanStatusKey(plan.status) ? plan.status : 'PENDING'}
              />
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
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
                <p
                  className={classnames(
                    'text-sm text-muted-foreground',
                    showDescriptionPreview && 'line-clamp-4',
                  )}
                >
                  {plan.description}
                </p>
                {isLongDescription && (
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                    onClick={() => setDescriptionExpanded((e) => !e)}
                    type="button"
                  >
                    {descriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
            {hasDescription && hasSummary && <Separator />}
            {hasSummary && (
              <div className="space-y-1">
                <blockquote
                  className={classnames(
                    'border-l-4 border-muted-foreground/30 pl-4 text-sm italic text-muted-foreground',
                    showSummaryPreview && 'line-clamp-3',
                  )}
                >
                  {plan.summary}
                </blockquote>
                {isLongSummary && (
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                    onClick={() => setSummaryExpanded((e) => !e)}
                    type="button"
                  >
                    {summaryExpanded ? 'Show less' : 'Show more'}
                  </button>
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
          />
        </CardFooter>
      </Card>

      {workflowRunOptionsExpanded ? (
        <WorkflowRunOptions
          className="mb-6"
          iterationTimeoutText={workflowIterationTimeoutText}
          onCollapse={() => setWorkflowRunOptionsExpanded(false)}
          onIterationTimeoutTextChange={setWorkflowIterationTimeoutText}
          onResetToDefaults={() => {
            setWorkflowRunInput(
              getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
            );
            setWorkflowIterationTimeoutText('');
          }}
          onValueChange={setWorkflowRunInput}
          planId={plan.id}
          value={workflowRunInput}
        />
      ) : (
        <Card className="mb-6" data-testid="workflow-run-options-collapsed">
          <CardHeader className="pb-0">
            <button
              aria-controls="workflow-run-options"
              aria-expanded={false}
              className="group flex w-full items-start justify-between gap-3 rounded-md text-left outline-none ring-offset-background transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="workflow-run-options-expand"
              onClick={() => setWorkflowRunOptionsExpanded(true)}
              type="button"
            >
              <div className="min-w-0 space-y-1.5">
                <h2 className="text-lg font-semibold leading-none tracking-tight">
                  Workflow run options
                </h2>
                <p className="text-muted-foreground text-sm">
                  Tuning for{' '}
                  <code className="text-xs">pnpm exec workflow-ralph</code> and
                  for queued runs from the toolbar. Defaults apply while
                  collapsed; expand to change iterations, model, prompt, and
                  more.
                </p>
              </div>
              <ChevronDown
                aria-hidden={true}
                className="text-muted-foreground group-hover:text-foreground mt-0.5 size-5 shrink-0"
              />
            </button>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
