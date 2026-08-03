/**
 * @description TypeORM entity for the rollout feature-flags table. Matches
 * databases/migrations (084, 089).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ROLLOUT_FLAG_KIND,
  type RolloutFallthrough,
  type RolloutFlagKind,
  type RolloutFlagVariation,
} from './rollout-flag.constants';

/** Scalar/column fields of RolloutFlag (no relations). */
export type RolloutFlagData = Pick<
  RolloutFlag,
  | 'createdAt'
  | 'description'
  | 'enabled'
  | 'fallthrough'
  | 'id'
  | 'key'
  | 'kind'
  | 'offVariation'
  | 'targetRoles'
  | 'updatedAt'
  | 'variations'
>;

@Entity('rollout_flags')
export class RolloutFlag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'key', type: 'text' })
  key!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ default: false, name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  @Column({
    array: true,
    default: () => "'{}'",
    name: 'target_roles',
    type: 'text',
  })
  targetRoles!: string[];

  @Column({
    default: ROLLOUT_FLAG_KIND.BOOLEAN,
    name: 'kind',
    type: 'text',
  })
  kind!: RolloutFlagKind;

  @Column({
    // Mirrors migration 089 LD-like boolean default.
    default: () => `'[{"value": false}, {"value": true}]'::jsonb`,
    name: 'variations',
    type: 'jsonb',
  })
  variations!: RolloutFlagVariation[];

  @Column({ default: 0, name: 'off_variation', type: 'integer' })
  offVariation!: number;

  @Column({
    // Mirrors migration 089: 100% on variation 1 (true).
    default: () => `'{"variations": [{"variation": 1, "weight": 100}]}'::jsonb`,
    name: 'fallthrough',
    type: 'jsonb',
  })
  fallthrough!: RolloutFallthrough;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
