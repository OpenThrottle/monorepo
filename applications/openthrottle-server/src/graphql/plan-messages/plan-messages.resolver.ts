/**
 * @description Resolver for the plan inbox (plan_messages): post, list, edit, withdraw and claim
 * human STEER / QUEUE / FEEDBACK messages, plus a live subscription. Claiming is the one delivery
 * path — it marks messages DELIVERED and records the audit chunk on the plan output stream in one
 * transaction (PlanMessagesService.claimPendingMessages).
 */

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
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
  type AuthPrincipal,
  CurrentUser,
  Public,
} from '@openthrottle/nestjs-auth';
import {
  planMessagesTopic,
  planOutputTopic,
  PUB_SUB,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import type {
  ClaimPlanMessagesResult,
  PendingPlanMessageWriteResult,
  PlanMessage,
} from '@openthrottle/nestjs-repositories';
import { PlanMessagesService } from '@openthrottle/nestjs-repositories';

import { resolveNoteAuthor } from '../notes/notes.utils.ts';
import {
  ClaimPlanMessagesInput,
  ListPlanMessagesInput,
  PostPlanMessageInput,
  UpdatePlanMessageInput,
  WithdrawPlanMessageInput,
} from './plan-message.input.ts';
import {
  ClaimPlanMessagesResultObject,
  PlanMessageObject,
} from './plan-message.object.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
// Must stay a singleton: it registers a @Subscription().
@Resolver(() => PlanMessageObject)
export class PlanMessagesResolver {
  constructor(
    private readonly planMessagesService: PlanMessagesService,
    private readonly globalCls: GlobalClsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  @Query(() => [PlanMessageObject], {
    description: `List a plan's inbox oldest first, optionally narrowed to some kinds and statuses.`,
  })
  async planMessages(
    @Args('input', { type: () => ListPlanMessagesInput })
    input: ListPlanMessagesInput,
  ): Promise<PlanMessage[]> {
    return this.planMessagesService.listMessages({
      kinds: input.kinds ?? null,
      planId: input.planId,
      statuses: input.statuses ?? null,
    });
  }

  @Mutation(() => PlanMessageObject, {
    description: `Post a human message to a plan's inbox. STEER and QUEUE start PENDING and are delivered to the plan's live (or next) run at its next task boundary; FEEDBACK is recorded and never delivered.`,
  })
  async postPlanMessage(
    @Args('input', { type: () => PostPlanMessageInput })
    input: PostPlanMessageInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<PlanMessage> {
    const body = requireBody(input.body);
    // Attribution is derived server-side so the Developer UI, the OT MCP and raw GraphQL are
    // stamped identically; an explicit author (the MCP pass-through) still wins.
    const author = resolveNoteAuthor(
      input.author,
      this.globalCls.get('user'),
      principal,
    );

    if (author == null) {
      throw new BadRequestException(
        'A plan message needs an author: pass one or call with an authenticated identity',
      );
    }

    const result = await this.planMessagesService.postMessage({
      author,
      body,
      kind: input.kind,
      planId: input.planId,
      taskId: input.taskId ?? null,
    });

    if (!result.ok) {
      throw new NotFoundException(`Plan not found: ${input.planId}`);
    }

    await this.publishMessages([result.message]);

    return result.message;
  }

  @Mutation(() => PlanMessageObject, {
    description: `Edit the body of a PENDING plan message. Delivered, withdrawn and recorded messages are immutable.`,
  })
  async updatePlanMessage(
    @Args('input', { type: () => UpdatePlanMessageInput })
    input: UpdatePlanMessageInput,
  ): Promise<PlanMessage> {
    const result = await this.planMessagesService.editPendingMessage({
      body: requireBody(input.body),
      id: input.id,
    });

    return this.settlePendingWrite(input.id, result);
  }

  @Mutation(() => PlanMessageObject, {
    description: `Withdraw a PENDING plan message so no run receives it.`,
  })
  async withdrawPlanMessage(
    @Args('input', { type: () => WithdrawPlanMessageInput })
    input: WithdrawPlanMessageInput,
  ): Promise<PlanMessage> {
    const result = await this.planMessagesService.withdrawPendingMessage(
      input.id,
    );

    return this.settlePendingWrite(input.id, result);
  }

  @Mutation(() => ClaimPlanMessagesResultObject, {
    description: `Claim every PENDING STEER/QUEUE message on a plan for delivery at a task boundary. Marks them DELIVERED (stamping the run and task) and records the delivery on the plan output stream in one transaction, so a message is delivered at most once and never unrecorded. Returns STEERs first.`,
  })
  async claimPlanMessages(
    @Args('input', { type: () => ClaimPlanMessagesInput })
    input: ClaimPlanMessagesInput,
  ): Promise<ClaimPlanMessagesResult> {
    const result = await this.planMessagesService.claimPendingMessages({
      planId: input.planId,
      planRunId: input.planRunId ?? null,
      taskId: input.taskId ?? null,
    });

    if (result.auditChunk) {
      await Promise.all([
        this.publishMessages(result.messages),
        this.pubSub.publish(planOutputTopic(input.planId), {
          planOutputChunkAdded: result.auditChunk,
        }),
      ]);
    }

    return result;
  }

  // 🔌 graphql-ws only: connection auth (onConnect) already validated the token and stashed userId
  // on the context, so skip the HTTP-shaped global auth guard and authorize from it here.
  @Public()
  @Subscription(() => PlanMessageObject, {
    description: `Live stream of a plan's inbox: each message as it is posted, edited, withdrawn or delivered (topic plan:<planId>:messages).`,
  })
  planMessageChanged(
    @Args('planId', { type: () => ID }) planId: string,
    @Context() context: { userId?: string },
  ): AsyncIterator<PlanMessage> {
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }

    return this.pubSub.asyncIterator<PlanMessage>(planMessagesTopic(planId));
  }

  /**
   * @description Publishes each message on its plan's inbox topic, keyed by the subscription field.
   */
  private async publishMessages(
    messages: readonly PlanMessage[],
  ): Promise<void> {
    await Promise.all(
      messages.map((message) =>
        this.pubSub.publish(planMessagesTopic(message.planId), {
          planMessageChanged: message,
        }),
      ),
    );
  }

  /**
   * @description Maps a PENDING-only write onto the GraphQL contract: the message, or a 4xx naming
   * why it was refused.
   */
  private async settlePendingWrite(
    id: string,
    result: PendingPlanMessageWriteResult,
  ): Promise<PlanMessage> {
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') {
        throw new NotFoundException(`Plan message not found: ${id}`);
      }
      throw new BadRequestException(
        `Plan message ${id} is no longer PENDING and cannot be changed`,
      );
    }

    await this.publishMessages([result.message]);

    return result.message;
  }
}

/**
 * @description Trims a message body and rejects a blank one before it reaches the CHECK constraint.
 */
function requireBody(body: string): string {
  const trimmed = body.trim();

  if (trimmed === '') {
    throw new BadRequestException('A plan message body must not be blank');
  }

  return trimmed;
}
