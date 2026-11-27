/**
 * Normalize ACP frames so a recording is stable and safe to commit: stable
 * JSON-RPC ids, no `_meta`, no MCP-server secrets, and the sanitizer's path,
 * UUID and redact-key treatment. The recorder uses it now; ACP replay and the
 * drift check read the same normal form, so they use it too.
 *
 * Node built-ins and sibling bin-side modules only: the recording shim imports
 * this under Node's type stripping.
 */

import { userInfo } from 'node:os';

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  AcpFrame,
  AcpMessage,
  TranscriptRpcDirectionsValue,
} from '../types/transcript.ts';
import { TRANSCRIPT_RPC_DIRECTIONS } from '../types/transcript.ts';
import type { Sanitizer } from './sanitizer.ts';
import { REDACTED } from './sanitizer.ts';

/** The ACP methods whose params carry the MCP servers handed to the agent. */
const SESSION_OPEN_METHODS: ReadonlySet<string> = new Set([
  'session/load',
  'session/new',
]);

/** Keys of an MCP server entry whose values are secrets, names kept. */
const MCP_SECRET_LIST_KEYS: readonly string[] = ['env', 'headers'];

/**
 * The redact keys an ACP recording and its replay share: the backend profile's
 * list minus `mcpServers`, which the normalizer redacts itself (names kept).
 *
 * @public
 */
export function acpRedactKeys(redactKeys: readonly string[]): string[] {
  return redactKeys.filter((key) => key !== 'mcpServers');
}

/** @public */
export interface AcpNormalizerOptions {
  /**
   * The transcript's sanitizer: paths, UUIDs and the backend's redact keys.
   * Share it with the transcript's stderr so a UUID maps to one placeholder.
   */
  readonly sanitizer: Pick<Sanitizer, 'sanitizeValue'>;
}

/** @public */
export interface AcpNormalizer {
  /** Normalize the next frame. Call in wire order: ids and UUIDs are stateful. */
  readonly normalizeFrame: (frame: AcpFrame) => AcpFrame;
}

/**
 * Deep-map every string of a decoded JSON value.
 *
 * @public
 */
export function mapStrings(
  value: unknown,
  map: (text: string) => string,
): unknown {
  if (typeof value === 'string') {
    return map(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => mapStrings(entry, map));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        return [key, mapStrings(entry, map)];
      }),
    );
  }
  return value;
}

/** The token a recording host's OS user name becomes. */
const HOST_USER_TOKEN = '<USER>';

/**
 * Replace the whole-word OS user name in `text` (a tool's `ls -la` output
 * carries it as the file owner). A name shorter than three characters is left
 * alone: it would match ordinary words.
 *
 * @public
 */
export function redactHostUser(
  text: string,
  username: string = userInfo().username,
): string {
  if (username.length < 3) {
    return text;
  }
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`\\b${escaped}\\b`, 'g'), HOST_USER_TOKEN);
}

/**
 * A copy of `value` with every `_meta` key removed at any depth.
 *
 * @public
 */
export function stripMeta(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripMeta);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '_meta')
        .map(([key, entry]) => [key, stripMeta(entry)]),
    );
  }
  return value;
}

/** Replace every value of a `[{ name, value }]` list or `{ name: value }` map. */
function redactValues(list: unknown): unknown {
  if (Array.isArray(list)) {
    return list.map((entry) => {
      return isRecord(entry) && 'value' in entry
        ? { ...entry, value: REDACTED }
        : entry;
    });
  }
  if (isRecord(list)) {
    return Object.fromEntries(
      Object.keys(list).map((name) => [name, REDACTED]),
    );
  }
  return list;
}

/**
 * `session/new` and `session/load` params with each MCP server's `env` (and
 * `headers`) values redacted, names kept. Server names, commands and args
 * stay; the sanitizer tokenizes any path in them afterwards.
 *
 * @public
 */
export function redactMcpServers(params: unknown): unknown {
  if (!isRecord(params) || !Array.isArray(params.mcpServers)) {
    return params;
  }
  const mcpServers = params.mcpServers.map((server) => {
    if (!isRecord(server)) {
      return server;
    }
    return Object.fromEntries(
      Object.entries(server).map(([key, entry]) => {
        return [
          key,
          MCP_SECRET_LIST_KEYS.includes(key) ? redactValues(entry) : entry,
        ];
      }),
    );
  });
  return { ...params, mcpServers };
}

/**
 * A `session/update` that lists the host's slash commands and skills
 * (`available_commands_update`) describes the recording machine, not the
 * protocol: its list is emptied, keeping the frame's shape.
 *
 * @public
 */
export function redactHostCommands(message: AcpMessage): AcpMessage {
  const { method, params } = message;
  const update = isRecord(params) ? params.update : undefined;
  const isCommandList =
    method === 'session/update' &&
    isRecord(update) &&
    update.sessionUpdate === 'available_commands_update';
  if (!isCommandList || !isRecord(params)) {
    return message;
  }
  return withKey(message, 'params', {
    ...params,
    update: { ...update, availableCommands: [] },
  });
}

function otherSide(
  side: TranscriptRpcDirectionsValue,
): TranscriptRpcDirectionsValue {
  const isClient = side === TRANSCRIPT_RPC_DIRECTIONS.client;
  return isClient
    ? TRANSCRIPT_RPC_DIRECTIONS.agent
    : TRANSCRIPT_RPC_DIRECTIONS.client;
}

function withKey(message: AcpMessage, key: string, value: unknown): AcpMessage {
  return Object.fromEntries(
    Object.entries(message).map(([name, entry]) => {
      return [name, name === key ? value : entry];
    }),
  );
}

/**
 * Create a normalizer for ONE transcript (one agent process lifetime).
 *
 * Ids are renumbered per direction in first-appearance order: client-sent
 * request ids become 0, 1, 2…, agent-sent request ids a separate 0, 1, 2…, and
 * a response takes the number of the request it answers (from the sequence of
 * the side that sent that request).
 *
 * @public
 */
export function createAcpNormalizer(
  options: AcpNormalizerOptions,
): AcpNormalizer {
  const sequences = {
    [TRANSCRIPT_RPC_DIRECTIONS.agent]: new Map<string, number>(),
    [TRANSCRIPT_RPC_DIRECTIONS.client]: new Map<string, number>(),
  };

  const renumber = (
    requester: keyof typeof sequences,
    id: unknown,
  ): number | unknown => {
    if (typeof id !== 'number' && typeof id !== 'string') {
      return id;
    }
    const sequence = sequences[requester];
    const key = JSON.stringify(id);
    const existing = sequence.get(key);
    if (existing !== undefined) {
      return existing;
    }
    sequence.set(key, sequence.size);
    return sequence.size - 1;
  };

  const normalizeFrame = (frame: AcpFrame): AcpFrame => {
    let message: AcpMessage = frame.message;
    const stripped = stripMeta(message);
    message = redactHostCommands(isRecord(stripped) ? stripped : message);

    const { method } = message;
    if (typeof method === 'string' && SESSION_OPEN_METHODS.has(method)) {
      message = withKey(message, 'params', redactMcpServers(message.params));
    }

    if ('id' in message) {
      const isRequest = typeof method === 'string';
      const requester = isRequest ? frame.from : otherSide(frame.from);
      message = withKey(message, 'id', renumber(requester, message.id));
    }

    const sanitized = mapStrings(
      options.sanitizer.sanitizeValue(message),
      redactHostUser,
    );
    return {
      from: frame.from,
      message: isRecord(sanitized) ? sanitized : message,
    };
  };

  return { normalizeFrame };
}
