/**
 * @description TypeORM entity for the openthrottle `users` table. Extends `BaseModel`, so a
 * delete is a soft delete: the user's plans, runs, settings and ledger rows keep their
 * `user_id`, and the live-only unique indexes on `email` and `github_username` free the
 * soft-deleted user's identity for reuse. Matches databases/openthrottle/migrations
 * (026, 031, 033, 175).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, ManyToMany } from 'typeorm';

import type { Role } from '../roles/role.entity.ts';

@Entity('users')
export class User extends BaseModel {
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

  @ManyToMany('Role', 'users')
  roles!: Role[];
}
