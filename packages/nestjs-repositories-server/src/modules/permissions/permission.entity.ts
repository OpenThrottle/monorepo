/**
 * @description TypeORM entity for the openthrottle `permissions` table. Extends
 * `BaseHardDeleteModel`: permissions are seeded by migrations and never user-deleted, and
 * never updated, so the table has no `updated_at` or `deleted_at`. Matches
 * databases/openthrottle/migrations (034, 175).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, ManyToMany } from 'typeorm';

import type { Role } from '../roles/role.entity.ts';

@Entity('permissions')
export class Permission extends BaseHardDeleteModel {
  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @ManyToMany('Role', 'permissions')
  roles!: Role[];
}
