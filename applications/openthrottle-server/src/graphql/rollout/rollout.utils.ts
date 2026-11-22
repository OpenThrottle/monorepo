/**
 * @description Resolves the AuthPrincipal used for RolloutService.evaluateAll on
 * the public evaluateFeatureFlags path: authenticated principal wins, else
 * a UUID-shaped anonymousId as a user-shaped subject (no roles), else a fixed
 * degraded UUID so callers that omit both, or send a malformed anonymousId,
 * still get evaluations (shared bucket).
 */
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';

import {
  ROLLOUT_ANONYMOUS_ID_PATTERN,
  ROLLOUT_DEGRADED_ANONYMOUS_SUB,
} from './rollout.constants.ts';
/**
 * @description Picks the evaluation principal. JWT/SA principal wins over
 * anonymousId; missing both uses {@link ROLLOUT_DEGRADED_ANONYMOUS_SUB}. A
 * non-UUID anonymousId is ignored the same way: the subject reaches a Postgres
 * `uuid` lookup, and this path is public, so a malformed value must degrade
 * rather than surface as a 500.
 */
export const resolveEvaluationPrincipal = (
  principal: AuthPrincipal | undefined,
  anonymousId: string | null | undefined,
): AuthPrincipal => {
  if (principal != null) {
    return principal;
  }

  const trimmed =
    typeof anonymousId === 'string' ? anonymousId.trim() : undefined;

  if (trimmed != null && ROLLOUT_ANONYMOUS_ID_PATTERN.test(trimmed)) {
    return {
      kind: AUTH_PRINCIPAL_KIND_USER,
      sub: trimmed,
    };
  }

  return {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: ROLLOUT_DEGRADED_ANONYMOUS_SUB,
  };
};
