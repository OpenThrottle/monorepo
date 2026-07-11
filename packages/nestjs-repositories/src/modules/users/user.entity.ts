/**
 * @description TypeORM entity for OpenThrottle users table. Matches databases/migrations (026, 031).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Role } from '../roles/role.entity';

/** Scalar/column fields of User (no relations). Use to type GraphQL objects or DTOs that mirror the entity. */
export type UserData = Pick<
  User,
  | 'createdAt'
  | 'disabledAt'
  | 'email'
  | 'githubUsername'
  | 'id'
  | 'passwordHash'
  | 'updatedAt'
>;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'github_username', type: 'text' })
  githubUsername!: string;

  @Column({ name: 'email', nullable: true, type: 'text' })
  email!: string | null;

  @Column({ name: 'password_hash', nullable: true, type: 'text' })
  passwordHash!: string | null;

  @Column({
    name: 'disabled_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  disabledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToMany('Role', 'users')
  roles!: Role[];
}
