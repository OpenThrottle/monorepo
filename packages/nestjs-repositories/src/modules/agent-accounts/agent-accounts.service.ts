/**
 * @description Typed persistence for agent_accounts — the agent-CLI logins that agent_token_usage
 * rows are billed to. Usage writers call {@link AgentAccountsService.upsertSeen} when they stamp a
 * row; the Usage route reads a user's accounts with {@link AgentAccountsService.listForUser}.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AgentAccount } from './agent-accounts.entity.ts';
import type { UpsertAgentAccountInput } from './agent-accounts.types.ts';

@Injectable()
export class AgentAccountsService {
  constructor(
    @InjectRepository(AgentAccount)
    private readonly repository: Repository<AgentAccount>,
  ) {}

  /**
   * @description Create the account, or refresh its descriptive fields and `last_seen_at`, in one
   * `INSERT … ON CONFLICT (user_id, provider, external_account_id) DO UPDATE`. A field the CLI
   * stopped reporting keeps its last known value. Returns the account id, or null when the
   * database returned none (the caller then writes its usage row unattributed).
   */
  async upsertSeen(input: UpsertAgentAccountInput): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(AgentAccount)
      .values({
        credentialKind: input.credentialKind,
        email: input.email,
        externalAccountId: input.externalAccountId,
        orgId: input.orgId,
        orgName: input.orgName,
        plan: input.plan,
        provider: input.provider,
        userId: input.userId,
      })
      .onConflict(
        `(user_id, provider, external_account_id) DO UPDATE SET
          credential_kind = EXCLUDED.credential_kind,
          email = COALESCE(EXCLUDED.email, agent_accounts.email),
          org_id = COALESCE(EXCLUDED.org_id, agent_accounts.org_id),
          org_name = COALESCE(EXCLUDED.org_name, agent_accounts.org_name),
          plan = COALESCE(EXCLUDED.plan, agent_accounts.plan),
          last_seen_at = NOW()`,
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
  listForUser(userId: string): Promise<AgentAccount[]> {
    return this.repository.find({
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

    return this.repository.find({ where: { id: In([...ids]), userId } });
  }
}
