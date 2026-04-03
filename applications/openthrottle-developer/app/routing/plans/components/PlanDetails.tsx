import * as React from 'react';
import classnames from 'classnames';
import {
  Badge,
  Button,
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
  isWorkflowRunOptionsExpandedFromSearchParams as isWorkflowOptionsExpanded,
} from '~/routing/plans/utils/workflow-run-options-search-param';

export interface PlanDetailsProps {
  readonly className?: string;
  readonly plan: PlanDetailsFragment;
}

export const PlanDetails = (props: PlanDetailsProps) => {
  const { className, plan } = props;
  const { projectRelation: project } = plan;

  // Hooks
  const [expanded, setExpanded] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = React.useState(false);
  const [workflowTimeout, setWorkflowTimeout] = React.useState('');

  const [workflowInput, setWorkflowInput] =
    React.useState<WorkflowRalphRunOptionsInput>(() =>
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
    );

  const ralphTuningJson = React.useMemo((): string => {
    const merged: WorkflowRalphRunOptionsInput = {
      ...workflowInput,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(workflowTimeout),
    };

    const tuning = buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);

    return tuning === undefined ? '' : JSON.stringify(tuning);
  }, [workflowInput, workflowTimeout]);

  // Setup
  const isExpanded = isWorkflowOptionsExpanded(searchParams);
  const hasDescription = plan.description != null && plan.description !== '';
  const hasSummary = plan.summary != null && plan.summary !== '';

  const summaryLines = hasSummary ? (plan.summary!.split('\n').length ?? 0) : 0;
  const descriptionLines = hasDescription
    ? plan.description!.split('\n').length
    : 0;

  const isLongDescription = descriptionLines > DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES; // prettier-ignore
  const isLongSummary = summaryLines > DEFAULT_PLAN_SUMMARY_PREVIEW_LINES;

  const showSummaryPreview = hasSummary && isLongSummary && !summary;
  const showDescriptionPreview =
    hasDescription && isLongDescription && !expanded;

  // Handlers
  const onToggleExpanded = (expanded: boolean): void => {
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

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setWorkflowInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
    );
    setWorkflowTimeout('');
  }, [plan.id]);

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
                    onClick={() => setExpanded((e) => !e)}
                    type="button"
                  >
                    {expanded ? 'Show less' : 'Show more'}
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
                    onClick={() => setSummary((e) => !e)}
                    type="button"
                  >
                    {summary ? 'Show less' : 'Show more'}
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

      {isExpanded ? (
        <WorkflowRunOptions
          className="mb-6"
          iterationTimeoutText={workflowTimeout}
          onCollapse={() => onToggleExpanded(false)}
          onIterationTimeoutTextChange={setWorkflowTimeout}
          onResetToDefaults={() => {
            setWorkflowInput(
              getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
            );
            setWorkflowTimeout('');
          }}
          onValueChange={setWorkflowInput}
          planId={plan.id}
          value={workflowInput}
        />
      ) : (
        <Card className="mb-6" data-testid="workflow-run-options-collapsed">
          <CardHeader className="flex flex-row w-full gap-4">
            <div className="min-w-0 space-y-1.5 flex-1">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Workflow options
              </h2>
              <p className="text-muted-foreground text-sm">
                Tuning for{' '}
                <code className="text-xs">pnpm exec workflow-ralph</code> and
                for queued runs from the toolbar. Defaults apply while
                collapsed; expand to change iterations, model, prompt, and more.
              </p>
            </div>

            <Button
              aria-controls="workflow-run-options"
              aria-expanded={false}
              className="shrink-0 size-8"
              data-testid="workflow-run-options-expand"
              onClick={() => onToggleExpanded(true)}
              variant="ghost"
            >
              <ChevronDown aria-hidden={true} className="size-4" />
            </Button>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
