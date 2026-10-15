/**
 * @description TypeORM entity for OpenThrottle blog_posts table. Matches databases/migrations (131).
 * Public visibility (`status = 'PUBLISHED' AND published_at <= now()`) is NOT encoded here —
 * it lives once, in `applyBlogPostVisibility` (blog-post-visibility.ts).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import type { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import type { BlogPostStatus } from './blog-post.constants.ts';
import { BLOG_POST_STATUS } from './blog-post.constants.ts';

/**
 * Scalar/column fields of BlogPost (no relations).
 * @public
 */
export type BlogPostData = Pick<
  BlogPost,
  | 'authorId'
  | 'bodyMarkdown'
  | 'coverImageAlt'
  | 'coverImageUrl'
  | 'createdAt'
  | 'excerpt'
  | 'id'
  | 'publishedAt'
  | 'seoDescription'
  | 'seoTitle'
  | 'slug'
  | 'status'
  | 'title'
  | 'updatedAt'
>;

/** @public */
@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ name: 'author_id', nullable: true, type: 'uuid' })
  authorId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

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
