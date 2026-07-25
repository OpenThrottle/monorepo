import type {
  ChatModelGroup,
  ChatModelOption,
} from '@openthrottle/react-router-chat';
import type {
  DiscoverAgentClisQuery,
  DiscoverLocalModelsQuery,
} from '~/__generated__/graphql';

/**
 * @description Helpers for the home chat composer's model dropdown. A toolbar
 * option id must round-trip both the discovered endpoint `baseUrl` and the model
 * name so a submit can route the completion back to the exact endpoint+model the
 * user picked. baseUrl never contains the separator (`::`), so a first-occurrence
 * split is unambiguous.
 */

const SEPARATOR = '::';

/** Group id (and picker rail heading) for all discovered agent CLI backends. */
export const CLI_MODEL_GROUP_ID = 'agent-clis';
/** Prefix for the per-provider/endpoint group id of local OpenAI models. */
const OPENAI_GROUP_PREFIX = 'openai:';

/** Group id for a local OpenAI endpoint, keyed by its provider (or host). */
function openaiGroupId(providerOrHost: string): string {
  return `${OPENAI_GROUP_PREFIX}${providerOrHost}`;
}

export interface DecodedModelOption {
  readonly baseUrl: string;
  readonly model: string;
}

/** Encode `{ baseUrl, model }` into a single toolbar option id. */
export function encodeModelOptionId(baseUrl: string, model: string): string {
  return `${baseUrl}${SEPARATOR}${model}`;
}

/** Decode a toolbar option id back into `{ baseUrl, model }`, or null when malformed. */
export function decodeModelOptionId(id: string): DecodedModelOption | null {
  const index = id.indexOf(SEPARATOR);
  if (index === -1) {
    return null;
  }

  const baseUrl = id.slice(0, index);
  const model = id.slice(index + SEPARATOR.length);
  if (!baseUrl || !model) {
    return null;
  }

  return { baseUrl, model };
}

/**
 * A decoded composer option: the openai endpoint+model, or a bare CLI backend.
 */
export type DecodedChatOption =
  | {
      readonly backend: 'openai';
      readonly baseUrl: string;
      readonly model: string;
    }
  | {
      readonly backend: string;
      readonly baseUrl?: undefined;
      readonly model?: undefined;
    };

/**
 * Decode a composer option id as a tagged union on the first segment: an
 * `baseUrl::model` id is the openai backend; a bare token (no `::`) is a CLI
 * backend discriminator (e.g. `cursor`). Returns null when malformed.
 */
export function decodeChatOption(id: string): DecodedChatOption | null {
  const index = id.indexOf(SEPARATOR);
  if (index === -1) {
    return id === '' ? null : { backend: id };
  }

  const baseUrl = id.slice(0, index);
  const model = id.slice(index + SEPARATOR.length);
  if (!baseUrl || !model) {
    return null;
  }

  return {
    backend: 'openai',
    baseUrl,
    model,
  };
}

/**
 * Flatten discovered endpoints × models into composer toolbar options, grouped
 * (for {@link ChatModelPicker}) by provider/endpoint.
 */
export function toChatModelOptions(
  discovery: DiscoverLocalModelsQuery['discoverLocalModels'],
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
 * Map discovered agent CLIs into composer toolbar options. The option id is the
 * bare backend discriminator (e.g. `cursor`) — no `::`, so it is distinguishable
 * from an openai endpoint::model id at submit time. All CLIs share one picker
 * group ({@link CLI_MODEL_GROUP_ID}).
 */
export function toAgentChatOptions(
  discovery: DiscoverAgentClisQuery['discoverAgentClis'],
): ChatModelOption[] {
  return discovery.agents.map((agent) => {
    const hasVersion = agent.version !== null;
    const description = !hasVersion
      ? 'Agent CLI'
      : `Agent CLI · ${agent.version}`;

    return {
      description,
      groupId: CLI_MODEL_GROUP_ID,
      id: agent.backend,
      label: agent.label,
      subLabel: description,
    };
  });
}

/**
 * Derive the picker's provider/CLI groups from a flat option list, preserving
 * first-appearance order. Agent CLIs collapse into a single "Agent CLIs" group;
 * each local OpenAI provider/endpoint becomes its own group.
 */
export function buildModelGroups(
  models: readonly ChatModelOption[],
): ChatModelGroup[] {
  const groups = new Map<string, ChatModelGroup>();

  for (const model of models) {
    const groupId = model.groupId;
    if (groupId == null || groups.has(groupId)) {
      continue;
    }

    const label =
      groupId === CLI_MODEL_GROUP_ID
        ? 'Agent CLIs'
        : groupId.slice(OPENAI_GROUP_PREFIX.length);

    groups.set(groupId, { id: groupId, label });
  }

  return [...groups.values()];
}
