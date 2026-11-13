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
import type {
  AgentAccount,
  TokenUsageAccountFilter,
  TokenUsageBatchRow,
} from '@openthrottle/nestjs-repositories';
import {
  AgentAccountsService,
  AgentTokenUsageService,
} from '@openthrottle/nestjs-repositories';
import type { IdentifiedAgentAccount } from '@openthrottle/openthrottle-agentic-utils';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentAccountStampingService } from '../../services/agent-account-stamping/agent-account-stamping.service.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { assertHumanAuthPrincipal } from '../service-accounts/service-accounts.utils.ts';
import { TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID } from './token-usage.constants.ts';
import { RecordTokenUsageInput } from './token-usage.input.ts';
import {
  toTokenUsageByAccountObject,
  toTokenUsageRowObject,
  toTokenUsageTotalsObject,
} from './token-usage.mapper.ts';
import {
  RecordTokenUsageResultObject,
  TokenUsageResultObject,
} from './token-usage.object.ts';
import {
  toTokenUsageBatchRows,
  toTokenUsageRowAccounts,
} from './token-usage-batch.mapper.ts';

/** The repository filter for the `accountId` argument; undefined = all accounts. */
const toAccountFilter = (
  accountId: string | null | undefined,
): TokenUsageAccountFilter | undefined => {
  const trimmed = accountId?.trim() ?? '';
  if (trimmed === '') {
    return undefined;
  }
  if (trimmed === TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID) {
    return { kind: 'unattributed' };
  }

  return { id: trimmed, kind: 'account' };
};

const accountKey = (account: IdentifiedAgentAccount): string => {
  return `${account.provider}\u0000${account.externalAccountId}`;
};

// @authz-stance: tokenUsage query = authenticated human user, scoped to their
// own rows. recordTokenUsage mutation = authenticated-only, like
// recordSkillUsage: a human JWT or a service account (ot_sa_…) linked to an
// acting user; rejected when no user resolves.
@Resolver()
@UseGuards(GqlPermissionsGuard)
export class TokenUsageResolver {
  constructor(
    private readonly accountStamping: AgentAccountStampingService,
    private readonly agentAccountsService: AgentAccountsService,
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

    const rows = await this.stampAccounts(
      userId,
      input.rows,
      toTokenUsageBatchRows(input.rows),
    );
    const { inserted, skipped } =
      await this.tokenUsageService.recordTokenUsageBatch(userId, rows);

    const result = new RecordTokenUsageResultObject();

    result.inserted = inserted;
    result.skipped = skipped;

    return result;
  }

  /**
   * Upsert each distinct account the batch reports (once per account, not per
   * row) and stamp its id on the rows that carry it. Unattributed rows, and any
   * whose upsert fails, keep a null account. A re-sent row that already exists
   * is skipped by the insert, so its stored account is never rewritten.
   */
  private async stampAccounts(
    userId: string,
    inputs: RecordTokenUsageInput['rows'],
    rows: TokenUsageBatchRow[],
  ): Promise<TokenUsageBatchRow[]> {
    const accounts = toTokenUsageRowAccounts(inputs);
    const distinct = new Map<string, IdentifiedAgentAccount>();
    for (const account of accounts) {
      if (account !== null) {
        distinct.set(accountKey(account), account);
      }
    }
    if (distinct.size === 0) {
      return rows;
    }

    const stamped = await Promise.all(
      [...distinct].map(
        async ([key, account]): Promise<readonly [string, string | null]> => {
          const id = await this.accountStamping.stampIdentity(userId, account);
          return [key, id];
        },
      ),
    );
    const idByKey = new Map(stamped);

    return rows.map((row, index) => {
      const account = accounts[index] ?? null;
      if (account === null) {
        return row;
      }

      return {
        ...row,
        agentAccountId: idByKey.get(accountKey(account)) ?? null,
      };
    });
  }

  @Query(() => TokenUsageResultObject, {
    description: `Per-turn token/cost usage for the authenticated user over [start, end] (inclusive, YYYY-MM-DD), optionally narrowed to one provider and/or one agent account. Returns rows (newest first), summed totals, and the same range summed per agent account.`,
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
    @Args('accountId', {
      description: `Restrict to one agent account id, or "${TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID}" for rows no account was stamped on; omit for all accounts.`,
      nullable: true,
      type: () => String,
    })
    accountId?: string | null,
  ): Promise<TokenUsageResultObject> {
    const user = assertHumanAuthPrincipal(principal);
    const query = {
      account: toAccountFilter(accountId),
      end,
      provider,
      start,
      userId: user.sub,
    };

    const [rows, totals, byAccount] = await Promise.all([
      this.tokenUsageService.listUsageInRange(query),
      this.tokenUsageService.getUsageTotalsInRange(query),
      this.tokenUsageService.getUsageByAccountInRange(query),
    ]);
    const accountIds = [
      ...new Set(
        byAccount
          .map((bucket) => bucket.agentAccountId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const accounts = await this.agentAccountsService.listByIds(
      user.sub,
      accountIds,
    );
    const accountById = new Map<string, AgentAccount>(
      accounts.map((account) => [account.id, account]),
    );

    const result = new TokenUsageResultObject();

    result.byAccount = byAccount.map((bucket) => {
      const account = accountById.get(bucket.agentAccountId ?? '') ?? null;

      return toTokenUsageByAccountObject(bucket, account);
    });
    result.items = rows.map(toTokenUsageRowObject);
    result.totals = toTokenUsageTotalsObject(totals);

    return result;
  }
}
