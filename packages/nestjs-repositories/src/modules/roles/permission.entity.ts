/**
 * @description TypeORM entity for Cortex permissions table. Matches databases/cortex/migrations/034.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Role } from './role.entity';

/** Scalar/column fields of Permission (no relations). */
export type PermissionData = Pick<
  Permission,
  'createdAt' | 'description' | 'id' | 'name'
>;

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToMany('Role', 'permissions')
  roles!: Role[];
}
