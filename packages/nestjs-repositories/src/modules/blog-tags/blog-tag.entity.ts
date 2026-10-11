/**
 * @description TypeORM entity for OpenThrottle blog_tags table. Matches databases/migrations (131).
 * The blog_post_tags join table is owned by {@link BlogPost}'s `@JoinTable`; this is the inverse side.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { BlogPost } from '../blog-posts/blog-post.entity.ts';

/**
 * Scalar/column fields of BlogTag (no relations).
 * @public
 */
export type BlogTagData = Pick<
  BlogTag,
  'createdAt' | 'description' | 'id' | 'name' | 'slug' | 'updatedAt'
>;

/** @public */
@Entity('blog_tags')
export class BlogTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'slug', type: 'text' })
  slug!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToMany('BlogPost', 'tags')
  posts!: BlogPost[];
}
