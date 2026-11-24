#!/usr/bin/env node

/**
 * @description `pnpm run user-env:write` — point `~/.openthrottle/.env` at an
 * OpenThrottle server by hand. Use it for a hosted or remote server, which
 * cannot write the file on a laptop, or to repair a local one without a
 * restart. It uses the same writer and managed-line rules as server boot, so
 * a key you set yourself is never touched.
 *
 *   pnpm run user-env:write -- --url https://ot.example.com/graphql
 *
 * The token comes from `--token`, else from `OPENTHROTTLE_MCP_AUTH_TOKEN` in
 * the environment (which keeps it out of shell history). With no `--url`, the
 * environment's `OPENTHROTTLE_*` URL is used, else the local primary server,
 * and a linked worktree refuses to write.
 */
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ensureUserEnvEntries } from '@openthrottle/agentic-hooks';

import { isLinkedWorktree } from './utils/git.ts';
import { createLogger } from './utils/logger.ts';
import {
  isWorktreeContext,
  resolveScriptConfigDir,
  resolveScriptGraphqlUrl,
  syncUserEnvFile,
} from './utils/user-env-file.ts';

const logger = createLogger();

const USAGE = `Usage: pnpm run user-env:write -- [--url <graphql-url>] [--token <ot_sa_token>]`;

/** Exit code for a run: 0 written or already current, 1 otherwise. */
export const runUserEnvWrite = (
  argv: readonly string[],
  env: Record<string, string | undefined>,
): number => {
  const parsed = parseArgs({
    allowPositionals: false,
    // pnpm forwards the `--` separator itself.
    args: argv.filter((arg) => arg !== '--'),
    options: {
      token: { type: 'string' },
      url: { type: 'string' },
    },
    strict: true,
  });

  const urlArg = parsed.values.url?.trim() ?? '';
  const hasUrlArg = urlArg !== '';
  const graphqlUrl = hasUrlArg ? urlArg : resolveScriptGraphqlUrl(env);

  const outcome = syncUserEnvFile({
    authToken: parsed.values.token ?? env.OPENTHROTTLE_MCP_AUTH_TOKEN,
    configDir: resolveScriptConfigDir(env),
    ensure: ensureUserEnvEntries,
    graphqlUrl,
    // An explicit --url is a deliberate choice; only the local default would
    // point other checkouts at this worktree's short-lived server.
    isWorktree: !hasUrlArg && isWorktreeContext(env, isLinkedWorktree),
    logger,
  });

  if (outcome.kind === 'skipped') {
    logger.detail(USAGE);
    return 1;
  }
  return outcome.result.ok ? 0 : 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exit(runUserEnvWrite(process.argv.slice(2), process.env));
  } catch (err) {
    logger.fail(err instanceof Error ? err.message : String(err));
    logger.detail(USAGE);
    process.exit(1);
  }
}
