/**
 * @description Resolver for PlanOutputStreamChunk queries and mutations. Injects PlanOutputStreamService from @openthrottle/nestjs-repositories and maps entities to PlanOutputStreamChunkObject.
 */

import type {
  Plan,
  PlanOutputStreamChunk,
} from '@openthrottle/nestjs-repositories';
import { PlanOutputStreamService } from '@openthrottle/nestjs-repositories';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import {
  PUB_SUB,
  planOutputTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { Public } from '@openthrottle/nestjs-auth';
import { ForbiddenException, Inject } from '@nestjs/common';
import { PlanObject } from '../plans/plan.object';
import { PlanOutputStreamChunkObject } from './plan-output-stream-chunk.object';
import { PlanOutputStreamLoaders } from './plan-output-stream-loaders';
import {
  AppendPlanOutputInput,
  GetPlanOutputStreamChunkInput,
  ListPlanOutputStreamChunksInput,
} from './plan-output-stream.input';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => PlanOutputStreamChunkObject)
export class PlanOutputStreamResolver {
  constructor(
    private readonly loaders: PlanOutputStreamLoaders,
    private readonly planOutputStreamService: PlanOutputStreamService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: PlanOutputStreamChunkObject,
  ): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }

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
    const entities = await this.planOutputStreamService.getRepository().find({
      order: { createdAt: 'ASC' },
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
