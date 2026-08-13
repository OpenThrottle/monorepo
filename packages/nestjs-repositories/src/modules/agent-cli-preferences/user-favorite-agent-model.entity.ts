/**
 * @description TypeORM entity for the OpenThrottle user_favorite_agent_models table (migration 092).
 * Presence-as-favorite: a row (userId, backend, model) means the user starred that model; the absence
 * of a row means not-favorited. Favorite is orthogonal to enablement — it only floats/highlights a
 * model in pickers, it does not enable a disabled one. Rows are only ever inserted (favorite) or
 * deleted (unfavorite), so there is no updated_at column.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Scalar/column fields of UserFavoriteAgentModel (no relations). */
export type UserFavoriteAgentModelData = Pick<
  UserFavoriteAgentModel,
  'backend' | 'createdAt' | 'id' | 'model' | 'userId'
>;

@Entity('user_favorite_agent_models')
export class UserFavoriteAgentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'backend', type: 'text' })
  backend!: string;

  @Column({ name: 'model', type: 'text' })
  model!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
