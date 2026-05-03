import * as React from 'react';
import classnames from 'classnames';
import {
  Badge,
  Blockquote,
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
import { PlanDetailsFragment } from '~/__generated__/graphql';
import {
  PlanStatusBadge,
  isPlanStatusKey,
} from '~/routing/plans/components/PlanStatusBadge';
import { PlanToolbar } from '~/routing/plans/components/PlanToolbar';
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
import { PlanWorkflowConfig } from '~/routing/plans/components/PlanWorkflowConfig';
import { PlanLoggerOutput } from '~/routing/plans/components/PlanLoggerOutput';
import { PlanWorkflowConfigCollapsed } from '~/routing/plans/components/PlanWorkflowConfigCollapsed';

export interface PlanDetailsProps {
  readonly className?: string;
  readonly logs: any[];
  readonly plan: PlanDetailsFragment;
}

export const PlanDetails = (props: PlanDetailsProps) => {
  const { className, logs, plan } = props;
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
  const onResetToDefaults = (): void => {
    setWorkflowInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan.id }),
    );

    setWorkflowTimeout('');
  };

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

    setSearchParams(next, {
      preventScrollReset: true,
      replace: true,
    });
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
                    'text-md leading-relaxed transition-colors',
                    'text-muted-foreground hover:text-foreground',
                    // 'text-sidebar-foreground',
                    showDescriptionPreview && 'line-clamp-4',
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
        <PlanWorkflowConfig
          className="mb-6"
          iterationTimeoutText={workflowTimeout}
          onCollapse={() => onToggleExpanded(false)}
          onIterationTimeoutTextChange={setWorkflowTimeout}
          onResetToDefaults={onResetToDefaults}
          onValueChange={setWorkflowInput}
          planId={plan.id}
          value={workflowInput}
        />
      ) : (
        <PlanWorkflowConfigCollapsed onClick={() => onToggleExpanded(true)} />
      )}

      <PlanLoggerOutput logs={logs} />
    </div>
  );
};
