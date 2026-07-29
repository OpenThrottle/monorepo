/**
 * @description GraphQL input for starting a streamed conversation turn. A single
 * `backend` discriminator selects the source: `openai` (default) streams from a
 * discovered local endpoint (baseUrl + modelId, validated server-side as an SSRF
 * guard); a CLI backend (e.g. `cursor`) spawns an allowlisted agent in a
 * repository checkout (repositoryId, resolved + ownership-checked server-side).
 * baseUrl/modelId are nullable because CLI backends do not use them.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class StartConversationStreamInput {
  @Field(() => String, {
    description: `Backend to stream from: "openai" (default) or an allowlisted agent CLI (e.g. "cursor"). Omit for openai.`,
    nullable: true,
  })
  backend?: string | null;

  @Field(() => String, {
    description: `OpenAI-compatible base URL of a discovered local endpoint, e.g. http://localhost:11434/v1. Required for the openai backend.`,
    nullable: true,
  })
  baseUrl?: string | null;

  @Field(() => ID, {
    description: `Existing conversation to continue; omit to start a new conversation.`,
    nullable: true,
  })
  conversationId?: string | null;

  @Field(() => [String], {
    description: `Workspace-relative POSIX paths @-mentioned in the message (parsed client-side). Nullable + additive. The paths also travel inline in the message as @path tokens; the server additionally injects them as structured turn context ("Referenced files") so the agent treats them as first-class references.`,
    nullable: true,
  })
  fileMentions?: string[] | null;

  @Field(() => String, {
    description: `User message text for this turn.`,
  })
  message!: string;

  @Field(() => String, {
    description: `Model id to complete with. Required for the openai backend; optional model override for CLI backends.`,
    nullable: true,
  })
  modelId?: string | null;

  @Field(() => ID, {
    description: `Persona to steer the turn; CLI backends inject it as a system prompt.`,
    nullable: true,
  })
  personaId?: string | null;

  @Field(() => String, {
    description: `Permission mode for an agent backend: "supervised", "autoAcceptEdits", or "fullAccess". Nullable + additive. Honored: each CLI backend maps it to concrete permission/sandbox flags in its argv/config builder (a backend that cannot route it ignores it).`,
    nullable: true,
  })
  permissionMode?: string | null;

  @Field(() => String, {
    description: `Reasoning-effort level for the turn: "low", "medium", "high", "extraHigh", "max", or "ultra". Nullable + additive. Honored: each backend that exposes a reasoning knob maps it to its own vocabulary (claude --effort, grok --reasoning-effort, codex -c model_reasoning_effort=, opencode --variant, cursor model-string [effort=…], openai reasoning_effort), clamping to its accepted set.`,
    nullable: true,
  })
  reasoning?: string | null;

  @Field(() => ID, {
    description: `Registered WorkspaceLocalRepository to run a CLI backend in. Required for CLI backends in production (the server resolves + ownership-checks the path).`,
    nullable: true,
  })
  repositoryId?: string | null;

  @Field(() => String, {
    description: `Service tier for the turn: "standard" or "fast". Nullable + additive. Honored only by backends that can route by tier (cursor-agent, via the model-string [fast=…] suffix); backends without a tier concept ignore it.`,
    nullable: true,
  })
  serviceTier?: string | null;
}
