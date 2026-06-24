import type { ChatModelOption } from '@openthrottle/react-router-chat';
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
 * Flatten discovered endpoints × models into composer toolbar options.
 */
export function toChatModelOptions(
  discovery: DiscoverLocalModelsQuery['discoverLocalModels'],
): ChatModelOption[] {
  return discovery.endpoints.flatMap((endpoint) =>
    endpoint.models.map((model) => ({
      description: endpoint.provider ?? endpoint.host,
      id: encodeModelOptionId(endpoint.baseUrl, model),
      label: model,
    })),
  );
}

/**
 * Map discovered agent CLIs into composer toolbar options. The option id is the
 * bare backend discriminator (e.g. `cursor`) — no `::`, so it is distinguishable
 * from an openai endpoint::model id at submit time.
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
      id: agent.backend,
      label: agent.label,
    };
  });
}
