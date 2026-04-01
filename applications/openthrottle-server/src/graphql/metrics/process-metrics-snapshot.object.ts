/**
 * @description GraphQL object type for a process metrics snapshot (memory and CPU). Aligns with
 * ServerMetricsObject and metrics/process-metrics.types ProcessMetricsSnapshot. Used by
 * TaskRunMetricsObject (atStart, atEnd) and for task-run metrics visualization.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType('ProcessMetricsSnapshot', {
  description: `Process metrics snapshot: memory (RSS, heap, external in MB) and CPU (user/system in ms).`,
})
export class ProcessMetricsSnapshotObject {
  cpuSystemMs!: number;
  @Field(() => Float, {
    description: `System CPU time in milliseconds (cumulative).`,
  })
  @Field(() => Float, {
    description: `User CPU time in milliseconds (cumulative).`,
  })
  cpuUserMs!: number;

  @Field(() => Float, {
    description: `External (C++ objects bound to JS, e.g. Buffers) in MB.`,
  })
  externalMb!: number;

  @Field(() => Float, {
    description: `V8 heap total in MB.`,
  })
  heapTotalMb!: number;

  @Field(() => Float, {
    description: `V8 heap used in MB.`,
  })
  heapUsedMb!: number;

  @Field(() => Float, {
    description: `Resident set size (total process memory) in MB.`,
  })
  rssMb!: number;
}
