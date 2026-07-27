/**
 * Translates the canonical `.mcp.json`-schema managed MCP map (as built by
 * `buildManagedMcpServers`) into opencode's own config schema, and manages the
 * out-of-tree temp config file opencode reads via `OPENCODE_CONFIG`.
 *
 * opencode has no `--mcp-config` flag; it only reads config from `opencode.json`
 * or the file named by `OPENCODE_CONFIG`. So — unlike claude's inline flag — we
 * write a temp config OUTSIDE the user's checkout and point opencode at it, then
 * delete it when the turn ends. Nothing is ever written into the checkout.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** opencode's per-server MCP config shape (local/stdio server). */
interface OpencodeMcpServer {
  readonly command: readonly string[];
  readonly enabled: true;
  readonly environment?: Readonly<Record<string, string>>;
  readonly type: 'local';
}

/** opencode config file shape (only the `mcp` slice we manage). */
interface OpencodeConfig {
  readonly $schema: string;
  readonly mcp: Readonly<Record<string, OpencodeMcpServer>>;
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
 * Translate a canonical managed map (`{ name: { command, args, env } }`) into
 * opencode's `{ mcp: { name: { type:'local', command:[cmd,...args], environment,
 * enabled:true } } }`. Servers whose `command` is not a string are skipped.
 */
export function translateManagedMcpToOpencode(
  managed: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
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

  return { $schema: 'https://opencode.ai/config.json', mcp };
}

/**
 * Write the translated managed servers to a fresh temp `opencode.json` outside
 * any checkout and return its path + a cleanup. Returns null when there is
 * nothing to inject (no servers translated).
 */
export function writeOpencodeMcpConfig(
  managed: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
): OpencodeMcpConfigFile | null {
  const config = translateManagedMcpToOpencode(managed);
  if (Object.keys(config.mcp).length === 0) {
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
