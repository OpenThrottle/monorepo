/**
 * @description TypeORM entity for OpenThrottle blog_authors table. Matches databases/migrations (131).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Scalar/column fields of BlogAuthor (no relations).
 * @public
 */
export type BlogAuthorData = Pick<
  BlogAuthor,
  | 'avatarUrl'
  | 'bio'
  | 'createdAt'
  | 'displayName'
  | 'id'
  | 'slug'
  | 'updatedAt'
  | 'userId'
>;

/** @public */
@Entity('blog_authors')
export class BlogAuthor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
