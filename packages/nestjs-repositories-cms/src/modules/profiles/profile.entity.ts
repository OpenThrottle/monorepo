/**
 * @description TypeORM entity for the cms `profiles` table: display details for
 * a person who edits CMS content. Matches databases/cms/migrations (005).
 * `uuid` is the CMS's own key — there is no link to an OpenThrottle user (see
 * databases/cms/README.md § profile identity). The username length CHECK lives
 * in the SQL only.
 * @public
 */

import { BaseUuidModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, Index, Unique } from 'typeorm';

@Entity('profiles')
@Unique('profiles_username_key', ['username'])
export class Profile extends BaseUuidModel {
  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null;

  @Column({ name: 'email', type: 'character varying' })
  email!: string;

  @Column({ name: 'first_name', nullable: true, type: 'character varying' })
  firstName!: string | null;

  @Column({ name: 'last_name', nullable: true, type: 'character varying' })
  lastName!: string | null;

  /**
   * users.id of the OpenThrottle user this profile belongs to (another database, so no foreign
   * key; unique, app-checked). Null for an unlinked profile. Migration 012.
   */
  @Column({ name: 'openthrottle_user_id', nullable: true, type: 'uuid' })
  @Index('idx_profiles_openthrottle_user_id', { unique: true })
  openthrottleUserId!: string | null;

  /** Optional public handle; unique and at least 3 characters when set. */
  @Column({ name: 'username', nullable: true, type: 'text' })
  username!: string | null;

  @Column({ name: 'website', nullable: true, type: 'text' })
  website!: string | null;
}
