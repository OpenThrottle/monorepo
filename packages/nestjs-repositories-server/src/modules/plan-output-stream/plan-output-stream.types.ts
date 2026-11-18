/**
 * @description Types for the plan_output_stream module.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { PLAN_OUTPUT_STREAM_KIND } from './plan-output-stream.constants.ts';
import type { PlanOutputStreamRepository } from './plan-output-stream.repository.ts';
import type { PlanOutputStreamChunk } from './plan-output-stream-chunk.entity.ts';

/** @public */
export type PlanOutputStreamKind =
  (typeof PLAN_OUTPUT_STREAM_KIND)[keyof typeof PLAN_OUTPUT_STREAM_KIND];

/**
 * @description Input for {@link PlanOutputStreamRepository.listChunks}. An omitted or null
 * `taskId` applies no task filter.
 * @public
 */
export interface ListPlanOutputChunksParams {
  readonly planId: string;
  readonly skip: number;
  readonly take: number;
  readonly taskId?: string | null;
}

/**
 * @description What `PlanOutputStreamRepository.create` takes: the chunk's columns, with the plan
 * and task relations left out and the nullable columns optional. `content` and `planId` are
 * required.
 * @public
 */
export interface PlanOutputChunkCreateInput
  extends
    Omit<
      CreateModelInput<PlanOutputStreamChunk>,
      'iteration' | 'kind' | 'plan' | 'task' | 'taskId'
    >,
    Partial<
      Pick<
        CreateModelInput<PlanOutputStreamChunk>,
        'iteration' | 'kind' | 'taskId'
      >
    > {}

/**
 * @description A {@link PlanOutputStreamRepository} mock: every inherited `BaseRepository`
 * method plus `listChunks`.
 * @public
 */
export interface PlanOutputStreamRepositoryMock extends BaseRepositoryMock<
  PlanOutputStreamChunk,
  PlanOutputChunkCreateInput
> {
  readonly listChunks: Mock<PlanOutputStreamRepository['listChunks']>;
}
