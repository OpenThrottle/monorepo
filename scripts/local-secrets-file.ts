/**
 * @description Shared writer for the git-ignored local bootstrap-secrets file.
 * The service-account and default-user bootstrap scripts both call
 * {@link upsertLocalSecrets} so a developer who misses the once-only stdout
 * echo during `./scripts/setup.sh` can recover the values from disk without
 * revoking/re-minting credentials. Local convenience only — never committed
 * (see `.gitignore`), never a secrets manager.
 *
 * Recovery for a missing token line is documented in
 * `packages/openthrottle-mcp/docs/AUTH.md` (§ "Recovering a missing token in
 * `.bootstrap-secrets.local`"); the six-key invariant lives in
 * `scripts/check-bootstrap-secrets.ts`.
 */

import { chmod, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Basename of the root-level, git-ignored bootstrap-secrets file. */
export const LOCAL_SECRETS_FILENAME = '.bootstrap-secrets.local';

/** Owner read/write only. */
const FILE_MODE = 0o600;

/**
 * Repo root resolved from this module's location (`scripts/` → `..`) rather
 * than `process.cwd()`, so the path is correct regardless of the caller's cwd.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const HEADER_LINES = [
  '# OpenThrottle local bootstrap secrets — GIT-IGNORED, local-only.',
  `# Written by scripts/bootstrap-*.ts during ./scripts/setup.sh. These values`,
  '# are printed once at mint time; this file is your durable copy of them.',
  '#',
  '# To rotate a service-account token: revoke it via admin GraphQL, delete its',
  '# line below, then re-run `pnpm database:bootstrap-service-accounts`.',
  '#',
  '# Never commit this file.',
] as const;

function localSecretsPath(): string {
  return join(REPO_ROOT, LOCAL_SECRETS_FILENAME);
}

/** Parse existing `KEY=VALUE` lines; blanks and `#` comments are ignored. */
function parseEntries(contents: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (key !== '') {
      entries[key] = line.slice(separator + 1);
    }
  }

  return entries;
}

async function readExistingEntries(
  path: string,
): Promise<Record<string, string>> {
  try {
    return parseEntries(await readFile(path, 'utf8'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

/**
 * Read the current `KEY=VALUE` entries from the git-ignored local secrets file,
 * or an empty record when the file does not exist yet. Lets callers decide
 * whether a durable value is already recorded (e.g. the bootstrap scripts'
 * self-heal check) without re-implementing the parse.
 */
export async function readLocalSecrets(): Promise<Record<string, string>> {
  return readExistingEntries(localSecretsPath());
}

function render(entries: Record<string, string>): string {
  const keyLines = Object.keys(entries)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${entries[key]}`);

  return `${[...HEADER_LINES, '', ...keyLines].join('\n')}\n`;
}

/**
 * Upsert the given `KEY=VALUE` pairs into the git-ignored local secrets file,
 * preserving any keys not present in `entries` (idempotent re-runs never
 * clobber still-valid values). Rewrites the file with a fresh header and
 * alphabetized keys, mode 0600.
 */
export async function upsertLocalSecrets(
  entries: Record<string, string>,
): Promise<string> {
  const path = localSecretsPath();
  const existing = await readExistingEntries(path);
  const merged: Record<string, string> = { ...existing, ...entries };

  await writeFile(path, render(merged), { encoding: 'utf8', mode: FILE_MODE });
  await chmod(path, FILE_MODE);

  return path;
}
