import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import type { ModelPreferenceMap } from '../../model-preference-map/model-preference-map.types.ts';
import { toModelPreferenceMap } from '../../model-preference-map/model-preference-map.utils.ts';
import { UserFavoriteAgentModel } from './user-favorite-agent-model.entity.ts';

/**
 * @description Data access for the openthrottle `user_favorite_agent_models` table on the
 * default connection: the `BaseRepository` CRUD (hard deletes, so re-starring a model never
 * collides with an old row under the unique constraint) plus per-user model favorites.
 * @public
 */
@Injectable()
export class UserFavoriteAgentModelsRepository extends BaseRepository<
  UserFavoriteAgentModel,
  CreateModelInput<UserFavoriteAgentModel>
> {
  protected readonly tableName = 'user_favorite_agent_models';

  constructor(
    @InjectRepository(UserFavoriteAgentModel)
    repository: Repository<UserFavoriteAgentModel>,
  ) {
    super(repository);
  }

  /**
   * @description The user's favorited MODELS, keyed driver → model ids; empty when the user
   * has starred nothing.
   */
  async getFavoriteModels(userId: string): Promise<ModelPreferenceMap> {
    const rows = await this.findBy({ where: { userId } });
    return toModelPreferenceMap(rows);
  }

  /** @description Whether the user has favorited a single model. */
  async isFavoriteModel(
    userId: string,
    driver: string,
    model: string,
  ): Promise<boolean> {
    const existing = await this.findOne({ where: { driver, model, userId } });
    return existing !== null;
  }

  /**
   * @description Stars or unstars a single model for a user, idempotently. Never touches
   * enablement.
   */
  async setModelFavorite(
    userId: string,
    driver: string,
    model: string,
    favorite: boolean,
  ): Promise<void> {
    if (!favorite) {
      await this.removeMany({ driver, model, userId });
      return;
    }

    if (await this.isFavoriteModel(userId, driver, model)) {
      return;
    }
    await this.create({ driver, model, userId });
  }
}
