/**
 * @description GraphQL object type for server process metrics (CPU and memory). Used by serverMetrics query.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description:
    'Current process metrics: memory (RSS, heap, external in MB) and CPU (user/system in ms).',
})
export class ServerMetricsObject {
  @Field(() => Float, {
    description: 'Resident set size (total process memory) in MB.',
  })
  rssMb!: number;

  @Field(() => Float, {
    description: 'V8 heap used in MB.',
  })
  heapUsedMb!: number;

  @Field(() => Float, {
    description: 'V8 heap total in MB.',
  })
  heapTotalMb!: number;

  @Field(() => Float, {
    description: 'External (C++ objects bound to JS, e.g. Buffers) in MB.',
  })
  externalMb!: number;

  @Field(() => Float, {
    description: 'User CPU time in milliseconds (cumulative).',
  })
  cpuUserMs!: number;

  @Field(() => Float, {
    description: 'System CPU time in milliseconds (cumulative).',
  })
  cpuSystemMs!: number;
}
