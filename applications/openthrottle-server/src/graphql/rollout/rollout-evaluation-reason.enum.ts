/**
 * @description Registers the `RolloutEvaluationReason` GraphQL enum from
 * `@openthrottle/nestjs-rollout` so SDL and domain evaluation reasons stay aligned.
 */

import { registerEnumType } from '@nestjs/graphql';
import { ROLLOUT_EVALUATION_REASON } from '@openthrottle/nestjs-rollout';
import type { RolloutEvaluationReason } from '@openthrottle/nestjs-rollout';

/**
 * Runtime enum object for code-first registration. Lowercase GraphQL names match
 * domain reason strings.
 */
export const RolloutEvaluationReasonEnum: Readonly<
  Record<string, RolloutEvaluationReason>
> = Object.fromEntries(
  Object.values(ROLLOUT_EVALUATION_REASON).map(
    (reason): readonly [RolloutEvaluationReason, RolloutEvaluationReason] => [
      reason,
      reason,
    ],
  ),
);

registerEnumType(RolloutEvaluationReasonEnum, {
  description:
    'Why a rollout variation was chosen: off | target_roles | fallthrough | flag_not_found.',
  name: 'RolloutEvaluationReason',
});
