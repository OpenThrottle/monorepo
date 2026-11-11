/**
 * @description TypeORM entity for the cms `layouts_libraries` join table: makes
 * a library's components available to a layout, unique per pair and removed
 * with either side. Matches databases/cms/migrations (010).
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Layout } from '../layouts/layout.entity.ts';
import { Library } from '../libraries/library.entity.ts';

@Entity('layouts_libraries')
@Index('idx_layouts_libraries_unique', ['layoutUuid', 'libraryUuid'], {
  unique: true,
})
export class LayoutLibrary {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @JoinColumn({
    foreignKeyConstraintName: 'layouts_libraries_layout_uuid_fkey',
    name: 'layout_uuid',
  })
  @ManyToOne(() => Layout, { onDelete: 'CASCADE' })
  layout?: Layout;

  @Column({ name: 'layout_uuid', type: 'uuid' })
  @Index('idx_layouts_libraries_layout_uuid')
  layoutUuid!: string;

  @JoinColumn({
    foreignKeyConstraintName: 'layouts_libraries_library_uuid_fkey',
    name: 'library_uuid',
  })
  @ManyToOne(() => Library, { onDelete: 'CASCADE' })
  library?: Library;

  @Column({ name: 'library_uuid', type: 'uuid' })
  @Index('idx_layouts_libraries_library_uuid')
  libraryUuid!: string;

  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;
}
