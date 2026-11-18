/**
 * @description TypeORM entity for the openthrottle `blog_posts` table. Extends `BaseModel`, so a
 * delete is a soft delete and a soft-deleted post is never publicly visible. Matches
 * databases/openthrottle/migrations (131, 133, 172). Public visibility
 * (`status = 'PUBLISHED' AND published_at <= now()` and live) is NOT encoded here: it lives
 * once, in `applyBlogPostVisibility` (visibility/visibility.utils.ts).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';

import type { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import type { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import { BLOG_POST_STATUS } from './blog-posts.constants.ts';
import type { BlogPostStatus } from './blog-posts.types.ts';

@Entity('blog_posts')
export class BlogPost extends BaseModel {
  @Column({ name: 'slug', type: 'text' })
  slug!: string;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'excerpt', nullable: true, type: 'text' })
  excerpt!: string | null;

  @Column({ name: 'body_markdown', type: 'text' })
  bodyMarkdown!: string;

  @Column({ name: 'cover_image_url', nullable: true, type: 'text' })
  coverImageUrl!: string | null;

  @Column({ name: 'cover_image_alt', nullable: true, type: 'text' })
  coverImageAlt!: string | null;

  @Column({ name: 'seo_title', nullable: true, type: 'text' })
  seoTitle!: string | null;

  @Column({ name: 'seo_description', nullable: true, type: 'text' })
  seoDescription!: string | null;

  @Column({
    default: BLOG_POST_STATUS.DRAFT,
    name: 'status',
    type: 'text',
  })
  status!: BlogPostStatus;

  @Column({
    name: 'published_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  publishedAt!: Date | null;

  /** Caller identity of the most recent write (user display name or service account name). Migration 133. */
  @Column({ name: 'last_edited_by', nullable: true, type: 'text' })
  lastEditedBy!: string | null;

  @Column({ name: 'author_id', nullable: true, type: 'uuid' })
  authorId!: string | null;

  @ManyToOne('BlogAuthor', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author!: BlogAuthor | null;

  @ManyToMany('BlogTag', 'posts')
  @JoinTable({
    inverseJoinColumn: { name: 'tag_id' },
    joinColumn: { name: 'post_id' },
    name: 'blog_post_tags',
  })
  tags!: BlogTag[];
}
