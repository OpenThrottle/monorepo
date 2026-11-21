/**
 * @description GraphQL inputs of the agent scheduling mutations. They derive from the human inputs but
 * deliberately leave out what would let an agent reach past its checkout: `cwd` (an arbitrary process
 * directory) and `settingsJson` (a custom model endpoint, worktree paths). `createdVia` is also NOT a
 * field: the server stamps `mcp` on every job this path creates, so a client cannot claim to be (or
 * not to be) an agent. A create must name a `repositoryCheckoutId` (the caller's own, validated by the
 * shared service) instead of falling back to the server's workspace root.
 */

import { Field, ID, InputType, OmitType } from '@nestjs/graphql';

import {
  CreateScheduledAgentJobInputType,
  UpdateScheduledAgentJobInputType,
} from '../scheduled-agent-jobs.input.ts';

@InputType()
export class CreateScheduledAgentJobAsAgentInputType extends OmitType(
  CreateScheduledAgentJobInputType,
  ['cwd', 'repositoryCheckoutId', 'settingsJson'],
  InputType,
) {
  @Field(() => String, {
    description: `Caller-chosen key (1-200 characters) that makes a retried create safe: a second create with the same key returns the job the first one made instead of a duplicate. Unique per owner.`,
  })
  idempotencyKey!: string;

  @Field(() => ID, {
    description: `Registered repository checkout to run in; must belong to the caller.`,
  })
  repositoryCheckoutId!: string;
}

@InputType()
export class UpdateScheduledAgentJobAsAgentInputType extends OmitType(
  UpdateScheduledAgentJobInputType,
  ['cwd', 'settingsJson'],
  InputType,
) {
  @Field(() => Boolean, {
    description: `Enable or disable the job. Cannot enable a job that is still awaiting human approval.`,
    nullable: true,
  })
  enabled?: boolean;
}
