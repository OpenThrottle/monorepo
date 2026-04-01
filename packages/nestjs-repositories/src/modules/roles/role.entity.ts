/**
 * @description TypeORM entity for Cortex roles table. Matches databases/cortex/migrations/034.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { User } from '../users/user.entity';
import type { Permission } from './permission.entity';

/** Scalar/column fields of Role (no relations). */
export type RoleData = Pick<
  Role,
  'createdAt' | 'description' | 'id' | 'name' | 'updatedAt'
>;

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToMany('Permission', 'roles', { cascade: true })
  @JoinTable({
    inverseJoinColumn: { name: 'permission_id' },
    joinColumn: { name: 'role_id' },
    name: 'role_permissions',
  })
  permissions!: Permission[];

  @ManyToMany('User', 'roles')
  @JoinTable({
    inverseJoinColumn: { name: 'user_id' },
    joinColumn: { name: 'role_id' },
    name: 'user_roles',
  })
  users!: User[];
}
