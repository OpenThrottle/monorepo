/**
 * @description GraphQL resolver for user-scoped token usage. Returns the
 * authenticated human user's per-turn usage rows + summed totals over a date
 * range, optionally narrowed to one provider. Mirrors daily-stats auth, plus
 * per-user scoping (WHERE user_id = principal.sub). Also hosts the
 * recordTokenUsage batch ingest used by agent-harness hooks.
 */

import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { AgentTokenUsageService } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { assertHumanAuthPrincipal } from '../service-accounts/assert-human-auth-principal.ts';
import { RecordTokenUsageInput } from './token-usage.input.ts';
import {
  toTokenUsageRowObject,
  toTokenUsageTotalsObject,
} from './token-usage.mapper.ts';
import {
  RecordTokenUsageResultObject,
  TokenUsageResultObject,
} from './token-usage.object.ts';
import { toTokenUsageBatchRows } from './token-usage-batch.mapper.ts';

// @authz-stance: tokenUsage query = authenticated human user, scoped to their
// own rows. recordTokenUsage mutation = authenticated-only, like
// recordSkillUsage: a human JWT or a service account (ot_sa_…) linked to an
// acting user; rejected when no user resolves.
@Resolver()
@UseGuards(GqlPermissionsGuard)
export class TokenUsageResolver {
  constructor(
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly tokenUsageService: AgentTokenUsageService,
  ) {}

  @Mutation(() => RecordTokenUsageResultObject, {
    description: `Batch-ingest hook-captured token usage rows (at most 500). Rows are attributed to the human user the authenticated principal acts as (human JWT, or a service account's acting user); a userId is never accepted from the client. Idempotent: rows whose (source, sessionId, requestId) already exist are skipped. created_at is the row's occurredAt, not ingest time. Any invalid row rejects the whole batch with BAD_REQUEST naming the row index.`,
  })
  async recordTokenUsage(
    @Args('input', { type: () => RecordTokenUsageInput })
    input: RecordTokenUsageInput,
    @CurrentUser('sub') sub?: string,
  ): Promise<RecordTokenUsageResultObject> {
    // user_id is NOT NULL, so unlike skill usage an unresolved principal is a
    // rejection, not an honest null. Checked before the batch is validated so a
    // broken credential is never mistaken for a poisoned row (which the client
    // dead-letters).
    const userId =
      await this.effectiveUserResolutionService.resolveEffectiveUserId(sub);
    if (userId == null) {
      throw new ForbiddenException(
        'Token usage can only be recorded for an authenticated user (or a service account linked to one)',
      );
    }

    const rows = toTokenUsageBatchRows(input.rows);
    const { inserted, skipped } =
      await this.tokenUsageService.recordTokenUsageBatch(userId, rows);

    const result = new RecordTokenUsageResultObject();

    result.inserted = inserted;
    result.skipped = skipped;

    return result;
  }

  @Query(() => TokenUsageResultObject, {
    description: `Per-turn token/cost usage for the authenticated user over [start, end] (inclusive, YYYY-MM-DD), optionally narrowed to one provider. Returns rows (newest first) + summed totals.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async tokenUsage(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('start', { description: 'Start date (inclusive), YYYY-MM-DD' })
    start: string,
    @Args('end', { description: 'End date (inclusive), YYYY-MM-DD' })
    end: string,
    @Args('provider', {
      description: 'Restrict to one provider; omit for all providers.',
      nullable: true,
      type: () => String,
    })
    provider?: string | null,
  ): Promise<TokenUsageResultObject> {
    const user = assertHumanAuthPrincipal(principal);
    const query = { end, provider, start, userId: user.sub };

    const [rows, totals] = await Promise.all([
      this.tokenUsageService.listUsageInRange(query),
      this.tokenUsageService.getUsageTotalsInRange(query),
    ]);

    const result = new TokenUsageResultObject();

    result.items = rows.map(toTokenUsageRowObject);
    result.totals = toTokenUsageTotalsObject(totals);

    return result;
  }
}
