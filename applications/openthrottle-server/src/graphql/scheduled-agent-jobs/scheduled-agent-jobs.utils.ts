import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type {
  ScheduledAgentJob,
  UserDisabledAgentClisRepository,
} from '@openthrottle/nestjs-repositories-server';
import { GraphQLError } from 'graphql';

import type { ScheduledAgentJobsLoaders } from './loaders/loaders.service.ts';
import type { ScheduledAgentJobRepositoryObject } from './scheduled-agent-job.object.ts';
import type { SCHEDULED_AGENT_JOB_LIMIT_CODES } from './scheduled-agent-jobs.constants.ts';
import type { ScheduledAgentJobLimits } from './scheduled-agent-jobs.types.ts';

/**
 * @description Loads a targeted checkout for display, batched per request. A deleted checkout resolves
 * to null rather than an error: the run's `resolvedCwd` still records where it happened.
 */
export const resolveTargetRepository = async (
  loaders: ScheduledAgentJobsLoaders,
  repositoryCheckoutId: string | null,
): Promise<ScheduledAgentJobRepositoryObject | null> => {
  if (repositoryCheckoutId === null) return null;

  const checkout = await loaders.checkoutLoader.load(repositoryCheckoutId);
  if (checkout === null) return null;

  return {
    displayName: checkout.displayName,
    filesystemPath: checkout.filesystemPath,
    id: checkout.id,
  };
};

/** @description The owner id a principal acts as: the user's id, or null for a service account. */
export const ownerUserIdFor = (principal: AuthPrincipal): string | null => {
  return principal.kind === AUTH_PRINCIPAL_KIND_USER ? principal.sub : null;
};

/**
 * @description Rejects a mutation on a schedule that does not exist or is owned by a different
 * user. Null-owner rows, and service-account principals, are open. Returns the job.
 */
export const assertScheduledAgentJobOwner = (
  job: ScheduledAgentJob | null,
  id: string,
  principal: AuthPrincipal,
): ScheduledAgentJob => {
  if (job === null) {
    throw new ForbiddenException(`Scheduled job ${id} not found`);
  }

  const callerId = ownerUserIdFor(principal);
  if (
    job.ownerUserId !== null &&
    callerId !== null &&
    job.ownerUserId !== callerId
  ) {
    throw new ForbiddenException(
      `Scheduled job ${id} is owned by another user`,
    );
  }

  return job;
};

/**
 * @description Approval is the human checkpoint on an agent-created job, so only a signed-in user
 * may give it. A service account is refused whatever its permissions: the MCP token holds
 * `settings:write` like a user does, and a service account given a user role would inherit any
 * dedicated approve permission too, so only the principal kind tells the two apart (threat model
 * T10 in docs/openthrottle/webhook-triggered-agent-jobs.md).
 */
export const assertHumanApprover = (principal: AuthPrincipal): void => {
  if (principal.kind !== AUTH_PRINCIPAL_KIND_USER) {
    throw new ForbiddenException(
      `Only a signed-in user can approve a scheduled job; service-account tokens cannot.`,
    );
  }
};

/** Env var: most live jobs one owner may have, whichever surface created them. */
const MAX_PER_OWNER_ENV = 'SCHEDULED_AGENT_JOBS_MAX_PER_OWNER';
const DEFAULT_MAX_PER_OWNER = 25;
/** Most live agent-created (`created_via = 'mcp'`) jobs one owner may have. Not configurable. */
const MAX_MCP_PER_OWNER = 10;
/** Env var: when `true`, agent-created jobs are stored disabled until a human approves them. */
const MCP_REQUIRE_APPROVAL_ENV = 'SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL';

/**
 * @description Reads the scheduling guardrails from `env`. A missing, non-integer or non-positive
 * `SCHEDULED_AGENT_JOBS_MAX_PER_OWNER` falls back to 25; approval is on only for the exact value
 * `true` (case-insensitive).
 */
export const resolveScheduledAgentJobLimits = (
  env: Readonly<Record<string, string | undefined>>,
): ScheduledAgentJobLimits => {
  const parsed = Number.parseInt(env[MAX_PER_OWNER_ENV] ?? '', 10);
  const maxPerOwner =
    Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PER_OWNER;

  return {
    maxMcpPerOwner: MAX_MCP_PER_OWNER,
    maxPerOwner,
    mcpRequireApproval:
      env[MCP_REQUIRE_APPROVAL_ENV]?.trim().toLowerCase() === 'true',
  };
};

/**
 * @description A guardrail rejection as a GraphQLError carrying a stable `extensions.code`. A
 * GraphQLError rather than Nest's ConflictException so the code reaches the client (see the
 * skill-tags conflict error).
 */
export const createScheduledAgentJobGuardrailError = (
  code: (typeof SCHEDULED_AGENT_JOB_LIMIT_CODES)[keyof typeof SCHEDULED_AGENT_JOB_LIMIT_CODES],
  message: string,
): GraphQLError => {
  return new GraphQLError(message, { extensions: { code } });
};

/**
 * @description Rejects scheduling a job against an agent backend — or a specific model of that
 * backend — the owner has disabled on /settings/agents. A null owner (service-account principal) has
 * no per-user preferences, so the check is skipped. A KNOWN-but-disabled non-empty model is rejected.
 */
export const assertScheduledAgentEnabled = async (
  disabledAgentClis: UserDisabledAgentClisRepository,
  ownerUserId: string | null,
  driverId: string,
  model?: string | null,
): Promise<void> => {
  if (ownerUserId === null) {
    return;
  }
  if (!(await disabledAgentClis.isEnabled(ownerUserId, driverId))) {
    throw new BadRequestException(
      `The ${driverId} agent is disabled. Re-enable it on Settings › Setup to schedule it.`,
    );
  }
  const trimmedModel = model?.trim() ?? '';
  if (
    trimmedModel !== '' &&
    !(await disabledAgentClis.isModelEnabled(
      ownerUserId,
      driverId,
      trimmedModel,
    ))
  ) {
    throw new BadRequestException(
      `The ${trimmedModel} model is disabled. Re-enable it on Settings › Setup to schedule it.`,
    );
  }
};
