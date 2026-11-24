/**
 * @description TypeORM entity for the openthrottle `user_favorite_agent_models` table.
 * Presence-as-favorite: a row (userId, driver, model) means the user starred that model; the
 * absence of a row means not-favorited. Favorite is orthogonal to enablement: it only floats or
 * highlights a model in pickers and never enables a disabled one. Rows are only ever inserted
 * (favorite) or deleted (unfavorite), so it extends `BaseHardDeleteModel` and has no
 * `updated_at`. Matches databases/openthrottle/migrations (092, 171).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('user_favorite_agent_models')
export class UserFavoriteAgentModel extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'driver', type: 'text' })
  driver!: string;

  @Column({ name: 'model', type: 'text' })
  model!: string;
}
