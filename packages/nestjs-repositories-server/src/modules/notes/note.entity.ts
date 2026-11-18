/**
 * @description TypeORM entity for the openthrottle `notes` table: quick
 * unstructured thoughts behind the notes route and the MCP note tools. Matches
 * databases/openthrottle/migrations (009, 167).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('notes')
export class Note extends BaseModel {
  @Column({ name: 'author', nullable: true, type: 'text' })
  author!: string | null;

  @Column({ name: 'content', type: 'text' })
  content!: string;
}
