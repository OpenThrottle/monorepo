import { GraphQLError } from 'graphql';

import {
  PLAN_RUN_EXCLUDED_BY_TAG_CODE,
  RUN_EXCLUDED_PLAN_TAGS,
} from './run-excluded-tags.constants.ts';

/**
 * @description The first of the plan's tags that bars it from plan runs, or `undefined` when none
 * does. Matching ignores case and surrounding space.
 */
export const findRunExcludingTag = (
  tags: readonly string[],
): string | undefined => {
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .find((tag) => RUN_EXCLUDED_PLAN_TAGS.includes(tag));
};

/**
 * @description The rejection for a run on an excluded plan: an ordinary GraphQL error (HTTP 200,
 * `errors[]`) whose `extensions` carry {@link PLAN_RUN_EXCLUDED_BY_TAG_CODE}, the plan and the tag,
 * in the same shape as the schedule conflicts (`createPlanScheduleConflictError`).
 */
export const createPlanRunExcludedError = (params: {
  readonly planId: string;
  readonly tag: string;
}): GraphQLError => {
  const { planId, tag } = params;

  return new GraphQLError(
    `Plan ${planId} is tagged \`${tag}\`, which never runs as a plan run: its tasks are not coding work`,
    { extensions: { code: PLAN_RUN_EXCLUDED_BY_TAG_CODE, planId, tag } },
  );
};
