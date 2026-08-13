/**
 * @description Per-user agent-CLI enablement preferences. Presence-as-disabled: the store records the
 * backends a user has turned OFF; anything not present is enabled (default all-enabled). `setEnabled`
 * inserts a row to disable and deletes it to enable; `getDisabledBackends` / `isEnabled` read the set.
 * Backend-id validation (against the drivers registry) is the caller's responsibility — this service
 * is a thin persistence layer and never spawns anything.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity';

@Injectable()
export class AgentCliPreferencesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(UserDisabledAgentCli)
    private readonly disabledRepository: Repository<UserDisabledAgentCli>,
  ) {
    this.logger.debug('🎛️ agent-cli-preferences 🎛️');
  }

  /**
   * @description The set of backends this user has disabled. Empty when the user has disabled nothing
   * (the default), so callers treat "not in the set" as enabled.
   */
  async getDisabledBackends(userId: string): Promise<Set<string>> {
    const rows = await this.disabledRepository.find({ where: { userId } });
    return new Set(rows.map((row) => row.backend));
  }

  /**
   * @description Whether a single backend is enabled for the user (true unless a disable row exists).
   */
  async isEnabled(userId: string, backend: string): Promise<boolean> {
    const existing = await this.disabledRepository.findOne({
      where: { backend, userId },
    });
    return existing == null;
  }

  /**
   * @description Turn a backend on/off for a user. `enabled: true` clears any disable row (idempotent
   * — no-op when already enabled); `enabled: false` inserts a disable row, ignoring a duplicate so a
   * repeat disable is idempotent under the (user_id, backend) unique constraint.
   */
  async setEnabled(
    userId: string,
    backend: string,
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.disabledRepository.delete({ backend, userId });
      return;
    }

    const existing = await this.disabledRepository.findOne({
      where: { backend, userId },
    });
    if (existing != null) {
      return;
    }
    await this.disabledRepository.save(
      this.disabledRepository.create({ backend, userId }),
    );
  }
}
