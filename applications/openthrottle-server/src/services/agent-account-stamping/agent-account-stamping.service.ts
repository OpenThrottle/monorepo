import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentAccountsService } from '@openthrottle/nestjs-repositories';
import type {
  AgentAccountIdentity,
  AgentAccountResolver,
} from '@openthrottle/openthrottle-agentic-utils';

import { AGENT_ACCOUNT_RESOLVER } from './agent-account-stamping.constants.ts';

/**
 * @description Turns "which agent login was this turn billed to" into an `agent_accounts.id` for
 * a usage writer to stamp on its row. Stamping happens at write time, never at read time, because
 * a user can log out and back in under one config dir.
 *
 * Every method resolves null instead of throwing: attribution is best-effort and must never block
 * or drop the usage row it decorates.
 */
@Injectable()
export class AgentAccountStampingService {
  private readonly name = 'agent-account-stamping';

  constructor(
    private readonly accounts: AgentAccountsService,
    private readonly logger: LoggerService,
    @Inject(AGENT_ACCOUNT_RESOLVER)
    private readonly resolver: AgentAccountResolver,
  ) {
    this.logger.debug(`🪪 ${this.name} 🪪`);
  }

  /**
   * @description Resolve the account `provider` runs under `env` (the env the agent child was
   * spawned from) and upsert it for `userId`. Null when unattributed or on any failure.
   */
  async stampForRun(
    userId: string,
    provider: string,
    env: NodeJS.ProcessEnv,
  ): Promise<string | null> {
    try {
      const identity = await this.resolver.resolve(provider, { env });
      return await this.stampIdentity(userId, identity);
    } catch (error: unknown) {
      this.logFailure(error);
      return null;
    }
  }

  /**
   * @description Upsert an already-resolved identity (e.g. one a harness hook reported) for
   * `userId`. Null when it is unattributed or the upsert fails.
   */
  async stampIdentity(
    userId: string,
    identity: AgentAccountIdentity,
  ): Promise<string | null> {
    if (identity.kind === 'unattributed') {
      return null;
    }

    try {
      return await this.accounts.upsertSeen({
        credentialKind: identity.credentialKind,
        email: identity.email,
        externalAccountId: identity.externalAccountId,
        orgId: identity.orgId,
        orgName: identity.orgName,
        plan: identity.plan,
        provider: identity.provider,
        userId,
      });
    } catch (error: unknown) {
      this.logFailure(error);
      return null;
    }
  }

  private logFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`${this.name}: account not stamped: ${message}`);
  }
}
