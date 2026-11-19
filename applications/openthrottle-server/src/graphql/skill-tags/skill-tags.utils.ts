import type {
  SkillTagWriteResult,
  UserSkillTag,
} from '@openthrottle/nestjs-repositories-server';
import { SKILL_TAG_WRITE_RESULT_KIND } from '@openthrottle/nestjs-repositories-server';
import { GraphQLError } from 'graphql';

import { SKILL_TAG_CONFLICT_CODE } from './skill-tags.constants.ts';

/**
 * @description Builds the duplicate-tag rejection: a GraphQL error carrying
 * {@link SKILL_TAG_CONFLICT_CODE} and the duplicate `tag`. It travels as an ordinary GraphQL error
 * (HTTP 200, `errors[]`), so it deliberately sets no `extensions.http.status`.
 *
 * A GraphQLError rather than Nest's ConflictException on purpose: the Apollo driver maps a 409
 * HttpException to `INTERNAL_SERVER_ERROR`, and the shared `formatError` masks every
 * INTERNAL_SERVER_ERROR message in production, so the client would only see "Internal server error".
 */
export const createSkillTagConflictError = (tag: string): GraphQLError => {
  return new GraphQLError(
    `Tag "${tag}" is already in your skill-tag vocabulary.`,
    { extensions: { code: SKILL_TAG_CONFLICT_CODE, tag } },
  );
};

/**
 * @description Unwraps a skill-tag write for a resolver: the stored row on `ok`, or throws
 * {@link createSkillTagConflictError} on `conflict`.
 */
export const unwrapSkillTagWriteResult = (
  result: SkillTagWriteResult,
): UserSkillTag => {
  if (result.kind === SKILL_TAG_WRITE_RESULT_KIND.CONFLICT) {
    throw createSkillTagConflictError(result.tag);
  }

  return result.value;
};
