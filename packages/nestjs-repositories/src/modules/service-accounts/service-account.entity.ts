/**
 * @description TypeORM entity for Cortex service_accounts table. Matches databases/migrations/044.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Role } from '../roles/role.entity';
import type { ServiceAccountCredential } from './service-account-credential.entity';

/** Scalar/column fields of ServiceAccount (no relations). */
export type ServiceAccountData = Pick<
  ServiceAccount,
  'createdAt' | 'description' | 'disabledAt' | 'id' | 'name'
>;

@Entity('service_accounts')
export class ServiceAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({
    name: 'disabled_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  disabledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToMany('Role', 'serviceAccounts')
  roles!: Role[];

  @OneToMany('ServiceAccountCredential', 'serviceAccount')
  credentials!: ServiceAccountCredential[];
}
