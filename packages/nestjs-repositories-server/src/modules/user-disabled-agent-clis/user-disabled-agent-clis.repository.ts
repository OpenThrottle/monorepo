import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { IsNull, Not, Repository } from 'typeorm';

import type { ModelPreferenceMap } from '../../model-preference-map/model-preference-map.types.ts';
import { toModelPreferenceMap } from '../../model-preference-map/model-preference-map.utils.ts';
import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity.ts';

/**
 * @description Data access for the openthrottle `user_disabled_agent_clis` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes, since a row is a toggle) plus per-user
 * agent and model enablement. The agent-level methods (`getDisabledBackends`, `isEnabled`,
 * `setEnabled`) scope strictly to `model IS NULL` rows so a per-model disable never masquerades
 * as an agent-level one. Validating backend and model ids against the drivers registry is the
 * caller's job.
 * @public
 */
@Injectable()
export class UserDisabledAgentClisRepository extends BaseRepository<
  UserDisabledAgentCli,
  CreateModelInput<UserDisabledAgentCli>
> {
  protected readonly tableName = 'user_disabled_agent_clis';

  constructor(
    @InjectRepository(UserDisabledAgentCli)
    repository: Repository<UserDisabledAgentCli>,
  ) {
    super(repository);
  }

  // ── Agent-level enablement (model IS NULL rows only) ──────────────────────

  /**
   * @description The backends this user has disabled at the AGENT level; empty by default.
   * Per-model disable rows are excluded, so "not in the set" means agent-enabled.
   */
  async getDisabledBackends(userId: string): Promise<Set<string>> {
    const rows = await this.findBy({ where: { model: IsNull(), userId } });
    return new Set(
      rows.map((row) => {
        return row.backend;
      }),
    );
  }

  /**
   * @description Whether a whole agent is enabled for the user (true unless an agent-level
   * disable row exists). Per-model disables do not affect this.
   */
  async isEnabled(userId: string, backend: string): Promise<boolean> {
    const existing = await this.findOne({
      where: { backend, model: IsNull(), userId },
    });
    return existing === null;
  }

  /**
   * @description Turns a whole agent on or off for a user, idempotently. Scoped to
   * `model IS NULL`, so it never touches per-model rows: an agent toggle is a non-destructive
   * master gate over them.
   */
  async setEnabled(
    userId: string,
    backend: string,
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.removeMany({ backend, model: IsNull(), userId });
      return;
    }

    if (!(await this.isEnabled(userId, backend))) {
      return;
    }
    await this.create({ backend, model: null, userId });
  }

  // ── Per-model enablement (non-null model rows) ────────────────────────────

  /**
   * @description The user's disabled MODELS, keyed backend → disabled model ids; empty by
   * default. Agent-level disables are excluded (combine with {@link getDisabledBackends}).
   */
  async getDisabledModels(userId: string): Promise<ModelPreferenceMap> {
    const rows = await this.findBy({ where: { userId } });
    return toModelPreferenceMap(rows);
  }

  /**
   * @description Whether a single model is enabled at the MODEL level (true unless a per-model
   * disable row exists). Does NOT account for an agent-level disable: callers that need
   * effective enablement also check {@link isEnabled}.
   */
  async isModelEnabled(
    userId: string,
    backend: string,
    model: string,
  ): Promise<boolean> {
    const existing = await this.findOne({ where: { backend, model, userId } });
    return existing === null;
  }

  /** @description Turns a single model on or off for a user, idempotently. */
  async setModelEnabled(
    userId: string,
    backend: string,
    model: string,
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.removeMany({ backend, model, userId });
      return;
    }

    if (!(await this.isModelEnabled(userId, backend, model))) {
      return;
    }
    await this.create({ backend, model, userId });
  }

  /**
   * @description Enables or disables EVERY model of a backend for a user at once (the setup
   * page's select-all). Enabling clears all per-model rows for the backend, leaving the
   * agent-level row alone; disabling inserts a row for each id in `models` not already
   * disabled. Both are idempotent, and disabling an empty `models` is a no-op.
   */
  async setModelsEnabled(
    userId: string,
    backend: string,
    models: readonly string[],
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.removeMany({ backend, model: Not(IsNull()), userId });
      return;
    }

    const existing = await this.findBy({ where: { backend, userId } });
    const alreadyDisabled = new Set(
      existing.map((row) => {
        return row.model;
      }),
    );
    const toInsert = models
      .filter((model) => {
        return !alreadyDisabled.has(model);
      })
      .map((model) => {
        return { backend, model, userId };
      });
    if (toInsert.length > 0) {
      await this.createMany(toInsert);
    }
  }
}
