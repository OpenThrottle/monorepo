/**
 * @description TypeORM entity for the openthrottle `service_accounts` table. Extends
 * `BaseModel`, so a delete is a soft delete: the account's credentials and role grants stay
 * in place, unreachable through the deleted account (a soft-deleted account never verifies a
 * bearer token and grants no roles). Matches databases/openthrottle/migrations (044, 107, 175).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';

import type { Role } from '../roles/role.entity.ts';
import type { ServiceAccountCredential } from '../service-account-credentials/service-account-credential.entity.ts';

@Entity('service_accounts')
export class ServiceAccount extends BaseModel {
  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  /**
   * The human user this machine identity acts as for user-scoped conveniences
   * (e.g. resolving a plan's creating workspace against that user's registered
   * checkouts). A hint, never a permission grant — authorization still comes
   * from service_account_roles.
   */
  @Column({ name: 'acting_user_id', nullable: true, type: 'uuid' })
  actingUserId!: string | null;

  @Column({
    name: 'disabled_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  disabledAt!: Date | null;

  @ManyToMany('Role', 'serviceAccounts')
  roles!: Role[];

  @OneToMany('ServiceAccountCredential', 'serviceAccount')
  credentials!: ServiceAccountCredential[];
}
