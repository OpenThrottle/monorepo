/**
 * @description TypeORM entity for the cms `fragments_children` table: one
 * ordered (parent, child) edge in the fragment tree. Matches
 * databases/cms/migrations (003). Both foreign keys use the SQL default
 * (NO ACTION), so a fragment with edges cannot be deleted.
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Fragment } from '../fragments/fragment.entity.ts';

@Entity('fragments_children')
export class FragmentChild {
  /** The child fragment. */
  @JoinColumn({
    foreignKeyConstraintName: 'fragments_children_children_uuid_fkey',
    name: 'children_uuid',
  })
  @ManyToOne(() => Fragment)
  child?: Fragment;

  @Index('idx_fragments_children_children_uuid')
  @PrimaryColumn({ name: 'children_uuid', type: 'uuid' })
  childrenUuid!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  /** The parent fragment. */
  @JoinColumn({
    foreignKeyConstraintName: 'fragments_children_fragment_uuid_fkey',
    name: 'fragment_uuid',
  })
  @ManyToOne(() => Fragment)
  fragment?: Fragment;

  @Index('idx_fragments_children_fragment_uuid')
  @PrimaryColumn({ name: 'fragment_uuid', type: 'uuid' })
  fragmentUuid!: string;

  /** Position among the parent's children, ascending. */
  @Column({ default: 0, name: 'sort_order', type: 'smallint' })
  sortOrder!: number;
}
