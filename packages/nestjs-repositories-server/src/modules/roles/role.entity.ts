/**
 * @description TypeORM entity for the openthrottle `roles` table. Extends `BaseModel`, so a
 * delete is a soft delete: the role's `role_permissions`, `user_roles` and
 * `service_account_roles` rows stay, but relation loading reads live roles only, so a
 * soft-deleted role grants nothing. Matches databases/openthrottle/migrations (034, 175).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

import type { Permission } from '../permissions/permission.entity.ts';
import type { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import type { User } from '../users/user.entity.ts';

@Entity('roles')
export class Role extends BaseModel {
  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

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

  @ManyToMany('ServiceAccount', 'roles')
  @JoinTable({
    inverseJoinColumn: { name: 'service_account_id' },
    joinColumn: { name: 'role_id' },
    name: 'service_account_roles',
  })
  serviceAccounts!: ServiceAccount[];
}
