/**
 * @description TypeORM entity for the openthrottle `user_skill_tags` table: one row per (user,
 * tag) in a user's skill-tag vocabulary. A tag is a toggle the user adds and removes, and the
 * defaults are reseeded on first read, so it extends `BaseHardDeleteModel`. It keeps its own
 * `updated_at` for renames. Matches databases/openthrottle/migrations (060, 063, 177).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../users/user.entity.ts';

@Entity('user_skill_tags')
export class UserSkillTag extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'tag', type: 'text' })
  tag!: string;

  @Column({ default: 'domain', name: 'dimension', type: 'text' })
  dimension!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
