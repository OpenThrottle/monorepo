/**
 * @description TypeORM entity for the openthrottle `blog_tags` table. Extends `BaseModel`, so a
 * delete is a soft delete. Matches databases/openthrottle/migrations (131, 172). The
 * `blog_post_tags` join table is owned by {@link BlogPost}'s `@JoinTable`; this is the inverse
 * side.
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, ManyToMany } from 'typeorm';

import type { BlogPost } from '../blog-posts/blog-post.entity.ts';

@Entity('blog_tags')
export class BlogTag extends BaseModel {
  @Column({ name: 'slug', type: 'text' })
  slug!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @ManyToMany('BlogPost', 'tags')
  posts!: BlogPost[];
}
