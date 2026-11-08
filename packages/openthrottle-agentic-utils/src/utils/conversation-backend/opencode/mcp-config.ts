/**
 * Translates the canonical `.mcp.json`-schema managed MCP map (as built by
 * `buildManagedMcpServers`) into opencode's own config schema, and manages the
 * out-of-tree temp config file opencode reads via `OPENCODE_CONFIG`.
 *
 * opencode has no `--mcp-config` flag; it only reads config from `opencode.json`
 * or the file named by `OPENCODE_CONFIG`. So — unlike claude's inline flag — we
 * write a temp config OUTSIDE the user's checkout and point opencode at it, then
 * delete it when the turn ends. Nothing is ever written into the checkout.
 *
 * opencode also has no scoped per-tool permission *flag* (only the blanket
 * `run --auto`), so the composer permission mode is expressed here in the same
 * temp config's `permission` slice: explicit `edit`/`bash` actions (opencode's
 * own defaults let a headless turn write), plus a scoped `allow` for the
 * injected managed MCP servers (`<server>*`) so their tools are callable in a
 * headless run, mirroring claude's `--allowedTools`. `fullAccess` is handled by
 * the `--auto` flag instead (see argv.ts), so it writes no permission slice.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/** opencode's per-server MCP config shape (local/stdio server). */
interface OpencodeMcpServer {
  readonly command: readonly string[];
  readonly enabled: true;
  readonly environment?: Readonly<Record<string, string>>;
  readonly type: 'local';
}

/** opencode permission action for a tool/category (`ask` is opencode's default). */
type OpencodePermissionAction = 'allow' | 'ask' | 'deny';

/**
 * Provider id opencode uses for a discovered local endpoint. The model string a
 * caller passes to `-m` is `<LOCAL_ENDPOINT_PROVIDER_ID>/<modelId>`.
 */
export const LOCAL_ENDPOINT_PROVIDER_ID = 'local';

/**
 * A discovered local OpenAI-compatible endpoint to target. `apiKey` is a
 * placeholder for keyless local servers (the openai-compatible SDK still wants a
 * value). `model` is registered under the custom provider so `-m local/<model>`
 * resolves.
 */
export interface OpencodeEndpointConfig {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly model: string;
}

/** opencode custom-provider slice (a single `@ai-sdk/openai-compatible` provider). */
interface OpencodeProvider {
  readonly models: Readonly<Record<string, Record<string, never>>>;
  readonly name: string;
  readonly npm: '@ai-sdk/openai-compatible';
  readonly options: { readonly apiKey: string; readonly baseURL: string };
}

/** opencode config file shape (only the `mcp` + `permission` + `provider` slices we manage). */
interface OpencodeConfig {
  readonly $schema: string;
  readonly mcp?: Readonly<Record<string, OpencodeMcpServer>>;
  readonly permission?: Readonly<Record<string, OpencodePermissionAction>>;
  readonly provider?: Readonly<Record<string, OpencodeProvider>>;
}

/**
 * Build the custom-provider slice that points opencode at a discovered local
 * endpoint. Undefined when no endpoint is targeted. The provider is keyed by
 * {@link LOCAL_ENDPOINT_PROVIDER_ID} and registers the one discovered model so
 * `-m local/<model>` resolves.
 */
function buildOpencodeProvider(
  endpoint: OpencodeEndpointConfig | undefined,
): Record<string, OpencodeProvider> | undefined {
  if (endpoint === undefined) {
    return undefined;
  }
  return {
    [LOCAL_ENDPOINT_PROVIDER_ID]: {
      models: { [endpoint.model]: {} },
      name: 'Local endpoint (OpenThrottle)',
      npm: '@ai-sdk/openai-compatible',
      options: {
        apiKey: endpoint.apiKey?.trim() || 'local',
        baseURL: endpoint.baseUrl,
      },
    },
  };
}

/** A written temp config and the cleanup that removes it. */
export interface OpencodeMcpConfigFile {
  /** Remove the temp dir + file. Idempotent; never throws. */
  readonly cleanup: () => void;
  /** Absolute path to pass as `OPENCODE_CONFIG`. */
  readonly path: string;
}

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

const toStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') {
      out[key] = raw;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/**
 * Build opencode's `permission` slice for a permission mode. opencode 1.19.5
 * defaults `edit` and `bash` to `allow`, so a turn with no slice wrote files
 * with no approval. Every non-`fullAccess` posture therefore sets them
 * explicitly: `ask`, which a headless `opencode run` auto-rejects ("The user
 * rejected permission to use this specific tool call") — the same shape as
 * claude's denied write. `autoAcceptEdits` lifts `edit` to `allow` and keeps
 * `bash` on `ask`. Every non-`fullAccess` posture also scopes an `allow` to the
 * injected managed MCP servers (`<server>*`) so their tools stay callable
 * headless without a blanket bypass. `fullAccess` returns undefined — it is
 * handled by the `--auto` flag, not a permission slice.
 */
function buildOpencodePermission(
  managedNames: readonly string[],
  permissionMode: ConversationPermissionMode | undefined,
): Record<string, OpencodePermissionAction> | undefined {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return undefined;
  }
  const isAcceptEdits =
    permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits;
  const permission: Record<string, OpencodePermissionAction> = {
    bash: 'ask',
    edit: isAcceptEdits ? 'allow' : 'ask',
  };
  for (const name of managedNames) {
    permission[`${name}*`] = 'allow';
  }
  return permission;
}

/**
 * Translate a canonical managed map (`{ name: { command, args, env } }`) into
 * opencode's `{ mcp: { name: { type:'local', command:[cmd,...args], environment,
 * enabled:true } } }`, plus a `permission` slice derived from `permissionMode`
 * (see {@link buildOpencodePermission}). Servers whose `command` is not a string
 * are skipped.
 */
export function translateManagedMcpToOpencode(
  managed: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  permissionMode?: ConversationPermissionMode,
  endpoint?: OpencodeEndpointConfig,
): OpencodeConfig {
  const mcp: Record<string, OpencodeMcpServer> = {};
  for (const [name, definition] of Object.entries(managed)) {
    const command = definition['command'];
    if (typeof command !== 'string') {
      continue;
    }
    const args = definition['args'];
    const environment = toStringRecord(definition['env']);
    mcp[name] = {
      command: [command, ...(isStringArray(args) ? args : [])],
      enabled: true,
      ...(environment !== undefined ? { environment } : {}),
      type: 'local',
    };
  }

  const permission = buildOpencodePermission(Object.keys(mcp), permissionMode);
  const provider = buildOpencodeProvider(endpoint);

  return {
    $schema: 'https://opencode.ai/config.json',
    ...(Object.keys(mcp).length > 0 ? { mcp } : {}),
    ...(permission !== undefined ? { permission } : {}),
    ...(provider !== undefined ? { provider } : {}),
  };
}

/**
 * Write the translated managed servers + permission slice to a fresh temp
 * `opencode.json` outside any checkout and return its path + a cleanup. Returns
 * null when there is nothing to write (no servers translated, no provider, and
 * no permission slice — only `fullAccess`, whose posture is `--auto`).
 */
export function writeOpencodeMcpConfig(
  managed: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  permissionMode?: ConversationPermissionMode,
  endpoint?: OpencodeEndpointConfig,
): OpencodeMcpConfigFile | null {
  const config = translateManagedMcpToOpencode(
    managed,
    permissionMode,
    endpoint,
  );
  const hasMcp = config.mcp !== undefined && Object.keys(config.mcp).length > 0;
  const hasPermission = config.permission !== undefined;
  const hasProvider = config.provider !== undefined;
  if (!hasMcp && !hasPermission && !hasProvider) {
    return null;
  }

  const dir = mkdtempSync(join(tmpdir(), 'ot-mcp-opencode-'));
  const path = join(dir, 'opencode.json');
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return {
    cleanup: (): void => {
      try {
        rmSync(dir, { force: true, recursive: true });
      } catch {
        // Best-effort: a temp file left in os.tmpdir() is harmless.
      }
    },
    path,
  };
}
