/**
 * @description TypeORM entity for the cms `profiles` table: display details for
 * a person who edits CMS content. Matches databases/cms/migrations (005).
 * `uuid` is the CMS's own key — there is no link to an OpenThrottle user (see
 * databases/cms/README.md § profile identity). The username length CHECK lives
 * in the SQL only.
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('profiles')
@Unique('profiles_username_key', ['username'])
export class Profile {
  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'email', type: 'character varying' })
  email!: string;

  @Column({ name: 'first_name', nullable: true, type: 'character varying' })
  firstName!: string | null;

  @Column({
    default: false,
    name: 'is_deleted',
    nullable: true,
    type: 'boolean',
  })
  isDeleted!: boolean | null;

  @Column({ name: 'last_name', nullable: true, type: 'character varying' })
  lastName!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  /** Optional public handle; unique and at least 3 characters when set. */
  @Column({ name: 'username', nullable: true, type: 'text' })
  username!: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;

  @Column({ name: 'website', nullable: true, type: 'text' })
  website!: string | null;
}
