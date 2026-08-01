/**
 * @description GraphQL input for recordSkillUsage. Mirrors the Phase 1 JSONL
 * event; args must already be privacy-processed by the client.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RecordSkillUsageInput {
  @Field(() => String, {
    description: `Subagent id when the Skill call happened inside a nested agent.`,
    nullable: true,
  })
  agentId?: string | null;

  @Field(() => String, {
    description: `Subagent type when present.`,
    nullable: true,
  })
  agentType?: string | null;

  @Field(() => String, {
    description: `Args after client privacy seam. Pass null for name-only.`,
    nullable: true,
  })
  args?: string | null;

  @Field(() => String, {
    description: `Working directory at invocation time.`,
    nullable: true,
  })
  cwd?: string | null;

  @Field(() => String, {
    description: `Git branch at capture time.`,
    nullable: true,
  })
  gitBranch?: string | null;

  @Field(() => String, {
    description: `Hook event name (PreToolUse or UserPromptExpansion).`,
    nullable: true,
  })
  hookEventName?: string | null;

  @Field(() => String, {
    description: `Invocation path: skill_tool or slash.`,
    nullable: true,
  })
  invocationPath?: string | null;

  @Field(() => Date, {
    description: `Client-reported invocation timestamp (JSONL timestamp).`,
  })
  occurredAt!: Date;

  @Field(() => String, {
    description: `Client privacy level: name-only | truncated | full. Defaults to truncated.`,
    nullable: true,
  })
  privacyLevel?: string | null;

  @Field(() => String, {
    description: `Harness prompt_id when present.`,
    nullable: true,
  })
  promptId?: string | null;

  @Field(() => String, {
    description: `ours | third-party.`,
  })
  scope!: string;

  @Field(() => String, {
    description: `Harness session id when present.`,
    nullable: true,
  })
  sessionId?: string | null;

  @Field(() => String, {
    description: `Skill identifier (e.g. ot-plans, vercel:deploy).`,
  })
  skillName!: string;

  @Field(() => String, {
    description: `Harness tool_use_id when present.`,
    nullable: true,
  })
  toolUseId?: string | null;
}
