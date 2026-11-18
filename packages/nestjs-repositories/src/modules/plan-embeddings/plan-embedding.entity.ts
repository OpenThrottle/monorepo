import { vectorTransformer } from '@openthrottle/nestjs-postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { Plan } from '../plans/plan.entity.ts';

/**
 * @description TypeORM entity for OpenThrottle plan_embeddings table. Matches databases/openthrottle/migrations (004, 163). Uses pgvector vector(768) with per-row provenance (embedding_model, embedding_dims, content_hash); one row per source row.
 */
@Entity('plan_embeddings')
export class PlanEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'content_hash', nullable: true, type: 'text' })
  contentHash!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

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

/**
 * @description Row shape from raw SQL vector search (plan_embeddings JOIN plans). Aligns with {@link PlanEmbedding} id, content, metadata, plan_id plus plan_title and similarity from join/compute.
 */
export interface PlanEmbeddingSearchRow {
  readonly content: string;
  readonly id: string;
  readonly metadata: unknown;
  readonly plan_id: string;
  readonly plan_title: string;
  readonly similarity: string;
}
