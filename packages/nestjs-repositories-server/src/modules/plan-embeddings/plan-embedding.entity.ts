/**
 * @description TypeORM entity for the openthrottle `plan_embeddings` table. Extends
 * `BaseHardDeleteModel`: embeddings are derived rows, so a delete is real. Matches
 * databases/openthrottle/migrations (004, 163, 173). Uses pgvector vector(768) with per-row
 * provenance (embedding_model, embedding_dims, content_hash); one row per source row.
 * @public
 */

import {
  BaseHardDeleteModel,
  vectorTransformer,
} from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Plan } from '../plans/plan.entity.ts';

@Entity('plan_embeddings')
export class PlanEmbedding extends BaseHardDeleteModel {
  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'content_hash', nullable: true, type: 'text' })
  contentHash!: string | null;

  @Column({
    name: 'embedding',
    nullable: true,
    transformer: vectorTransformer,
    type: 'vector',
  })
  embedding!: number[] | null;

  @Column({ name: 'embedding_dims', nullable: true, type: 'integer' })
  embeddingDims!: number | null;

  @Column({ name: 'embedding_model', nullable: true, type: 'text' })
  embeddingModel!: string | null;

  @Column({ default: () => "'{}'::jsonb", name: 'metadata', type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @ManyToOne('Plan', 'planEmbeddings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;
}
