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
 * temp config's `permission` slice: a scoped `allow` for the injected managed
 * MCP servers (`<server>*`) so their tools are callable in a headless run,
 * mirroring claude's `--allowedTools`. `fullAccess` is handled by the `--auto`
 * flag instead (see argv.ts), so it writes no permission slice.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

/** opencode config file shape (only the `mcp` + `permission` slices we manage). */
interface OpencodeConfig {
  readonly $schema: string;
  readonly mcp?: Readonly<Record<string, OpencodeMcpServer>>;
  readonly permission?: Readonly<Record<string, OpencodePermissionAction>>;
}

/** A written temp config and the cleanup that removes it. */
export interface OpencodeMcpConfigFile {
  /** Remove the temp dir + file. Idempotent; never throws. */
  readonly cleanup: () => void;
  /** Absolute path to pass as `OPENCODE_CONFIG`. */
  readonly path: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

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
 * Build opencode's `permission` slice for a permission mode. Every non-
 * `fullAccess` posture scopes an `allow` to the injected managed MCP servers
 * (`<server>*`) so their tools are callable in a headless run without a blanket
 * bypass; `autoAcceptEdits` additionally allows `edit`. `fullAccess` returns
 * undefined — it is handled by the `--auto` flag, not a permission slice. Left/
 * unmapped tools keep opencode's default posture. Returns undefined when the
 * slice would be empty (e.g. `supervised`/default with no managed servers), so
 * no permission key is written.
 */
function buildOpencodePermission(
  managedNames: readonly string[],
  permissionMode: ConversationPermissionMode | undefined,
): Record<string, OpencodePermissionAction> | undefined {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return undefined;
  }
  const permission: Record<string, OpencodePermissionAction> = {};
  if (permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits) {
    permission['edit'] = 'allow';
  }
  for (const name of managedNames) {
    permission[`${name}*`] = 'allow';
  }
  return Object.keys(permission).length > 0 ? permission : undefined;
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

  return {
    $schema: 'https://opencode.ai/config.json',
    ...(Object.keys(mcp).length > 0 ? { mcp } : {}),
    ...(permission !== undefined ? { permission } : {}),
  };
}

/**
 * Write the translated managed servers + permission slice to a fresh temp
 * `opencode.json` outside any checkout and return its path + a cleanup. Returns
 * null when there is nothing to write (no servers translated AND no permission
 * slice to set — e.g. `supervised`/default with no managed servers).
 */
export function writeOpencodeMcpConfig(
  managed: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  permissionMode?: ConversationPermissionMode,
): OpencodeMcpConfigFile | null {
  const config = translateManagedMcpToOpencode(managed, permissionMode);
  const hasMcp = config.mcp !== undefined && Object.keys(config.mcp).length > 0;
  const hasPermission = config.permission !== undefined;
  if (!hasMcp && !hasPermission) {
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
