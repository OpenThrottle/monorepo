#!/usr/bin/env node

/**
 * @description Final invariant for `./scripts/setup.sh`: assert the git-ignored
 * `.bootstrap-secrets.local` contains all six required keys with non-empty
 * values. Two bootstrap scripts write this file — `bootstrap-default-user.ts`
 * writes the 4 URL/user keys and `bootstrap-service-account-credentials.ts`
 * writes the 2 token keys — so this check MUST run AFTER both (setup.sh step 4b)
 * to see the complete set. Reads the file only; needs no DB or `.env`. Exits
 * non-zero, naming the missing keys and their remediation, so a dropped token
 * can never pass setup silently again.
 */

import { fileURLToPath } from 'node:url';

import { LOCAL_SECRETS_FILENAME, readLocalSecrets } from './local-secrets-file';

/** The six keys `.bootstrap-secrets.local` must always contain after setup. */
export const REQUIRED_BOOTSTRAP_KEYS = [
  'OPENTHROTTLE_ADMIN_URL',
  'OPENTHROTTLE_BOOTSTRAP_USER_EMAIL',
  'OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD',
  'OPENTHROTTLE_DEVELOPER_URL',
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
] as const;

/** The token keys, whose remediation is revoke + re-run bootstrap. */
const TOKEN_KEYS: ReadonlySet<string> = new Set([
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
]);

/**
 * The required keys that are absent or empty in `entries`, in the canonical
 * {@link REQUIRED_BOOTSTRAP_KEYS} order. Empty result means the file is
 * complete.
 */
export function findMissingBootstrapKeys(
  entries: Record<string, string>,
): string[] {
  return REQUIRED_BOOTSTRAP_KEYS.filter(
    (key) => (entries[key] ?? '').trim() === '',
  );
}

function remediationFor(key: string): string {
  return TOKEN_KEYS.has(key)
    ? 'revoke the active credential via admin GraphQL, delete its line, then re-run `pnpm database:bootstrap-service-accounts`'
    : 're-run `pnpm database:bootstrap-default-user`';
}

async function main(): Promise<void> {
  const entries = await readLocalSecrets();
  const missing = findMissingBootstrapKeys(entries);

  if (missing.length === 0) {
    console.log(
      `✅ ${LOCAL_SECRETS_FILENAME}: all ${REQUIRED_BOOTSTRAP_KEYS.length} required keys present.`,
    );

    return;
  }

  console.error(
    `🔴 ${LOCAL_SECRETS_FILENAME} is missing ${missing.length} required key(s):`,
  );

  for (const key of missing) {
    console.error(`  - ${key}: ${remediationFor(key)}`);
  }

  process.exit(1);
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
