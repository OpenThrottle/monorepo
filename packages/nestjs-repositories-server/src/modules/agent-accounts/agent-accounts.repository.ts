import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { In, Repository } from 'typeorm';

import { AgentAccount } from './agent-account.entity.ts';
import type { UpsertAgentAccountInput } from './agent-accounts.types.ts';

/**
 * @description Data access for the openthrottle `agent_accounts` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes) plus the usage writers' upsert
 * ({@link AgentAccountsRepository.upsertSeen}) and the Usage route's user-scoped reads.
 * @public
 */
@Injectable()
export class AgentAccountsRepository extends BaseRepository<
  AgentAccount,
  CreateModelInput<AgentAccount>
> {
  protected readonly tableName = 'agent_accounts';

  constructor(
    @InjectRepository(AgentAccount)
    repository: Repository<AgentAccount>,
  ) {
    super(repository);
  }

  /**
   * @description Create the account, or refresh its descriptive fields and `last_seen_at`, in one
   * `INSERT … ON CONFLICT (user_id, provider, external_account_id) DO UPDATE`. A field the CLI
   * stopped reporting (null) is left out of the update, so it keeps its last known value.
   * Returns the account id, or null when the database returned none (the caller then writes its
   * usage row unattributed).
   */
  async upsertSeen(input: UpsertAgentAccountInput): Promise<string | null> {
    const reportedColumns = [
      input.email === null ? null : 'email',
      input.orgId === null ? null : 'org_id',
      input.orgName === null ? null : 'org_name',
      input.plan === null ? null : 'plan',
    ].filter((column) => {
      return column !== null;
    });

    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(AgentAccount)
      .values({
        credentialKind: input.credentialKind,
        email: input.email,
        externalAccountId: input.externalAccountId,
        lastSeenAt: () => {
          return 'NOW()';
        },
        orgId: input.orgId,
        orgName: input.orgName,
        plan: input.plan,
        provider: input.provider,
        userId: input.userId,
      })
      .orUpdate(
        ['credential_kind', 'last_seen_at', ...reportedColumns],
        ['user_id', 'provider', 'external_account_id'],
      )
      .returning('id')
      .execute();

    const [row]: unknown[] = Array.isArray(result.raw) ? result.raw : [];
    if (typeof row !== 'object' || row === null || !('id' in row)) {
      return null;
    }

    return typeof row.id === 'string' ? row.id : null;
  }

  /** @description The user's accounts, most recently used first. */
  async listForUser(userId: string): Promise<AgentAccount[]> {
    return this.findBy({
      order: { lastSeenAt: 'DESC' },
      where: { userId },
    });
  }

  /** @description The user's accounts among `ids` (user-scoped, so a foreign id never resolves). */
  async listByIds(
    userId: string,
    ids: readonly string[],
  ): Promise<AgentAccount[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.findBy({ where: { id: In([...ids]), userId } });
  }
}
