import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  cliGroupId,
  encodeCliEndpointOptionId,
  encodeCliOptionId,
  encodeModelOptionId,
  openaiGroupId,
} from './chat-model-option';

/**
 * @description Shared GraphQL-discovery → composer toolbar-option mappers and the
 * chat-options response contract, consumed by BOTH openthrottle-developer and
 * openthrottle-admin (each previously carried a drifted copy — the admin app was
 * even missing the driver×endpoint join). The inputs are hand-written STRUCTURAL
 * types (not generated GraphQL types) — the same pattern `react-router-chat`'s
 * `conversation-stream.ts` uses — so this pure logic lives once in the shared
 * package and each app's generated discovery payload is structurally assignable.
 * The pure encode/group id helpers this builds on live in `./chat-model-option`.
 */

/** Docker-only host: reachable from a containerized server, not always from the driver process. */
const DOCKER_INTERNAL_HOST = 'host.docker.internal';

/**
 * A discovered local OpenAI-compatible endpoint and the models it serves.
 * Structural subset of the app-generated `discoverLocalModels` endpoint.
 * @public
 */
export interface DiscoveredLocalEndpoint {
  readonly baseUrl: string;
  readonly host: string;
  readonly models: readonly string[];
  readonly provider?: string | null;
}

/** The `discoverLocalModels` payload the mappers read. @public */
export interface DiscoveredLocalModels {
  readonly endpoints: readonly DiscoveredLocalEndpoint[];
}

/**
 * A discovered agent CLI model with the current user's per-model preferences.
 * Structural subset of the app-generated `discoverAgentClis` `modelOptions` row.
 * @public
 */
export interface DiscoveredAgentCliModelOption {
  /**
   * Effective per-user enablement (agent-OFF already folded in server-side): a
   * `false` model is dropped from the composer options.
   */
  readonly enabled: boolean;
  /** Whether the user favorited this model — floats it into the Favorites group. */
  readonly favorite: boolean;
  readonly model: string;
}

/**
 * A discovered agent CLI backend. Structural subset of the app-generated
 * `discoverAgentClis` agent.
 * @public
 */
export interface DiscoveredAgentCli {
  readonly backend: string;
  readonly chatCapable: boolean;
  /**
   * Whether the current user has left this agent enabled. Optional because the
   * admin app's discovery query does not select it; a missing value is treated
   * as enabled (the server default is all-enabled), so only an explicit `false`
   * hides the agent (and its models) from the composer options.
   */
  readonly enabled?: boolean;
  readonly label: string;
  /**
   * Per-model enabled + favorite state. Preferred over {@link models} when
   * present; optional because the admin app's discovery query does not select it
   * (it falls back to the flat `models` list, all enabled + unfavorited).
   */
  readonly modelOptions?: readonly DiscoveredAgentCliModelOption[];
  /**
   * Flat model-id list (the deprecated server field). Optional because a query
   * may select only {@link modelOptions} instead; a missing value with no
   * `modelOptions` means the driver lists no models.
   */
  readonly models?: readonly string[];
  /**
   * Whether the driver accepts a custom OpenAI-compatible base URL — read only
   * by {@link toDriverEndpointChatOptions}. Optional because the admin app's
   * discovery query does not select it (it never offers the driver×endpoint
   * join); a missing value is treated as not-capable.
   */
  readonly supportsCustomBaseUrl?: boolean;
}

/** The `discoverAgentClis` payload the mappers read. @public */
export interface DiscoveredAgentClis {
  readonly agents: readonly DiscoveredAgentCli[];
}

/**
 * A registry persona (custom_prompts, promptType=PERSONAS). Structural subset of
 * the app-generated `customPrompts` row.
 * @public
 */
export interface DiscoveredPersonaPrompt {
  readonly description?: string | null;
  readonly id: string;
  readonly title: string;
}

/**
 * A registered local checkout selectable as the working directory for a CLI
 * agent. Shared so both apps' `models.server` and the composer surfaces agree on
 * the shape.
 * @public
 */
export interface RepositoryOption {
  readonly displayName: string;
  readonly id: string;
}

/**
 * JSON shape returned by the `/resources/chat-options` resource route to the
 * global header chat's option-data fetcher. Single-sourced so the developer and
 * admin routes cannot drift.
 * @public
 */
export interface ChatOptionsResponse {
  /** Discovered local OpenAI models followed by allowlisted agent CLIs. */
  readonly models: readonly ChatModelOption[];
  readonly personas: readonly ChatPersonaOption[];
  readonly repositories: readonly RepositoryOption[];
}

/**
 * Flatten discovered endpoints × models into composer toolbar options, grouped
 * (for the model picker) by provider/endpoint.
 * @public
 */
export function toChatModelOptions(
  discovery: DiscoveredLocalModels,
): ChatModelOption[] {
  return discovery.endpoints.flatMap((endpoint) => {
    const providerOrHost = endpoint.provider ?? endpoint.host;
    return endpoint.models.map((model) => ({
      description: providerOrHost,
      groupId: openaiGroupId(providerOrHost),
      id: encodeModelOptionId(endpoint.baseUrl, model),
      label: model,
    }));
  });
}

/**
 * The user-facing models of an agent, resolved to `{ model, favorite }` pairs.
 * Prefers the per-model `modelOptions` (dropping user-disabled models and
 * carrying the favorite flag); falls back to the flat `models` list (all shown,
 * none favorited) when the discovery query did not select `modelOptions`.
 * Favorites are ordered first so they lead their picker group.
 */
function resolveAgentModels(
  agent: DiscoveredAgentCli,
): { favorite: boolean; model: string }[] {
  const resolved =
    agent.modelOptions != null
      ? agent.modelOptions
          .filter((option) => option.enabled)
          .map((option) => ({ favorite: option.favorite, model: option.model }))
      : (agent.models ?? []).map((model) => ({ favorite: false, model }));

  // Favorites first, otherwise stable in discovery order.
  return resolved
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.favorite !== b.entry.favorite) {
        return a.entry.favorite ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

/**
 * Map discovered agent CLIs into composer toolbar options. Only chat-capable
 * drivers the user has NOT disabled are offered (plan-run-only drivers like
 * codex/grok are discoverable but have no streaming chat adapter; a disabled
 * agent is hidden here and its models drop out transitively). Each of a driver's
 * ENABLED models becomes its own option (id `backend|model`, e.g. `cursor|gpt-5.2`),
 * favorited models flagged (`favorite: true`) and ordered first; a driver with no
 * listable models falls back to a single bare-backend option at its default model.
 * Each driver gets its own picker rail group keyed on its backend
 * ({@link cliGroupId}), with the driver label as each row's sub-label to
 * disambiguate same-named models.
 * @public
 */
export function toAgentChatOptions(
  discovery: DiscoveredAgentClis,
): ChatModelOption[] {
  return discovery.agents
    .filter((agent) => agent.chatCapable && agent.enabled !== false)
    .flatMap((agent) => {
      const models = resolveAgentModels(agent);
      if (models.length === 0) {
        // Distinguish "driver lists no models" (→ a single bare-backend option
        // at its default model) from "every model disabled" (→ offer nothing).
        const listedCount =
          agent.modelOptions?.length ?? agent.models?.length ?? 0;
        if (listedCount > 0) {
          return [];
        }
        return [
          {
            description: agent.label,
            groupId: cliGroupId(agent.backend),
            id: agent.backend,
            label: agent.label,
            subLabel: agent.label,
          },
        ];
      }

      return models.map(({ favorite, model }) => ({
        description: agent.label,
        favorite,
        groupId: cliGroupId(agent.backend),
        id: encodeCliOptionId(agent.backend, model),
        label: model,
        subLabel: agent.label,
      }));
    });
}

/**
 * Join discovered agent CLIs with discovered local endpoints into "driver ×
 * local endpoint/model" composer options. Only base-URL-capable, chat-capable
 * drivers the user has NOT disabled are offered (claude/cursor can't consume a
 * raw OpenAI-compatible endpoint; a disabled agent drops out here too); each
 * option pairs such a driver with every discovered endpoint × model. Grouped
 * under the driver's own rail ({@link cliGroupId}); the endpoint's provider/host
 * is surfaced in the description so the network vantage is visible (a
 * `host.docker.internal` endpoint is flagged, since it may be unreachable from a
 * driver process running outside that Docker network).
 * @public
 */
export function toDriverEndpointChatOptions(
  agents: DiscoveredAgentClis,
  localModels: DiscoveredLocalModels,
): ChatModelOption[] {
  const capableDrivers = agents.agents.filter(
    (agent) =>
      agent.chatCapable &&
      agent.enabled !== false &&
      agent.supportsCustomBaseUrl,
  );

  return capableDrivers.flatMap((agent) =>
    localModels.endpoints.flatMap((endpoint) => {
      const vantage = endpoint.provider ?? endpoint.host;
      const description =
        endpoint.host === DOCKER_INTERNAL_HOST
          ? `${agent.label} · ${vantage} (may be unreachable outside Docker)`
          : `${agent.label} · ${vantage} (local)`;

      return endpoint.models.map((model) => ({
        description,
        groupId: cliGroupId(agent.backend),
        id: encodeCliEndpointOptionId(agent.backend, endpoint.baseUrl, model),
        label: model,
        subLabel: agent.label,
      }));
    }),
  );
}

/**
 * Derive all three composer model lists from the two (independently nullable)
 * discovery payloads: local models, agent CLIs, and the driver×local-endpoint
 * join. Each list degrades to `[]` independently on a discovery gap; the
 * driver×endpoint join needs both payloads. Concatenation order is
 * `[...local, ...agents, ...driverEndpoint]`.
 * @public
 */
export function composeModelOptions(
  localModels: DiscoveredLocalModels | null,
  agents: DiscoveredAgentClis | null,
): ChatModelOption[] {
  return [
    ...(localModels ? toChatModelOptions(localModels) : []),
    ...(agents ? toAgentChatOptions(agents) : []),
    ...(agents && localModels
      ? toDriverEndpointChatOptions(agents, localModels)
      : []),
  ];
}

/**
 * Map registry personas into the composer's persona selector options, so a
 * selected personaId is a real registry id the server resolves to a system
 * prompt.
 * @public
 */
export function toPersonaOptions(
  personas: readonly DiscoveredPersonaPrompt[],
): ChatPersonaOption[] {
  return personas.map((persona) => ({
    description: persona.description ?? undefined,
    id: persona.id,
    label: persona.title,
  }));
}

/**
 * The four per-app discovery loaders (each already bound to the request and
 * degrading to `[]` on failure) that {@link buildChatOptionsResponse} orchestrates
 * into a {@link ChatOptionsResponse}.
 * @public
 */
export interface ChatDiscoveryLoaders {
  loadAgentClis(): Promise<ChatModelOption[]>;
  loadDiscoveredModels(): Promise<ChatModelOption[]>;
  loadPersonas(): Promise<ChatPersonaOption[]>;
  loadRepositories(): Promise<RepositoryOption[]>;
}

/**
 * Orchestrate the four discovery loaders into the `/resources/chat-options`
 * response (local models followed by agent CLIs, personas and repositories
 * passed through). Shared so the developer and admin resource routes cannot
 * drift in how they shape the response.
 * @public
 */
export async function buildChatOptionsResponse(
  loaders: ChatDiscoveryLoaders,
): Promise<ChatOptionsResponse> {
  const [localModels, agentClis, repositories, personas] = await Promise.all([
    loaders.loadDiscoveredModels(),
    loaders.loadAgentClis(),
    loaders.loadRepositories(),
    loaders.loadPersonas(),
  ]);

  return {
    models: [...localModels, ...agentClis],
    personas,
    repositories,
  };
}
