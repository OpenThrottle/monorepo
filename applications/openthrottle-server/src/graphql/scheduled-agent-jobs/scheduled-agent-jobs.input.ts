/**
 * @description GraphQL inputs for scheduled-agent-job mutations. `settingsJson` is a JSON string of
 * the AgentPromptSettings subset ({ endpoint?, worktree? }); unknown keys and endpoint.apiKey are
 * rejected server-side. `ownerUserId` is never client-supplied — it is derived from the caller.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateScheduledAgentJobInputType {
  @Field(() => String, { description: `Human-friendly schedule name.` })
  name!: string;

  @Field(() => String, { description: `Prompt passed to the agent CLI.` })
  prompt!: string;

  @Field(() => String, {
    description: `Agent driver id (claude | codex | cursor | grok | opencode).`,
  })
  driverId!: string;

  @Field(() => String, {
    description: `Model preset; omit for the driver default.`,
    nullable: true,
  })
  model?: string;

  @Field(() => String, {
    description: `JSON AgentPromptSettings ({ endpoint?, worktree? }); no endpoint.apiKey. Omit for none.`,
    nullable: true,
  })
  settingsJson?: string;

  @Field(() => String, {
    description: `5- or 6-field cron pattern (may not fire every minute or sub-minute).`,
  })
  cronPattern!: string;

  @Field(() => String, {
    description: `IANA timezone; omit for UTC.`,
    nullable: true,
  })
  timezone?: string;

  @Field(() => Int, {
    description: `Per-run timeout override in ms; omit for the queue default.`,
    nullable: true,
  })
  timeoutMs?: number;

  @Field(() => String, {
    deprecationReason: `Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set.`,
    description: `Legacy explicit process cwd for the agent CLI; omit for WORKSPACE_ROOT.`,
    nullable: true,
  })
  cwd?: string;

  @Field(() => ID, {
    description: `Registered repository checkout to run in; must belong to the caller. Takes precedence over cwd. Omit for the legacy cwd / WORKSPACE_ROOT fallback.`,
    nullable: true,
  })
  repositoryCheckoutId?: string;

  @Field(() => Boolean, {
    description: `Whether the schedule starts enabled (default true).`,
    nullable: true,
  })
  enabled?: boolean;
}

@InputType()
export class UpdateScheduledAgentJobInputType {
  @Field(() => ID, { description: `Schedule to update.` })
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  prompt?: string;

  @Field(() => String, { nullable: true })
  driverId?: string;

  @Field(() => String, { nullable: true })
  model?: string;

  @Field(() => String, {
    description: `JSON AgentPromptSettings; no endpoint.apiKey.`,
    nullable: true,
  })
  settingsJson?: string;

  @Field(() => String, { nullable: true })
  cronPattern?: string;

  @Field(() => String, { nullable: true })
  timezone?: string;

  @Field(() => Int, { nullable: true })
  timeoutMs?: number;

  @Field(() => String, {
    deprecationReason: `Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set.`,
    nullable: true,
  })
  cwd?: string;

  @Field(() => ID, {
    description: `Registered repository checkout to run in; must belong to the caller. Takes precedence over cwd.`,
    nullable: true,
  })
  repositoryCheckoutId?: string;
}

@InputType()
export class SetScheduledAgentJobEnabledInputType {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean)
  enabled!: boolean;
}
