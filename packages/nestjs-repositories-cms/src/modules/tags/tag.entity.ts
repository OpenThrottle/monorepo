/**
 * @description TypeORM entity for the cms `tags` table: a named, described
 * label, not yet referenced by other tables. Matches databases/cms/migrations
 * (007).
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tags')
export class Tag {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'description', type: 'character varying' })
  description!: string;

  @Column({
    default: false,
    name: 'is_deleted',
    nullable: true,
    type: 'boolean',
  })
  isDeleted!: boolean | null;

  @Column({ name: 'name', type: 'character varying' })
  name!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;
}
