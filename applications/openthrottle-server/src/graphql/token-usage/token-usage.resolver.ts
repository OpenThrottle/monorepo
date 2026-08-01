/**
 * @description GraphQL resolver for user-scoped token usage. Returns the
 * authenticated human user's per-turn usage rows + summed totals over a date
 * range, optionally narrowed to one provider. Mirrors daily-stats auth, plus
 * per-user scoping (WHERE user_id = principal.sub).
 */

import { AgentTokenUsageService } from '@openthrottle/nestjs-repositories';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { assertHumanAuthPrincipal } from '../service-accounts/assert-human-auth-principal';
import {
  toTokenUsageRowObject,
  toTokenUsageTotalsObject,
} from './token-usage.mapper';
import { TokenUsageResultObject } from './token-usage.object';

// @authz-stance: authenticated human user, scoped to their own rows.
@Resolver()
@UseGuards(GqlPermissionsGuard)
export class TokenUsageResolver {
  constructor(private readonly tokenUsageService: AgentTokenUsageService) {}

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
