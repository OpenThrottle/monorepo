/**
 * @description TypeORM entity for the openthrottle `user_favorite_projects` table.
 * Presence-as-favorite: a row (userId, projectId) means the user starred that project; the
 * absence of a row means not starred. Keyed by the pair, so it extends no base model and rows
 * are only ever inserted (star) or hard deleted (unstar). Matches
 * databases/openthrottle/migrations/206.
 * @public
 */

import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_favorite_projects')
export class UserFavoriteProject {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
