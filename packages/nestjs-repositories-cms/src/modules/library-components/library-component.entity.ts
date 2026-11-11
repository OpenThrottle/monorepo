/**
 * @description TypeORM entity for the cms `library_components` table: the
 * renderable component for one typename within a library. Matches
 * databases/cms/migrations (009). The SQL declares no uniqueness on
 * (library_uuid, typename), so none is declared here.
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
  UpdateDateColumn,
} from 'typeorm';

import {
  CMS_STATUS,
  CMS_STATUS_VALUES,
} from '../../config/config.constants.ts';
import type { CmsStatus } from '../../config/config.types.ts';
import { Library } from '../libraries/library.entity.ts';

@Entity('library_components')
export class LibraryComponent {
  /** Component source code, rendered for fragments of this typename. */
  @Column({ name: 'code', type: 'text' })
  code!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    default: false,
    name: 'is_deleted',
    nullable: true,
    type: 'boolean',
  })
  isDeleted!: boolean | null;

  @JoinColumn({
    foreignKeyConstraintName: 'library_components_library_uuid_fkey',
    name: 'library_uuid',
  })
  @ManyToOne(() => Library, { onDelete: 'RESTRICT' })
  library?: Library;

  @Column({ name: 'library_uuid', type: 'uuid' })
  @Index('idx_library_components_library_uuid')
  libraryUuid!: string;

  @Column({ name: 'name', type: 'character varying' })
  @Index('idx_library_components_name')
  name!: string;

  /** JSON Schema of the props the component accepts. */
  @Column({ default: () => "'{}'::jsonb", name: 'props_schema', type: 'jsonb' })
  propsSchema!: Record<string, unknown>;

  @Column({
    default: CMS_STATUS.DRAFT,
    enum: CMS_STATUS_VALUES,
    enumName: 'library_component_status',
    name: 'status',
    nullable: true,
    type: 'enum',
  })
  @Index('idx_library_components_status')
  status!: CmsStatus | null;

  /** Fragment typename this component renders. */
  @Column({ name: 'typename', type: 'character varying' })
  @Index('idx_library_components_typename')
  typename!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;
}
