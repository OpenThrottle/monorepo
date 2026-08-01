/**
 * @description GraphQL ObjectType for a skill_usage_events row. Mirrors the
 * entity from @openthrottle/nestjs-repositories.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SkillUsageEventObject {
  @Field(() => String, {
    description: `Subagent id when the Skill call happened inside a nested agent.`,
    nullable: true,
  })
  agentId!: string | null;

  @Field(() => String, {
    description: `Subagent type when present (e.g. general-purpose).`,
    nullable: true,
  })
  agentType!: string | null;

  @Field(() => String, {
    description: `Skill args after client privacy seam. Null when privacyLevel is name-only.`,
    nullable: true,
  })
  args!: string | null;

  @Field(() => String, {
    description: `Working directory reported by the harness at invocation time.`,
    nullable: true,
  })
  cwd!: string | null;

  @Field(() => String, {
    description: `Git branch at capture time (best-effort).`,
    nullable: true,
  })
  gitBranch!: string | null;

  @Field(() => String, {
    description: `Hook that captured the event (PreToolUse or UserPromptExpansion).`,
    nullable: true,
  })
  hookEventName!: string | null;

  @Field(() => ID, { description: `Skill usage event id.` })
  id!: string;

  @Field(() => String, {
    description: `Invocation path: skill_tool or slash.`,
    nullable: true,
  })
  invocationPath!: string | null;

  @Field(() => Date, {
    description: `Client-reported invocation timestamp.`,
  })
  occurredAt!: Date;

  @Field(() => String, {
    description: `Client privacy level applied before ingest: name-only | truncated | full.`,
  })
  privacyLevel!: string;

  @Field(() => String, {
    description: `Harness prompt_id when present.`,
    nullable: true,
  })
  promptId!: string | null;

  @Field(() => Date, {
    description: `Server receipt time (set on insert).`,
  })
  receivedAt!: Date;

  @Field(() => String, {
    description: `ours | third-party — derived by the client against skills/.`,
  })
  scope!: string;

  @Field(() => String, {
    description: `Harness session id when present.`,
    nullable: true,
  })
  sessionId!: string | null;

  @Field(() => String, {
    description: `Skill identifier (e.g. ot-plans, vercel:deploy).`,
  })
  skillName!: string;

  @Field(() => String, {
    description: `Harness tool_use_id for the Skill call when present.`,
    nullable: true,
  })
  toolUseId!: string | null;
}
