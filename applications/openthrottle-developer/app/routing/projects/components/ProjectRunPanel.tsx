import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type {
  ProjectRunPanelDetailsFragment,
  ProjectRunPanelPlanFragment,
} from '~/__generated__/graphql';
import {
  PROJECT_RUN_COPY,
  PROJECT_RUN_STATE_LABEL,
} from '~/routing/projects/data/data.copy';
import { getProjectRunState } from '~/routing/projects/utils/project-runs';

export interface ProjectRunPanelProps {
  readonly className?: string;
  /** The project's newest run, or null when it has never run. */
  readonly run: ProjectRunPanelDetailsFragment | null;
}

/**
 * @description The project's run: what it is doing now and the one action that fits. Never run,
 * cancelled or completed offer "Run project"; a running run names its current plan and offers
 * Cancel; a stopped run names the plan it stopped at and why, and offers Resume (a fresh run that
 * passes over finished plans). Both actions post an `intent` to the project route action.
 */
export const ProjectRunPanel = (
  props: ProjectRunPanelProps,
): React.ReactElement => {
  const { className, run } = props;

  // Hooks
  const fetcher = useFetcher<{ readonly projectRunError?: string }>();

  // Setup
  const state = getProjectRunState(run);
  const isPending = fetcher.state !== 'idle';
  const isCancelling = run?.cancelRequestedAt != null;
  const error = fetcher.data?.projectRunError;
  const runLabel =
    state === 'stopped' ? PROJECT_RUN_COPY.resume : PROJECT_RUN_COPY.run;
  const cancelLabel = isCancelling
    ? PROJECT_RUN_COPY.cancelling
    : PROJECT_RUN_COPY.cancel;
  const reasonSuffix =
    run?.stoppedReason == null ? null : `: ${run.stoppedReason}`;

  // Handlers
  const handleRun = (): void => {
    void fetcher.submit({ intent: 'runProject' }, { method: 'post' });
  };

  const handleCancel = (): void => {
    if (run === null) return;
    void fetcher.submit(
      { intent: 'cancelProjectRun', projectRunId: run.id },
      { method: 'post' },
    );
  };

  // Markup
  const renderPlanLink = (
    plan: ProjectRunPanelPlanFragment | null | undefined,
  ): React.ReactNode => {
    if (plan == null) return '…';
    return (
      <Link
        className="hover:text-primary font-medium underline-offset-2 hover:underline"
        to={`/plans/${plan.id}`}
      >
        {plan.title}
      </Link>
    );
  };

  const stoppedMarkup = (
    <div className="space-y-1">
      <p>
        {PROJECT_RUN_COPY.stoppedPrefix} {renderPlanLink(run?.stoppedByPlan)}
        {reasonSuffix}
      </p>
      <p className="text-muted-foreground text-xs">
        {PROJECT_RUN_COPY.stoppedResumeHint}
      </p>
    </div>
  );

  const statusMarkup = {
    cancelled: <p>{PROJECT_RUN_COPY.cancelled}</p>,
    completed: <p>{PROJECT_RUN_COPY.completed}</p>,
    idle: <p>{PROJECT_RUN_COPY.idle}</p>,
    running: (
      <p>
        {PROJECT_RUN_COPY.onPlanPrefix} {renderPlanLink(run?.currentPlan)}
      </p>
    ),
    stopped: stoppedMarkup,
  }[state];

  const cancelButton = (
    <Button
      disabled={isPending || isCancelling}
      onClick={handleCancel}
      size="sm"
      type="button"
      variant="outline"
    >
      {cancelLabel}
    </Button>
  );

  const runButton = (
    <Button disabled={isPending} onClick={handleRun} size="sm" type="button">
      {runLabel}
    </Button>
  );

  const actionButton = state === 'running' ? cancelButton : runButton;

  const errorMarkup = (
    <p className="text-destructive" role="alert">
      {error}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      aria-labelledby="project-run-heading"
      className={cn(className)}
      data-testid="ProjectRunPanel"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg leading-none" id="project-run-heading">
            {PROJECT_RUN_COPY.heading}
          </h2>
          <Badge data-testid="ProjectRunState" variant="secondary">
            {PROJECT_RUN_STATE_LABEL[state]}
          </Badge>
        </div>
        {actionButton}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{PROJECT_RUN_COPY.description}</p>
        {statusMarkup}
        {error === undefined ? null : errorMarkup}
      </CardContent>
    </Card>
  );
};
