/**
 * @description Resolver for human trajectory labels (eval_human_labels): a person records a
 * pass/fail verdict, an optional failure type and a note on an agent trajectory. These are the
 * open-coding notes of error analysis and the ground truth judges are calibrated against; see
 * docs/openthrottle/eval-system-adr.md (Decisions 6 and 9). The rater is always derived from the
 * caller's identity, never from input, and a caller can only replace or remove their own label.
 */

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  EVAL_LABEL_VERDICT,
  EvalHumanLabelsService,
  type EvalLabelVerdict,
} from '@openthrottle/nestjs-repositories';
import { QueryFailedError } from 'typeorm';

import { resolveNoteAuthor } from '../notes/resolve-note-author.ts';
import { toAgentTrajectoryLabelObject } from './agent-trajectory-label.mapper.ts';
import { AgentTrajectoryLabelObject } from './agent-trajectory-label.object.ts';
import { LabelAgentTrajectoryInput } from './label-agent-trajectory.input.ts';

const FOREIGN_KEY_VIOLATION = '23503';
const MAX_NOTE_LENGTH = 4000;

const isEvalLabelVerdict = (value: string): value is EvalLabelVerdict => {
  return value === EVAL_LABEL_VERDICT.fail || value === EVAL_LABEL_VERDICT.pass;
};

const isForeignKeyViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === FOREIGN_KEY_VIOLATION
  );
};

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed == null || trimmed === '' ? null : trimmed;
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => AgentTrajectoryLabelObject)
export class EvalHumanLabelsResolver {
  constructor(
    private readonly evalHumanLabelsService: EvalHumanLabelsService,
    private readonly globalCls: GlobalClsService,
  ) {}

  @Query(() => [AgentTrajectoryLabelObject], {
    description: `List every rater's label on an agent trajectory, most recently updated first.`,
  })
  async agentTrajectoryLabels(
    @Args('trajectoryId', { type: () => ID }) trajectoryId: string,
  ): Promise<AgentTrajectoryLabelObject[]> {
    const rows =
      await this.evalHumanLabelsService.findByTrajectory(trajectoryId);

    return rows.map(toAgentTrajectoryLabelObject);
  }

  @Mutation(() => AgentTrajectoryLabelObject, {
    description: `Record your verdict (pass or fail), optional failure type and note on an agent trajectory. One label per rater per trajectory: re-labelling replaces your own. The rater is taken from your identity, never from input.`,
  })
  async labelAgentTrajectory(
    @Args('input', { type: () => LabelAgentTrajectoryInput })
    input: LabelAgentTrajectoryInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<AgentTrajectoryLabelObject> {
    const verdict = input.verdict.trim();

    if (!isEvalLabelVerdict(verdict)) {
      throw new BadRequestException(
        `verdict must be '${EVAL_LABEL_VERDICT.pass}' or '${EVAL_LABEL_VERDICT.fail}'`,
      );
    }

    const note = trimToNull(input.note);

    if (note != null && note.length > MAX_NOTE_LENGTH) {
      throw new BadRequestException(
        `note must be at most ${MAX_NOTE_LENGTH} characters`,
      );
    }

    const rater = this.resolveRater(principal);

    try {
      const row = await this.evalHumanLabelsService.upsert({
        failureType: trimToNull(input.failureType),
        note,
        rater,
        trajectoryId: input.trajectoryId,
        verdict,
      });

      return toAgentTrajectoryLabelObject(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('trajectory not found');
      }

      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description: `Remove your own label on an agent trajectory. Returns false when you had none; other raters' labels are never touched.`,
  })
  async removeAgentTrajectoryLabel(
    @Args('trajectoryId', { type: () => ID }) trajectoryId: string,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<boolean> {
    const rater = this.resolveRater(principal);

    return this.evalHumanLabelsService.remove({ rater, trajectoryId });
  }

  /**
   * Attribution is derived server-side (CLS displayName, then principal email, then subject), the
   * same way plan messages stamp their author. There is no input path for it.
   */
  private resolveRater(principal: AuthPrincipal | undefined): string {
    const rater = resolveNoteAuthor(
      null,
      this.globalCls.get('user'),
      principal,
    );

    if (rater == null) {
      throw new UnauthorizedException(
        'Labelling a trajectory needs an authenticated identity',
      );
    }

    return rater;
  }
}
