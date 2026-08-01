/**
 * @description GraphQL ObjectTypes for skill usage: one ingest row
 * (SkillUsageEventObject) plus aggregation shapes for the Developer Usage
 * surface (by skill, by scope, by day, filter options, result envelope).
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

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

@ObjectType()
export class SkillUsageBySkillObject {
  @Field(() => Int, {
    description: `Invocation count for this skill in the filtered range.`,
  })
  count!: number;

  @Field(() => String, {
    description: `ours | third-party for this skill row.`,
  })
  scope!: string;

  @Field(() => String, {
    description: `Skill identifier (e.g. ot-plans, vercel:deploy).`,
  })
  skillName!: string;
}

@ObjectType()
export class SkillUsageByScopeObject {
  @Field(() => Int, {
    description: `Invocation count for this scope in the filtered range.`,
  })
  count!: number;

  @Field(() => String, {
    description: `ours | third-party.`,
  })
  scope!: string;
}

@ObjectType()
export class SkillUsageByDayObject {
  @Field(() => String, {
    description: `UTC calendar day (YYYY-MM-DD).`,
  })
  date!: string;

  @Field(() => Int, {
    description: `ours-scoped invocations on this day.`,
  })
  oursCount!: number;

  @Field(() => Int, {
    description: `third-party-scoped invocations on this day.`,
  })
  thirdPartyCount!: number;

  @Field(() => Int, {
    description: `Total invocations on this day.`,
  })
  totalCount!: number;
}

@ObjectType()
export class SkillUsageFilterOptionsObject {
  @Field(() => [String], {
    description: `Distinct non-null cwd values in the date window (for project/path filter).`,
  })
  cwds!: string[];

  @Field(() => [String], {
    description: `Distinct non-null git branch values in the date window.`,
  })
  gitBranches!: string[];
}

@ObjectType()
export class SkillUsageResultObject {
  @Field(() => [SkillUsageByDayObject], {
    description: `Per-day series (UTC), oldest first, with ours/third-party split.`,
  })
  byDay!: SkillUsageByDayObject[];

  @Field(() => [SkillUsageByScopeObject], {
    description: `ours vs third-party totals for the filtered range.`,
  })
  byScope!: SkillUsageByScopeObject[];

  @Field(() => [SkillUsageBySkillObject], {
    description: `Top skills by count (highest first; capped).`,
  })
  bySkill!: SkillUsageBySkillObject[];

  @Field(() => SkillUsageFilterOptionsObject, {
    description: `Distinct branch/cwd values in the date window for filter dropdowns.`,
  })
  filterOptions!: SkillUsageFilterOptionsObject;

  @Field(() => Int, {
    description: `Total invocations matching the filtered range.`,
  })
  totalCount!: number;
}
