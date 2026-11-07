/**
 * @description Field resolvers for an eval trial: its grades, and the human labels on its
 * trajectory. A trial links 1:1 to its trajectory, so a label on a trial is the label on
 * `trial.trajectoryId`; there is no separate trial label path (use labelAgentTrajectory to add one).
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  EvalHumanLabelsService,
  EvalRunsService,
} from '@openthrottle/nestjs-repositories';

import { toAgentTrajectoryLabelObject } from '../../eval-human-labels/agent-trajectory-label.mapper.ts';
import { AgentTrajectoryLabelObject } from '../../eval-human-labels/agent-trajectory-label.object.ts';
import { EvalGradeObject } from '../eval-grade.object.ts';
import { toEvalGradeObject } from '../eval-run.mapper.ts';
import { EvalTrialObject } from '../eval-trial.object.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => EvalTrialObject)
export class EvalTrialsResolver {
  constructor(
    private readonly evalHumanLabelsService: EvalHumanLabelsService,
    private readonly evalRunsService: EvalRunsService,
  ) {}

  @ResolveField(() => [EvalGradeObject], {
    description: `Every grader's verdict on this trial, oldest first.`,
  })
  async grades(@Parent() trial: EvalTrialObject): Promise<EvalGradeObject[]> {
    const rows = await this.evalRunsService.findGradesByTrials([trial.id]);

    return rows.map(toEvalGradeObject);
  }

  @ResolveField(() => [AgentTrajectoryLabelObject], {
    description: `Human labels on the trial's trajectory, most recently updated first. Empty when the trial has no trajectory.`,
  })
  async labels(
    @Parent() trial: EvalTrialObject,
  ): Promise<AgentTrajectoryLabelObject[]> {
    if (trial.trajectoryId == null) return [];

    const rows = await this.evalHumanLabelsService.findByTrajectory(
      trial.trajectoryId,
    );

    return rows.map(toAgentTrajectoryLabelObject);
  }
}
