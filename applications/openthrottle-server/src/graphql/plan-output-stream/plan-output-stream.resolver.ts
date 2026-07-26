/**
 * @description Resolver for PlanOutputStreamChunk queries and mutations. Injects PlanOutputStreamService from @openthrottle/nestjs-repositories and maps entities to PlanOutputStreamChunkObject.
 */

import type { PlanOutputStreamChunk } from '@openthrottle/nestjs-repositories';
import { PlanOutputStreamService } from '@openthrottle/nestjs-repositories';
import {
  Args,
  Context,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import {
  PUB_SUB,
  planOutputTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  DeletePlanOutputResult,
  PlanOutputStreamChunkObject,
} from './plan-output-stream-chunk.object';
import {
  AppendPlanOutputInput,
  DeletePlanOutputInput,
  GetPlanOutputStreamChunkInput,
  ListPlanOutputStreamChunksInput,
} from './plan-output-stream.input';

/** Default and hard ceiling for the unbounded list query (bounds API memory). */
const DEFAULT_LIST_LIMIT = 1000;
const MAX_LIST_LIMIT = 1000;

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
// Must stay a singleton: it registers a @Subscription(). The request-scoped
// `plan` field resolution lives in PlanOutputStreamFieldsResolver so the
// request-scoped DataLoader doesn't promote this resolver to request scope.
@Resolver(() => PlanOutputStreamChunkObject)
export class PlanOutputStreamResolver {
  constructor(
    private readonly planOutputStreamService: PlanOutputStreamService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  @Query(() => PlanOutputStreamChunkObject, {
    description: `Get a plan output stream chunk by ID`,
    nullable: true,
  })
  async planOutputStreamChunk(
    @Args('input', { type: () => GetPlanOutputStreamChunkInput })
    input: GetPlanOutputStreamChunkInput,
  ): Promise<PlanOutputStreamChunk | null> {
    const entity = await this.planOutputStreamService
      .getRepository()
      .findOne({ where: { id: input.id } });

    return entity;
  }

  @Query(() => [PlanOutputStreamChunkObject], {
    description: `List plan output stream chunks by plan ID, ordered by createdAt ascending`,
  })
  async planOutputStreamChunks(
    @Args('input', { type: () => ListPlanOutputStreamChunksInput })
    input: ListPlanOutputStreamChunksInput,
  ): Promise<PlanOutputStreamChunk[]> {
    const take = Math.min(
      Math.max(1, input.limit ?? DEFAULT_LIST_LIMIT),
      MAX_LIST_LIMIT,
    );
    const skip = Math.max(0, input.offset ?? 0);

    const entities = await this.planOutputStreamService.getRepository().find({
      order: { createdAt: 'ASC' },
      skip,
      take,
      where: { planId: input.planId },
    });

    return entities;
  }

  @Mutation(() => PlanOutputStreamChunkObject, {
    description: `Append a chunk to a plan's output stream (e.g. agent iteration log).`,
  })
  async appendPlanOutput(
    @Args('input', { type: () => AppendPlanOutputInput })
    input: AppendPlanOutputInput,
  ): Promise<PlanOutputStreamChunk> {
    const repo = this.planOutputStreamService.getRepository();
    const entity = repo.create({
      content: input.content,
      iteration: input.iteration ?? null,
      planId: input.planId,
      taskId: input.taskId ?? null,
    });

    const saved = await repo.save(entity);

    // Publish the new chunk to the per-plan output topic so live subscribers on
    // plan:<planId>:output receive it. The payload is keyed by the subscription
    // field name so @nestjs/graphql can resolve planOutputChunkAdded.
    await this.pubSub.publish(planOutputTopic(saved.planId), {
      planOutputChunkAdded: saved,
    });

    return saved;
  }

  @Mutation(() => DeletePlanOutputResult, {
    description: `Delete a plan's output chunks. With chunkId, deletes that single chunk (must belong to planId). Without chunkId, clears all chunks for planId, optionally scoped to taskId.`,
  })
  async deletePlanOutput(
    @Args('input', { type: () => DeletePlanOutputInput })
    input: DeletePlanOutputInput,
  ): Promise<DeletePlanOutputResult> {
    const repo = this.planOutputStreamService.getRepository();

    if (input.chunkId) {
      const chunk = await repo.findOne({ where: { id: input.chunkId } });
      if (!chunk) {
        throw new BadRequestException(
          `Plan output chunk not found: ${input.chunkId}`,
        );
      }
      if (chunk.planId !== input.planId) {
        throw new BadRequestException(
          `Plan output chunk ${input.chunkId} does not belong to plan ${input.planId}`,
        );
      }

      const result = await repo.delete({ id: input.chunkId });
      return { deletedCount: result.affected ?? 0 };
    }

    const result = await repo.delete({
      planId: input.planId,
      ...(input.taskId ? { taskId: input.taskId } : {}),
    });

    return { deletedCount: result.affected ?? 0 };
  }

  // 🔌 graphql-ws only: connection auth (onConnect) already validated the token
  // and stashed userId on the context, so skip the HTTP-shaped global auth guard
  // (which requires `req`) and authorize from the connection identity here.
  @Public()
  @Subscription(() => PlanOutputStreamChunkObject, {
    description: `Live stream of output chunks appended to a plan (topic plan:<planId>:output).`,
  })
  planOutputChunkAdded(
    @Args('planId', { type: () => ID }) planId: string,
    @Context() context: { userId?: string },
  ): AsyncIterator<PlanOutputStreamChunk> {
    // Path A (authenticated-only): identity comes from the authenticated ws
    // connection, never from a subscription variable.
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }

    return this.pubSub.asyncIterator<PlanOutputStreamChunk>(
      planOutputTopic(planId),
    );
  }
}
