/**
 * @description TypeORM entity for the cms `schemas` table: a versioned JSON
 * Schema for one fragment typename. Matches databases/cms/migrations (001).
 * @public
 */

import { BaseUuidModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, Index } from 'typeorm';

import {
  CMS_STATUS,
  CMS_STATUS_VALUES,
} from '../../config/config.constants.ts';
import type { CmsStatus } from '../../config/config.types.ts';

@Entity('schemas')
@Index('idx_schemas_typename_version', ['typename', 'version'])
export class Schema extends BaseUuidModel {
  @Column({ default: () => "'{}'::jsonb", name: 'json_schema', type: 'jsonb' })
  jsonSchema!: Record<string, unknown>;

  @Column({
    default: CMS_STATUS.DRAFT,
    enum: CMS_STATUS_VALUES,
    enumName: 'schema_status',
    name: 'status',
    nullable: true,
    type: 'enum',
  })
  status!: CmsStatus | null;

  @Column({ name: 'typename', type: 'character varying' })
  typename!: string;

  @Column({ name: 'version', type: 'character varying' })
  version!: string;
}
