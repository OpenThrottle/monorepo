import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type { ScheduledAgentJob } from '@openthrottle/nestjs-repositories-server';

const IDEMPOTENCY_KEY_MAX_LENGTH = 200;

/**
 * @description The user id an agent call acts as. A user principal acts as itself. A service
 * account (the MCP's usual bearer token) acts as its linked `acting_user_id`, resolved by
 * `resolveEffectiveUserId`; one with no link (or a disabled one) owns nothing and is refused.
 * Permissions still come from the principal's own roles: the link only decides whose jobs these are.
 */
export const agentOwnerUserIdFor = async (
  principal: AuthPrincipal,
  resolveEffectiveUserId: (sub: string) => Promise<string | null>,
): Promise<string> => {
  if (principal.kind === AUTH_PRINCIPAL_KIND_USER) {
    return principal.sub;
  }

  const actingUserId = await resolveEffectiveUserId(principal.sub);
  if (actingUserId === null) {
    throw new ForbiddenException(
      `This service account has no acting user, so it cannot use the agent scheduling tools. Link it to a user (service account actingUserId) or sign in as a user.`,
    );
  }

  return actingUserId;
};

/**
 * @description Rejects a job the agent may not touch: missing, owned by anyone else (a null-owner
 * system row included), or not created through the agent path. Human-created jobs are list and
 * run-now only from here. Returns the job.
 */
export const assertAgentManagedJob = (
  job: ScheduledAgentJob | null,
  id: string,
  ownerUserId: string,
): ScheduledAgentJob => {
  if (job === null || job.ownerUserId !== ownerUserId) {
    throw new ForbiddenException(`Scheduled job ${id} not found`);
  }
  if (job.createdVia !== 'mcp') {
    throw new ForbiddenException(
      `Scheduled job ${id} was not created by an agent; the agent tools can only list or run it, not change or delete it.`,
    );
  }

  return job;
};

/**
 * @description Rejects a job that is not the caller's own (missing and foreign look the same).
 * Used where any job of the owner is allowed, regardless of who created it. Returns the job.
 */
export const assertOwnedJob = (
  job: ScheduledAgentJob | null,
  id: string,
  ownerUserId: string,
): ScheduledAgentJob => {
  if (job === null || job.ownerUserId !== ownerUserId) {
    throw new ForbiddenException(`Scheduled job ${id} not found`);
  }

  return job;
};

/** @description The trimmed idempotency key; rejects an empty or over-long one. */
export const normalizeIdempotencyKey = (raw: string): string => {
  const key = raw.trim();
  if (key === '' || key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestException(
      `idempotencyKey must be 1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
    );
  }

  return key;
};
