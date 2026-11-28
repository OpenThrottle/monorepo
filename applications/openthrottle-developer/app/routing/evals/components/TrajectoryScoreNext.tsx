import { fillTemplate } from '@openthrottle/nodejs-utils';
import { Button, cn, Progress } from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import {
  EVAL_TRAJECTORIES_COPY,
  TRAJECTORY_SCORE_NEXT_COPY,
} from '~/routing/evals/data/copy';
import type { TrajectoryScoring } from '~/routing/evals/types';
import { buildTrajectoryViewerHref } from '~/routing/evals/utils/hrefs';

export interface TrajectoryScoreNextProps {
  readonly className?: string;
  /** True once this trajectory has your label: only then is "next" offered. */
  readonly isLabelled: boolean;
  readonly scoring: TrajectoryScoring;
}

/**
 * @description Makes scoring a run-through: "k of N scored" for this plan,
 * and once you have labelled this trajectory, the next unscored one in the
 * plan, else the next plan with unscored rows, else the way back.
 */
export const TrajectoryScoreNext = (
  props: TrajectoryScoreNextProps,
): React.ReactElement => {
  const { className, isLabelled, scoring } = props;
  const { next, scoredCount, trajectoryCount } = scoring;

  // Hooks

  // Setup
  const copy = TRAJECTORY_SCORE_NEXT_COPY;
  const hasPlan = trajectoryCount > 0;
  const progressText = fillTemplate(copy.progress, {
    scored: String(scoredCount),
    total: String(trajectoryCount),
  });
  const percent = hasPlan ? (scoredCount / trajectoryCount) * 100 : 0;
  const nextPlanTitle = next.kind === 'next-plan' ? next.planTitle : null;
  const nextPlanText = fillTemplate(copy.nextPlan, {
    title: nextPlanTitle ?? EVAL_TRAJECTORIES_COPY.unknownPlan,
  });

  // Handlers

  // Markup
  const progress = (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm tabular-nums">
        {progressText}
      </p>
      <Progress aria-label={progressText} value={percent} />
    </div>
  );
  const renderNextLink = (
    trajectoryId: string,
    text: string,
  ): React.ReactElement => {
    return (
      <Button asChild={true} size="sm">
        <Link
          data-next-kind={next.kind}
          to={buildTrajectoryViewerHref(trajectoryId)}
        >
          {text}
          <ChevronRightIcon />
        </Link>
      </Button>
    );
  };
  const allScored = (
    <div className="flex flex-col gap-2 text-sm" data-next-kind={next.kind}>
      <p>{copy.allScored}</p>
      <Link
        className="underline-offset-4 hover:underline"
        to="/evals/trajectories"
      >
        {copy.backToList}
      </Link>
    </div>
  );
  const renderNextAction = (): React.ReactElement => {
    switch (next.kind) {
      case 'in-plan':
        return renderNextLink(next.trajectoryId, copy.nextInPlan);
      case 'next-plan':
        return renderNextLink(next.trajectoryId, nextPlanText);
      default:
        return allScored;
    }
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="trajectory-score-next-heading"
      className={cn(
        'bg-card border-card-border flex flex-col gap-3 rounded-lg border p-4',
        className,
      )}
      data-testid="TrajectoryScoreNext"
    >
      <h2
        className="text-base font-semibold"
        id="trajectory-score-next-heading"
      >
        {copy.heading}
      </h2>
      {hasPlan ? progress : null}
      {isLabelled ? renderNextAction() : null}
    </section>
  );
};
