import type {
  ChatModelGroup,
  ChatModelOption,
} from '@openthrottle/react-router-chat';
import { resolveProviderIcon } from './provider-icons';

/**
 * @description Pure helpers for the chat composer's model dropdown. A toolbar
 * option id must round-trip both the discovered endpoint `baseUrl` and the model
 * name so a submit can route the completion back to the exact endpoint+model the
 * user picked. baseUrl never contains the separator (`::`), so a first-occurrence
 * split is unambiguous. GraphQL-shaped mappers (discovery query → options) stay
 * in the consuming app; this module depends only on the chat types and the
 * presentational provider-glyph resolver.
 */

const SEPARATOR = '::';
/**
 * Separator between a CLI backend and an optional model override in a composer
 * option id (`cursor|gpt-5.2`). Distinct from {@link SEPARATOR} so a CLI option
 * is never mistaken for a `baseUrl::model` openai id; agent-CLI model ids never
 * contain it.
 */
const CLI_SEPARATOR = '|';

/**
 * Legacy group id that collapsed every discovered agent CLI into one rail
 * entry. Superseded by per-CLI groups keyed on the bare driver backend id (see
 * {@link cliGroupId}); retained for back-compat.
 *
 * @deprecated Use {@link cliGroupId} so each CLI gets its own rail entry.
 * @public
 */
export const CLI_MODEL_GROUP_ID = 'agent-clis';
/** Prefix for the per-provider/endpoint group id of local OpenAI models. */
const OPENAI_GROUP_PREFIX = 'openai:';

/**
 * Group id for a local OpenAI endpoint, keyed by its provider (or host). Shared
 * so the app-side discovery mapper and {@link buildModelGroups} agree on the id
 * scheme.
 * @public
 */
export function openaiGroupId(providerOrHost: string): string {
  return `${OPENAI_GROUP_PREFIX}${providerOrHost}`;
}

/**
 * Group id for an agent CLI's rail entry: the bare driver backend id (`claude`,
 * `codex`, `cursor`, `grok`, `opencode`). Each CLI is its own picker group so it
 * gets a dedicated rail icon. Kept as a named helper (mirroring
 * {@link openaiGroupId}) so the app-side discovery mapper, {@link buildModelGroups},
 * and `resolveProviderIcon` all agree on the id scheme.
 * @public
 */
export function cliGroupId(backend: string): string {
  return backend;
}

/** @public */
export interface DecodedModelOption {
  readonly baseUrl: string;
  readonly model: string;
}

/**
 * Encode `{ baseUrl, model }` into a single toolbar option id.
 * @public
 */
export function encodeModelOptionId(baseUrl: string, model: string): string {
  return `${baseUrl}${SEPARATOR}${model}`;
}

/**
 * Decode a toolbar option id back into `{ baseUrl, model }`, or null when malformed.
 * @public
 */
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
 * Encode a CLI backend option id, optionally pinning a model override
 * (`cursor` or `cursor|gpt-5.2`). A submit routes it as `backend` (+ `modelId`).
 * @public
 */
export function encodeCliOptionId(backend: string, model?: string): string {
  return model ? `${backend}${CLI_SEPARATOR}${model}` : backend;
}

/**
 * A decoded composer option: an openai endpoint+model, or a CLI backend with an
 * optional model override.
 * @public
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
      readonly model?: string;
    };

/**
 * Decode a composer option id as a tagged union: an `baseUrl::model` id is the
 * openai backend; a `backend|model` id is a CLI backend with a model override; a
 * bare token is a CLI backend at its default model. Returns null when malformed.
 * @public
 */
export function decodeChatOption(id: string): DecodedChatOption | null {
  const index = id.indexOf(SEPARATOR);
  if (index === -1) {
    if (id === '') {
      return null;
    }

    const cliIndex = id.indexOf(CLI_SEPARATOR);
    if (cliIndex === -1) {
      return { backend: id };
    }

    const backend = id.slice(0, cliIndex);
    const model = id.slice(cliIndex + CLI_SEPARATOR.length);
    if (!backend || !model) {
      return null;
    }

    return { backend, model };
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
 * Derive the picker's provider/CLI rail groups from a flat option list,
 * preserving first-appearance order. Each distinct `groupId` becomes its own
 * group (one per agent CLI, one per local OpenAI endpoint) and is given a
 * brand glyph via `resolveProviderIcon`. A local OpenAI group's label is its
 * provider/host (the id minus the `openai:` prefix); an agent-CLI group's label
 * is the driver label carried on the option's `subLabel` (falling back to the
 * bare group id). The legacy collapsed {@link CLI_MODEL_GROUP_ID} still resolves
 * to a single "Agent CLIs" group for back-compat.
 * @public
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

    const label = groupId.startsWith(OPENAI_GROUP_PREFIX)
      ? groupId.slice(OPENAI_GROUP_PREFIX.length)
      : groupId === CLI_MODEL_GROUP_ID
        ? 'Agent CLIs'
        : model.subLabel != null && model.subLabel !== ''
          ? model.subLabel
          : groupId;

    groups.set(groupId, {
      icon: resolveProviderIcon(groupId),
      id: groupId,
      label,
    });
  }

  return [...groups.values()];
}
