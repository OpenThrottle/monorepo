/**
 * @description TypeORM entity for the rollout feature-flags table. Matches databases/migrations (084).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Scalar/column fields of RolloutFlag (no relations). */
export type RolloutFlagData = Pick<
  RolloutFlag,
  | 'createdAt'
  | 'description'
  | 'enabled'
  | 'id'
  | 'key'
  | 'targetRoles'
  | 'updatedAt'
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
