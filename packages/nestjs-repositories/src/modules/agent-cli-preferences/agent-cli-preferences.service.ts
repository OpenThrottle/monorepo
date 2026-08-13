/**
 * @description Per-user agent-CLI enablement + favorite preferences. Presence-as-disabled /
 * presence-as-favorite: the store records what a user has turned OFF and which models they have
 * STARRED; anything absent is enabled / not-favorited (defaults). Granularity is discriminated by the
 * nullable `model` on the disabled table — `model` null = the whole agent, non-null = a single model.
 * The agent-level API (`getDisabledBackends`/`isEnabled`/`setEnabled`) therefore scopes strictly to
 * `model IS NULL` rows so a per-model disable never masquerades as an agent-level one. Backend/model
 * validation (against the drivers registry) is the caller's responsibility — this service is a thin
 * persistence layer and never spawns anything.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { IsNull, Repository } from 'typeorm';
import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity';
import { UserFavoriteAgentModel } from './user-favorite-agent-model.entity';

/**
 * A per-user overlay of model-level preferences, keyed by backend → set of model ids. Used for both
 * the disabled-models and favorite-models projections so callers can answer per-(backend, model)
 * questions from a single fetch.
 */
export type ModelPreferenceMap = ReadonlyMap<string, ReadonlySet<string>>;

/** Build a backend → Set<model> map from rows carrying a non-null model. */
function toModelMap(
  rows: readonly { backend: string; model: string | null }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.model == null) {
      continue;
    }
    const existing = map.get(row.backend);
    if (existing) {
      existing.add(row.model);
    } else {
      map.set(row.backend, new Set([row.model]));
    }
  }
  return map;
}

@Injectable()
export class AgentCliPreferencesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(UserDisabledAgentCli)
    private readonly disabledRepository: Repository<UserDisabledAgentCli>,
    @InjectRepository(UserFavoriteAgentModel)
    private readonly favoriteRepository: Repository<UserFavoriteAgentModel>,
  ) {
    this.logger.debug('🎛️ agent-cli-preferences 🎛️');
  }

  // ── Agent-level enablement (model IS NULL rows only) ──────────────────────

  /**
   * @description The set of backends this user has disabled at the AGENT level. Empty when the user
   * has disabled no whole agent (the default). Per-model disable rows are excluded, so callers treat
   * "not in the set" as agent-enabled.
   */
  async getDisabledBackends(userId: string): Promise<Set<string>> {
    const rows = await this.disabledRepository.find({
      where: { model: IsNull(), userId },
    });
    return new Set(rows.map((row) => row.backend));
  }

  /**
   * @description Whether a whole agent is enabled for the user (true unless an agent-level disable row
   * exists). Per-model disables do not affect this — they narrow within an enabled agent.
   */
  async isEnabled(userId: string, backend: string): Promise<boolean> {
    const existing = await this.disabledRepository.findOne({
      where: { backend, model: IsNull(), userId },
    });
    return existing == null;
  }

  /**
   * @description Turn a whole agent on/off for a user. `enabled: true` clears the agent-level disable
   * row (idempotent); `enabled: false` inserts one, ignoring a duplicate. Scoped to `model IS NULL`
   * so it never touches per-model rows — an agent toggle is a non-destructive master gate over them.
   */
  async setEnabled(
    userId: string,
    backend: string,
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.disabledRepository.delete({
        backend,
        model: IsNull(),
        userId,
      });
      return;
    }

    const existing = await this.disabledRepository.findOne({
      where: { backend, model: IsNull(), userId },
    });
    if (existing != null) {
      return;
    }
    await this.disabledRepository.save(
      this.disabledRepository.create({ backend, model: null, userId }),
    );
  }

  // ── Per-model enablement (non-null model rows) ────────────────────────────

  /**
   * @description The user's disabled MODELS, keyed backend → set of disabled model ids. Empty map
   * when nothing is disabled. Only non-null-model rows; agent-level disables are excluded (callers
   * combine both via {@link getDisabledBackends}).
   */
  async getDisabledModels(userId: string): Promise<ModelPreferenceMap> {
    const rows = await this.disabledRepository.find({ where: { userId } });
    return toModelMap(rows);
  }

  /**
   * @description Whether a single model is enabled for the user at the MODEL level (true unless a
   * per-model disable row exists). This does NOT account for an agent-level disable — callers that
   * need effective-enabled must also check {@link isEnabled}.
   */
  async isModelEnabled(
    userId: string,
    backend: string,
    model: string,
  ): Promise<boolean> {
    const existing = await this.disabledRepository.findOne({
      where: { backend, model, userId },
    });
    return existing == null;
  }

  /**
   * @description Turn a single model on/off for a user. `enabled: true` clears the per-model disable
   * row (idempotent); `enabled: false` inserts one, ignoring a duplicate under the partial unique
   * index on (user_id, backend, model) WHERE model IS NOT NULL.
   */
  async setModelEnabled(
    userId: string,
    backend: string,
    model: string,
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.disabledRepository.delete({ backend, model, userId });
      return;
    }

    const existing = await this.disabledRepository.findOne({
      where: { backend, model, userId },
    });
    if (existing != null) {
      return;
    }
    await this.disabledRepository.save(
      this.disabledRepository.create({ backend, model, userId }),
    );
  }

  // ── Per-model favorites (presence-as-favorite) ────────────────────────────

  /**
   * @description The user's favorited MODELS, keyed backend → set of model ids. Empty map when the
   * user has starred nothing (the default).
   */
  async getFavoriteModels(userId: string): Promise<ModelPreferenceMap> {
    const rows = await this.favoriteRepository.find({ where: { userId } });
    return toModelMap(rows);
  }

  /**
   * @description Whether a single model is favorited by the user (a favorite row exists).
   */
  async isFavoriteModel(
    userId: string,
    backend: string,
    model: string,
  ): Promise<boolean> {
    const existing = await this.favoriteRepository.findOne({
      where: { backend, model, userId },
    });
    return existing != null;
  }

  /**
   * @description Star/unstar a single model for a user. `favorite: true` inserts a favorite row,
   * ignoring a duplicate (idempotent under the unique constraint); `favorite: false` deletes it.
   * Orthogonal to enablement — favoriting never enables a disabled model.
   */
  async setModelFavorite(
    userId: string,
    backend: string,
    model: string,
    favorite: boolean,
  ): Promise<void> {
    if (!favorite) {
      await this.favoriteRepository.delete({ backend, model, userId });
      return;
    }

    const existing = await this.favoriteRepository.findOne({
      where: { backend, model, userId },
    });
    if (existing != null) {
      return;
    }
    await this.favoriteRepository.save(
      this.favoriteRepository.create({ backend, model, userId }),
    );
  }
}
