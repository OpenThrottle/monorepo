/**
 * @description TypeORM entity for the cms `libraries` table: a named set of
 * components a layout can render with. Matches databases/cms/migrations (008).
 * @public
 */

import { BaseUuidModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, Index } from 'typeorm';

import {
  CMS_STATUS,
  CMS_STATUS_VALUES,
} from '../../config/config.constants.ts';
import type { CmsStatus } from '../../config/config.types.ts';

@Entity('libraries')
export class Library extends BaseUuidModel {
  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'name', type: 'character varying' })
  @Index('idx_libraries_name')
  name!: string;

  @Column({
    default: CMS_STATUS.DRAFT,
    enum: CMS_STATUS_VALUES,
    enumName: 'library_status',
    name: 'status',
    nullable: true,
    type: 'enum',
  })
  @Index('idx_libraries_status')
  status!: CmsStatus | null;
}
