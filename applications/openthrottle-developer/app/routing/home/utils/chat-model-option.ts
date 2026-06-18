import type { ChatModelOption } from '@openthrottle/react-router-chat';
import type { DiscoverLocalModelsQuery } from '~/__generated__/graphql';

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

/** Flatten discovered endpoints × models into composer toolbar options. */
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
