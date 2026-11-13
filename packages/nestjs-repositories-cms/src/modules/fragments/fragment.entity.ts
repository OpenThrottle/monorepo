/**
 * @description TypeORM entity for the cms `fragments` table: a named, typed
 * piece of content whose properties conform to a schema. Matches
 * databases/cms/migrations (002).
 * @public
 */

import { BaseUuidModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Schema } from '../schemas/schema.entity.ts';

@Entity('fragments')
export class Fragment extends BaseUuidModel {
  /** True for fragments the CMS itself owns, such as a layout's root. */
  @Column({
    default: false,
    name: 'is_system',
    nullable: true,
    type: 'boolean',
  })
  isSystem!: boolean | null;

  @Column({ name: 'name', type: 'character varying' })
  @Index('idx_fragments_name')
  name!: string;

  @Column({ default: () => "'{}'::jsonb", name: 'properties', type: 'jsonb' })
  properties!: Record<string, unknown>;

  @JoinColumn({
    foreignKeyConstraintName: 'fragments_schema_uuid_fkey',
    name: 'schema_uuid',
  })
  @ManyToOne(() => Schema, { onDelete: 'RESTRICT' })
  schema?: Schema;

  @Column({ name: 'schema_uuid', type: 'uuid' })
  @Index('idx_fragments_schema_uuid')
  schemaUuid!: string;

  /** Denormalized from the referenced schema so renderers need no join. */
  @Column({ name: 'typename', type: 'character varying' })
  @Index('idx_fragments_typename')
  typename!: string;
}
