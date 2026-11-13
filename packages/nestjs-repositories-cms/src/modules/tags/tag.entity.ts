/**
 * @description TypeORM entity for the cms `tags` table: a named, described
 * label, not yet referenced by other tables. Matches databases/cms/migrations
 * (007).
 * @public
 */

import { BaseUuidModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('tags')
export class Tag extends BaseUuidModel {
  @Column({ name: 'description', type: 'character varying' })
  description!: string;

  @Column({ name: 'name', type: 'character varying' })
  name!: string;
}
