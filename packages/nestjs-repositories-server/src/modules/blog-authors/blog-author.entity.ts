/**
 * @description TypeORM entity for the openthrottle `blog_authors` table: a public byline,
 * optionally linked to a user. Extends `BaseModel`, so a delete is a soft delete. Matches
 * databases/openthrottle/migrations (131, 172).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('blog_authors')
export class BlogAuthor extends BaseModel {
  @Column({ name: 'slug', type: 'text' })
  slug!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'bio', nullable: true, type: 'text' })
  bio!: string | null;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null;

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;
}
