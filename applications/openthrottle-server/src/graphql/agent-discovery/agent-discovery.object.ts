/**
 * @description GraphQL ObjectTypes for agent-CLI discovery: an available agent
 * backend the server can spawn, and a ListResult-style envelope. Backs the
 * discoverAgentClis query (kept separate from discoverLocalModels — an agent is
 * a binary + availability, not endpoints × models).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentCliModelOption {
  @Field(() => String, {
    description: `Opaque driver-supplied model id as returned by discoverAgentClis (e.g. "gpt-5.2").`,
  })
  model!: string;

  @Field(() => Boolean, {
    description: `Effective per-user enablement of this model: false when the user disabled this model OR disabled the whole agent (an agent-level OFF hard-overrides every model). Disabled models are hidden from chat/model pickers and rejected when starting new runs. Defaults to true for an unauthenticated request.`,
  })
  enabled!: boolean;

  @Field(() => Boolean, {
    description: `Whether the current user has favorited this model. Favorites float to the top of / are highlighted in chat/model pickers and run selection; favoriting is orthogonal to enablement. Defaults to false for an unauthenticated request.`,
  })
  favorite!: boolean;
}

@ObjectType()
export class AgentCliAuthStatusObject {
  @Field(() => String, {
    description: `Logged-in account email as reported by \`claude auth status\`, or null when unknown. No tokens or credential files are read.`,
    nullable: true,
  })
  accountEmail!: string | null;

  @Field(() => String, {
    description: `The credential Claude runs will actually bill: "subscription" (claude.ai login), "apiKey" (ANTHROPIC_API_KEY or a configured key source — it always wins in -p mode), or "none". Derived from \`claude auth status\` plus the presence (never the value) of ANTHROPIC_API_KEY in the server env.`,
  })
  activeCredential!: string;

  @Field(() => Boolean, {
    description: `True when an API key is active while a subscription login also exists, so runs bill the API key instead of the subscription.`,
  })
  apiKeyOverridesSubscription!: boolean;

  @Field(() => String, {
    description: `Login method as reported by \`claude auth status\` (e.g. "claude.ai"), or null when unknown.`,
    nullable: true,
  })
  authMethod!: string | null;

  @Field(() => Boolean, {
    description: `True when \`claude auth status\` reports a logged-in account.`,
  })
  loggedIn!: boolean;

  @Field(() => String, {
    description: `Organization name as reported by \`claude auth status\`, or null when unknown.`,
    nullable: true,
  })
  organizationName!: string | null;

  @Field(() => String, {
    description: `Subscription plan (e.g. "pro", "max", "team") as reported by \`claude auth status\`, or null when unknown.`,
    nullable: true,
  })
  subscriptionType!: string | null;

  @Field(() => String, {
    description: `A loud, specific sentence when the credential setup needs attention (API key overriding the subscription, or not logged in); null when everything is fine.`,
    nullable: true,
  })
  warning!: string | null;
}

@ObjectType()
export class ChatBackendCapabilitiesObject {
  @Field(() => Boolean, {
    description: `Tool-use approvals surface to the user in supervised mode (true only on the ACP path).`,
  })
  approvals!: boolean;

  @Field(() => Boolean, {
    description: `The backend accepts image input in a prompt.`,
  })
  imageInput!: boolean;

  @Field(() => Boolean, {
    description: `The chat adapter injects the run's MCP servers (OT MCP) per run.`,
  })
  mcpInjection!: boolean;

  @Field(() => Boolean, {
    description: `The backend is handed the full message history every turn, so a backend handoff would duplicate it.`,
  })
  replaysFullHistory!: boolean;

  @Field(() => Boolean, {
    description: `A conversation resumes by backend session id across turns.`,
  })
  resume!: boolean;

  @Field(() => Boolean, {
    description: `The user can steer a turn that is already running.`,
  })
  steering!: boolean;
}

@ObjectType()
export class AgentCliAuthStateObject {
  @Field(() => String, {
    description: `Short explanation of the state (e.g. the account or the credential source), or null. No credential contents are read.`,
    nullable: true,
  })
  detail!: string | null;

  @Field(() => String, {
    description: `"authenticated", "unauthenticated", or "unknown" (the backend is not probed).`,
  })
  status!: string;
}

@ObjectType()
export class AgentCliOptionObject {
  @Field(() => String, {
    description: `Backend discriminator (e.g. "cursor") used in StartConversationStreamInput.`,
  })
  backend!: string;

  @Field(() => AgentCliAuthStatusObject, {
    description: `Logged-in account, subscription plan and active credential, reported by \`claude auth status --json\` (no OAuth tokens or credential files are read, and no Anthropic endpoint is called). Null for CLIs other than claude, or when the probe failed or timed out.`,
    nullable: true,
  })
  auth!: AgentCliAuthStatusObject | null;

  @Field(() => AgentCliAuthStateObject, {
    description: `Generic login state for this backend: probed for claude and cursor (no credential contents are read); "unknown" for the rest.`,
  })
  authState!: AgentCliAuthStateObject;

  @Field(() => ChatBackendCapabilitiesObject, {
    description: `Behavioral capabilities of this backend's chat path (resume, approvals, steering, image input, MCP injection, full-history replay). Reflects OPENTHROTTLE_CHAT_ACP_BACKENDS. Read these instead of branching on the backend name.`,
  })
  capabilities!: ChatBackendCapabilitiesObject;

  @Field(() => Boolean, {
    description: `True when this CLI resolves the workspace's committed MCP config (.mcp.json / .cursor/mcp.json / opencode.json), so a run in this checkout can reach openthrottle-mcp. False for antigravity and codex, which read only their own config scope (antigravity: ~/.gemini/config/mcp_config.json; codex: user-scope config.toml; never .mcp.json) — for those, MCP reachability is a property of the host and cannot be verified from the workspace, so present it as unverifiable rather than as definitely missing. Distinct from emitting MCP flags: claude, grok, and opencode emit none yet attach fine.`,
  })
  attachesWorkspaceMcp!: boolean;

  @Field(() => Boolean, {
    description: `True when this driver has a wired streaming chat backend and can be offered as a chat composer backend (false for plan-run-only drivers like codex/grok).`,
  })
  chatCapable!: boolean;

  @Field(() => Boolean, {
    description: `Per-user enablement: true unless the current user has disabled this agent on /settings/agents. A disabled agent is hidden from chat/model pickers and rejected when starting new runs. Defaults to true for an unauthenticated request.`,
  })
  enabled!: boolean;

  @Field(() => String, {
    description: `Human-readable label for the selector.`,
  })
  label!: string;

  @Field(() => [String], {
    deprecationReason: `Use modelOptions, which carries per-user enabled + favorite state per model.`,
    description: `Models this CLI can run (empty when the CLI exposes no machine-listable models or listing failed). Returns ALL discovered model ids, unfiltered by per-user preferences.`,
  })
  models!: string[];

  @Field(() => [AgentCliModelOption], {
    description: `Models this CLI can run, each with the current user's per-model enabled + favorite state overlaid. Empty when the CLI exposes no machine-listable models. Prefer this over the deprecated \`models\` list.`,
  })
  modelOptions!: AgentCliModelOption[];

  @Field(() => Boolean, {
    description: `True when this driver can be pointed at a custom OpenAI-compatible base URL (a discovered local endpoint); gates driver×endpoint targeting in the composer. False for claude/cursor (own cloud wire protocol).`,
  })
  supportsCustomBaseUrl!: boolean;

  @Field(() => String, {
    description: `Trimmed --version output, or null when unknown.`,
    nullable: true,
  })
  version!: string | null;
}

@ObjectType()
export class DiscoverAgentClisResult {
  @Field(() => [AgentCliOptionObject], {
    description: `Allowlisted agent CLIs detected as available on the server host.`,
  })
  agents!: AgentCliOptionObject[];

  @Field(() => String, {
    description: `ISO-8601 timestamp of when this snapshot was scanned.`,
  })
  scannedAt!: string;

  @Field(() => Int, { description: `Number of available agent CLIs.` })
  totalCount!: number;
}
