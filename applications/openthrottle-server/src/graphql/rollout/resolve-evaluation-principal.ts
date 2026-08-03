/**
 * @description Resolves the AuthPrincipal used for RolloutService.evaluateAll on
 * the public evaluateFeatureFlags path: authenticated principal wins, else
 * anonymousId as a user-shaped subject (no roles), else a fixed degraded UUID
 * so callers that omit both still get evaluations (shared bucket).
 */

import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';

/** Shared subject when neither auth nor anonymousId is present. */
export const ROLLOUT_DEGRADED_ANONYMOUS_SUB =
  '00000000-0000-4000-8000-000000000000' as const;

/**
 * @description Picks the evaluation principal. JWT/SA principal wins over
 * anonymousId; missing both uses {@link ROLLOUT_DEGRADED_ANONYMOUS_SUB}.
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

  if (trimmed != null && trimmed.length > 0) {
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
