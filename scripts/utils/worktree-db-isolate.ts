/**
 * @description `pnpm worktree:db isolate` and `pnpm worktree:new <name> --own-db`:
 * move a worktree off the primary's shared Postgres/Redis onto its OWN database.
 * Both entry points run this one code path.
 *
 * Two phases, because provisioning runs them at different times:
 *  1. {@link configureIsolatedDb} — pure file work: allocate base+8/base+9 of the
 *     worktree's existing port block, rewrite the root and per-app `.env` files,
 *     set `OT_WORKTREE_DB=isolated`, and regenerate the compose override without
 *     the disabled postgres/redis. Node builtins only (it runs before
 *     `pnpm install`).
 *  2. {@link seedIsolatedDatabase} — start the worktree's own containers under its
 *     own compose project, apply every migration, and bootstrap the default
 *     login user (with admin). Needs the workspace installed.
 *
 * Switching is explicit, never automatic: it moves the worktree off the user's
 * data, starts containers and rewrites `.env`. Idempotent: an already-isolated
 * worktree is a no-op. The shared DB is never cloned (slow, and it may carry the
 * personal-archive volume), only migrated and seeded fresh.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { firstEnvMatch, parseEnvContents, readEnvFile, setEnvValue, updateEnvValue, upsertEnvLine } from './env.ts'; // prettier-ignore
import { WORKTREE_COMPOSE_FILE, worktreeComposeOverride } from './worktree-compose.ts'; // prettier-ignore
import { resolveWorktreeDbMode, WORKTREE_DB_ENV_FILES, WORKTREE_DB_ENV_KEY } from './worktree-db.ts'; // prettier-ignore
import type { WorktreeDbPorts } from './worktree-ports.ts';
import { resolveWorktreeDbPorts, resolveWorktreePorts } from './worktree-ports.ts'; // prettier-ignore

/** Set (by `worktree:new --own-db`) to ask the provisioner for an isolated database. */
export const OWN_DB_ENV_KEY = 'OPENTHROTTLE_WORKTREE_OWN_DB';

/** True when the provisioner was asked for an isolated database. */
export const wantsOwnDb = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => {
  const value = env[OWN_DB_ENV_KEY]?.trim().toLowerCase();

  return value === '1' || value === 'true';
};

/** URL-valued keys that embed a database host port and so must follow it. */
const DB_URL_KEYS = ['OPENTHROTTLE_POSTGRES_URL', 'POSTGRES_URL', 'REDIS_URL'] as const; // prettier-ignore

/** Rewrite the port of a `scheme://[user:pw@]host[:port]/...` URL. */
export const withUrlPort = (url: string, port: number): string =>
  url.replace(/^(\w+:\/\/(?:[^/?#]*@)?[^/?#:@]*)(?::\d+)?(?=[/?#]|$)/, `$1:${port}`); // prettier-ignore

/** What to write into one `.env` file. */
export interface IsolateEnvInput {
  /** The compose project / container prefix to add when the file has none (root `.env` only). */
  readonly compose:
    { readonly prefix: string; readonly project: string } | undefined;
  /** True for the files that carry the marker and the port keys (root + server). */
  readonly owner: boolean;
  readonly ports: WorktreeDbPorts;
}

/**
 * Pure: the `.env` contents of an isolated worktree. Existing quoting and
 * trailing comments survive. Port keys are rewritten wherever they exist (and
 * added to the owning files), derived URLs follow the port, and the marker flips
 * to `isolated`. Idempotent.
 */
export const isolateEnvContents = (
  contents: string,
  input: IsolateEnvInput,
): string => {
  const present = parseEnvContents(contents);
  let result = contents;

  for (const [key, port] of [
    ['POSTGRES_PORT', input.ports.postgres],
    ['REDIS_PORT', input.ports.redis],
  ] as const) {
    if (input.owner || present[key] !== undefined) {
      result = setEnvValue(result, key, String(port));
    }
  }

  for (const key of DB_URL_KEYS) {
    const port = key === 'REDIS_URL' ? input.ports.redis : input.ports.postgres;

    result = updateEnvValue(result, key, (url) => (url === '' ? url : withUrlPort(url, port))); // prettier-ignore
  }

  if (input.owner) {
    result = upsertEnvLine(result, WORKTREE_DB_ENV_KEY, 'isolated');
  }

  if (input.compose !== undefined) {
    for (const [key, value] of [
      ['COMPOSE_PROJECT_NAME', input.compose.project],
      ['OT_CONTAINER_PREFIX', input.compose.prefix],
    ] as const) {
      if (firstEnvMatch(result, key) === undefined) {
        result = upsertEnvLine(result, key, value);
      }
    }
  }

  return result;
};

/** The compose project `teardown_worktree.ts` expects for this directory. */
export const composeProjectFor = (root: string): string =>
  `openthrottle-${basename(root).toLowerCase()}`;

/** Outcome of the configure phase. */
export type IsolateConfigResult =
  | { readonly kind: 'already-isolated'; readonly ports: WorktreeDbPorts }
  | {
      readonly base: number;
      readonly files: readonly string[];
      readonly kind: 'configured';
      readonly ports: WorktreeDbPorts;
    }
  | { readonly kind: 'refused'; readonly message: string };

export interface IsolateOptions {
  /** The worktree's port block when the caller already knows it (provisioning); else read from its pin. */
  readonly base?: number;
  /** Injectable port probe, for tests; defaults to lsof. */
  readonly isPortInUse?: (port: number) => boolean;
}

const parsePort = (value: string | undefined): number | undefined => {
  const port = Number(value);

  return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
};

/** Every `.env` this worktree owns: the root one plus each application's. */
const worktreeEnvFiles = (root: string): string[] =>
  [
    join(root, '.env'),
    ...globSync('applications/*/.env', { cwd: root }).map((relative) => join(root, relative)), // prettier-ignore
  ].filter((path) => existsSync(path));

/**
 * Phase 1: switch the worktree at `root` to its own database configuration.
 * Refuses (changing nothing) on the primary checkout / an unmarked worktree.
 */
export const configureIsolatedDb = (
  root: string,
  options: IsolateOptions = {},
): IsolateConfigResult => {
  const rootEnv = readEnvFile(join(root, '.env'));
  const mode = resolveWorktreeDbMode(rootEnv[WORKTREE_DB_ENV_KEY]);

  if (mode === 'primary') {
    return {
      kind: 'refused',
      message: `no ${WORKTREE_DB_ENV_KEY} marker in ${join(root, '.env')}: the primary checkout already owns its database, and a worktree gets its marker from \`pnpm worktree:heal\` (run it, then retry)`,
    };
  }

  if (mode === 'isolated') {
    return {
      kind: 'already-isolated',
      ports: {
        postgres: parsePort(rootEnv.POSTGRES_PORT) ?? 0,
        redis: parsePort(rootEnv.REDIS_PORT) ?? 0,
      },
    };
  }

  // The worktree's existing block (pinned in .worktree-ports, else derived from
  // its name): app ports stay put, the DB takes the spare base+8 / base+9.
  const base =
    options.base ??
    resolveWorktreePorts(basename(root), {
      isPortInUse: options.isPortInUse,
      worktreeDir: root,
    }).base;
  const ports = resolveWorktreeDbPorts(base, { isPortInUse: options.isPortInUse }); // prettier-ignore
  const ownerFiles = new Set(WORKTREE_DB_ENV_FILES.map((relative) => join(root, relative))); // prettier-ignore
  const rootEnvPath = join(root, '.env');
  const files: string[] = [];

  for (const path of worktreeEnvFiles(root)) {
    const before = readFileSync(path, 'utf8');
    const after = isolateEnvContents(before, {
      compose:
        path === rootEnvPath
          ? { prefix: `wt-${basename(root).toLowerCase()}-`, project: composeProjectFor(root) } // prettier-ignore
          : undefined,
      owner: ownerFiles.has(path),
      ports,
    });

    if (after !== before) {
      writeFileSync(path, after);
      files.push(path);
    }
  }

  writeFileSync(join(root, WORKTREE_COMPOSE_FILE), worktreeComposeOverride('isolated')); // prettier-ignore
  files.push(join(root, WORKTREE_COMPOSE_FILE));

  return { base, files, kind: 'configured', ports };
};

/** Run a command streaming to the terminal; false on a non-zero exit or spawn failure. */
const stream = (
  root: string,
  env: Record<string, string>,
  command: string,
  args: readonly string[],
): boolean =>
  spawnSync(command, [...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  }).status === 0;

const sleepSync = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/** Wait until the worktree's own Postgres accepts TCP connections (not just its init socket). */
const waitForPostgres = (
  root: string,
  env: Record<string, string>,
  attempts = 60,
): boolean => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ready = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'pg_isready -q -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], // prettier-ignore
      { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' },
    );

    if (ready.status === 0) {
      return true;
    }

    sleepSync(1000);
  }

  return false;
};

/**
 * The seed steps run once the worktree's own Postgres answers, in order. The
 * service accounts come last: the worktree's `.env` carries the source
 * checkout's `OPENTHROTTLE_MCP_AUTH_TOKEN` / `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`,
 * and without matching credentials in the fresh database that bearer is
 * rejected (so is `worktree:serve`'s probe).
 */
export const ISOLATED_SEED_STEPS: readonly (readonly [string, string])[] = [
  ['applying migrations', 'database:migrate'],
  ['bootstrapping the default user', 'database:bootstrap-default-user'],
  ['bootstrapping the service-account credentials', 'database:bootstrap-service-accounts'], // prettier-ignore
];

/** The recovery commands printed when seeding fails part-way. */
export const SEED_RECOVERY = [
  'database:start',
  ...ISOLATED_SEED_STEPS.map(([, script]) => script),
]
  .map((script) => `pnpm run ${script}`)
  .join(' && ');

/**
 * Phase 2: start this worktree's own containers, apply every migration,
 * bootstrap the default login user (developer@openthrottle.ai, with admin) and
 * the service-account credentials matching the worktree's bearer tokens.
 * The children get the isolated marker and ports explicitly, so neither a
 * not-yet-reloaded shell environment nor the shared database can leak in.
 * Returns an error message, or `undefined` on success.
 */
export const seedIsolatedDatabase = (
  root: string,
  ports: WorktreeDbPorts,
): string | undefined => {
  const env = {
    POSTGRES_PORT: String(ports.postgres),
    REDIS_PORT: String(ports.redis),
    [WORKTREE_DB_ENV_KEY]: 'isolated',
  };

  if (!stream(root, env, 'pnpm', ['run', 'database:start'])) {
    return `starting the worktree's own Postgres/Redis failed; fix it, then run: ${SEED_RECOVERY}`;
  }

  if (!waitForPostgres(root, env)) {
    return `the worktree's Postgres on :${ports.postgres} never became ready; check \`docker compose logs postgres\`, then run: ${SEED_RECOVERY}`;
  }

  for (const [label, script] of ISOLATED_SEED_STEPS) {
    if (!stream(root, env, 'pnpm', ['run', script])) {
      return `${label} failed; fix it, then run: ${SEED_RECOVERY}`;
    }
  }

  return undefined;
};
