/**
 * @description GraphQL input types for work-ledger operations. One input arg per operation,
 * matching the repo convention. Actor is NEVER an input — it is stamped server-side from the
 * authenticated principal (design §2.1).
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class StartWorkSessionInput {
  @Field(() => String, {
    description: `Chat conversation id when this session is a chat thread`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => String, {
    description: `External correlation id (BullMQ job id, worktree+pid, agent session id)`,
    nullable: true,
  })
  externalRef!: string | null;

  @Field(() => String, {
    description: `Model identifier when an agent did the work (e.g. claude-fable-5)`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => ID, {
    description: `Unverified hint: the human this machine work is on behalf of (users.id)`,
    nullable: true,
  })
  onBehalfOfUserId!: string | null;

  @Field(() => ID, {
    description: `plan_runs.id when this session is a Ralph run`,
    nullable: true,
  })
  planRunId!: string | null;

  @Field(() => String, {
    description: `Tool that produced the work: developer-app | openthrottle-mcp | workflow-ralph | MCP clientInfo.name`,
  })
  toolName!: string;

  @Field(() => String, { description: `Tool/client version`, nullable: true })
  toolVersion!: string | null;
}

@InputType()
export class RecordWorkArtifactInput {
  @Field(() => String, {
    description: `Optional human-readable note (e.g. commit message)`,
    nullable: true,
  })
  message!: string | null;

  @Field(() => String, {
    description: `JSON-serialized payload; validated server-side against the type's schema`,
  })
  payloadJson!: string;

  @Field(() => ID, { description: `Session that produced the artifact` })
  sessionId!: string;

  @Field(() => String, {
    description: `Artifact type: git_commit | pull_request | document | deployment | status_change`,
  })
  type!: string;
}

@InputType()
export class AttachWorkSessionSubjectInput {
  @Field(() => ID, { description: `Subject plan` })
  planId!: string;

  @Field(() => ID, { description: `Session to attach the subject to` })
  sessionId!: string;

  @Field(() => ID, {
    description: `Subject task (task-level subject); omit for plan-level`,
    nullable: true,
  })
  taskId!: string | null;
}

@InputType()
export class EndWorkSessionInput {
  @Field(() => ID, { description: `Session to close` })
  sessionId!: string;

  @Field(() => String, {
    description: `Summary set at close (legibility for unpromoted sessions)`,
    nullable: true,
  })
  summary!: string | null;
}

@InputType()
export class WorkSessionsByPlanInput {
  @Field(() => ID, { description: `Plan id to list sessions for` })
  planId!: string;
}

@InputType()
export class WorkArtifactsBySessionInput {
  @Field(() => ID, { description: `Session id to list artifacts for` })
  sessionId!: string;
}

@InputType()
export class WorkArtifactsByPlanInput {
  @Field(() => ID, { description: `Plan id to list linked artifacts for` })
  planId!: string;
}

@InputType()
export class WorkArtifactsByTaskInput {
  @Field(() => ID, { description: `Task id to list linked artifacts for` })
  taskId!: string;
}

@InputType()
export class UnverifiedWorkArtifactsInput {
  @Field(() => Int, {
    description: `Max rows (verifier feed); clamped server-side`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => String, {
    description: `Restrict to a single artifact type (e.g. git_commit)`,
    nullable: true,
  })
  type!: string | null;
}
