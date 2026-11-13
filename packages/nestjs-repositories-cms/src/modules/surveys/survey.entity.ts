/**
 * @description TypeORM entity for the cms `surveys` table: a named survey whose
 * definition lives in `data`. Matches databases/cms/migrations (006).
 * @public
 */

import { BaseUuidModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, Index } from 'typeorm';

@Entity('surveys')
export class Survey extends BaseUuidModel {
  /** Questions, options and settings as a JSON object. */
  @Column({ default: () => "'{}'::jsonb", name: 'data', type: 'jsonb' })
  data!: Record<string, unknown>;

  @Column({ name: 'name', type: 'character varying' })
  @Index('idx_surveys_name')
  name!: string;
}
