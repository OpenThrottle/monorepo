#!/usr/bin/env node

import {
  glob,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORKSPACE_GLOBS } from './check-catalog-coverage.ts';
import { createLogger, hasFlag, run } from './utils/index.ts';

/**
 * @description Gate: `pnpm-lock.yaml` must be a fixed point of pnpm's incremental resolver,
 * so adding a dependency changes only the importer that gained it.
 *
 * When the lockfile drifts out of that state, every later add re-resolves the stale picks and
 * drags unrelated entries into its diff. On main before OT plan ac971552 that was six
 * `@types/node` snapshots on every add. Two checks run, both in a throwaway copy of the
 * manifests and the lockfile, so the working tree is never touched:
 *
 * 1. `pnpm install --lockfile-only` must leave the lockfile byte-identical.
 * 2. A probe importer that depends on one workspace package is added, and the same command must
 *    change nothing but that importer's own entry.
 *
 * Check 1 alone proves little. pnpm reuses every locked entry whose specifier is unchanged, so a
 * drifted lockfile passes it. Check 2 is what forces a re-resolve. `pnpm dedupe --check` is
 * deliberately NOT used: dedupe converges on a slightly different state from incremental
 * installs, so it would fight every ordinary add.
 *
 * `--fix` re-settles a drifted lockfile with pnpm's own resolvers and writes it back: dedupe,
 * then one incremental re-resolve driven by the probe. Never hand-edit the lockfile.
 * See MONOREPO.md § The lockfile is a fixed point.
 */

const logger = createLogger();

const PROBE_DIR = 'packages/zz-lockfile-fixed-point-probe';
const PROBE_NAME = 'zz-lockfile-fixed-point-probe';
const PROBE_IMPORTER_KEY = `importers › ${PROBE_DIR}`;
const MAX_REPORTED_ENTRIES = 25;
const FIX_COMMAND = 'pnpm run lockfile:settle';
const COPIED_ROOT_FILES = ['.npmrc', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];

export interface LockfileDiff {
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
}

/**
 * @description Split a pnpm v9 lockfile into its top-level entries. Keys look like
 * `snapshots › happy-dom@20.11.1`, and each value is the entry's full text. A column-0 line
 * starts a section (`importers:`, `packages:`, `snapshots:`, or a scalar such as
 * `lockfileVersion`). A two-space-indented line starts an entry within it, and deeper lines
 * belong to that entry. Blank lines carry no meaning and are dropped.
 */
export const parseLockfileEntries = (text: string): Map<string, string> => {
  const entries = new Map<string, string>();
  let section = '';
  let currentKey = '';

  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      continue;
    }

    if (!line.startsWith(' ')) {
      section = line.replace(/:.*$/, '');
      currentKey = section;
      entries.set(currentKey, line);
      continue;
    }

    if (/^ {2}\S/.test(line)) {
      currentKey = `${section} › ${line.trim().replace(/:$/, '')}`;
      entries.set(currentKey, line);
      continue;
    }

    entries.set(currentKey, `${entries.get(currentKey) ?? ''}\n${line}`);
  }

  return entries;
};

/**
 * @description Compare two lockfiles entry by entry, ignoring the keys in `ignoredKeys`.
 */
export const diffLockfiles = (
  before: string,
  after: string,
  ignoredKeys: ReadonlySet<string> = new Set(),
): LockfileDiff => {
  const beforeEntries = parseLockfileEntries(before);
  const afterEntries = parseLockfileEntries(after);
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  for (const [key, value] of afterEntries) {
    if (ignoredKeys.has(key)) {
      continue;
    }

    const previous = beforeEntries.get(key);

    if (previous === undefined) {
      added.push(key);
    } else if (previous !== value) {
      changed.push(key);
    }
  }

  for (const key of beforeEntries.keys()) {
    if (!ignoredKeys.has(key) && !afterEntries.has(key)) {
      removed.push(key);
    }
  }

  return { added, changed, removed };
};

/**
 * @description True when a diff has no added, changed or removed entries.
 */
export const isEmptyDiff = (diff: LockfileDiff): boolean => {
  return (
    diff.added.length === 0 &&
    diff.changed.length === 0 &&
    diff.removed.length === 0
  );
};

/**
 * @description The workspace package the probe depends on: the alphabetically first named,
 * non-root workspace project. Any workspace package works, because the dependency resolves to a
 * `link:` and only serves to make pnpm re-resolve. An empty probe importer does not.
 */
export const pickProbeTarget = (
  names: readonly string[],
): string | undefined => {
  return [...names].sort((a, b) => a.localeCompare(b))[0];
};

interface Sandbox {
  readonly dir: string;
  readonly probeTarget: string;
}

const readManifestName = async (file: string): Promise<string | undefined> => {
  const manifest: unknown = JSON.parse(await readFile(file, 'utf8'));

  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('name' in manifest)
  ) {
    return undefined;
  }

  return typeof manifest.name === 'string' ? manifest.name : undefined;
};

const createSandbox = async (root: string): Promise<Sandbox> => {
  const dir = await mkdtemp(join(tmpdir(), 'lockfile-fixed-point-'));
  const manifests = (
    await Promise.all(
      WORKSPACE_GLOBS.map((pattern) =>
        Array.fromAsync(glob(pattern, { cwd: root })),
      ),
    )
  ).flat();

  await Promise.all(
    [...manifests, ...COPIED_ROOT_FILES].map(async (file) => {
      await mkdir(dirname(join(dir, file)), { recursive: true });
      await writeFile(join(dir, file), await readFile(join(root, file)));
    }),
  );

  const names = await Promise.all(
    manifests
      .filter((file) => file !== 'package.json')
      .map((file) => readManifestName(join(root, file))),
  );
  const probeTarget = pickProbeTarget(
    names.filter((name): name is string => name !== undefined),
  );

  if (probeTarget === undefined) {
    throw new Error('No named workspace package found to point the probe at.');
  }

  return { dir, probeTarget };
};

const pnpmLockfileOnly = (dir: string, args: string[] = ['install']): void => {
  run('pnpm', [...args, '--lockfile-only', '--ignore-scripts'], { cwd: dir });
};

const readLockfile = async (dir: string): Promise<string> => {
  return readFile(join(dir, 'pnpm-lock.yaml'), 'utf8');
};

const addProbe = async (sandbox: Sandbox): Promise<void> => {
  const manifest = {
    dependencies: { [sandbox.probeTarget]: 'workspace:^' },
    name: PROBE_NAME,
    private: true,
    version: '0.0.0',
  };

  await mkdir(join(sandbox.dir, PROBE_DIR), { recursive: true });
  await writeFile(
    join(sandbox.dir, PROBE_DIR, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
};

const removeProbe = async (sandbox: Sandbox): Promise<void> => {
  await rm(join(sandbox.dir, PROBE_DIR), { force: true, recursive: true });
};

const reportDiff = (diff: LockfileDiff): void => {
  const lines = [
    ...diff.changed.map((key) => `~ ${key}`),
    ...diff.added.map((key) => `+ ${key}`),
    ...diff.removed.map((key) => `- ${key}`),
  ];

  for (const line of lines.slice(0, MAX_REPORTED_ENTRIES)) {
    logger.detail(line);
  }

  if (lines.length > MAX_REPORTED_ENTRIES) {
    logger.detail(`… and ${lines.length - MAX_REPORTED_ENTRIES} more`);
  }
};

type CheckResult =
  | { readonly kind: 'ok' }
  | { readonly diff: LockfileDiff; readonly kind: 'out-of-sync' }
  | { readonly diff: LockfileDiff; readonly kind: 'not-fixed-point' };

const check = async (root: string): Promise<CheckResult> => {
  const sandbox = await createSandbox(root);

  try {
    const original = await readLockfile(sandbox.dir);

    pnpmLockfileOnly(sandbox.dir);
    const resolved = await readLockfile(sandbox.dir);

    if (resolved !== original) {
      return { diff: diffLockfiles(original, resolved), kind: 'out-of-sync' };
    }

    await addProbe(sandbox);
    pnpmLockfileOnly(sandbox.dir);
    const probed = await readLockfile(sandbox.dir);
    const diff = diffLockfiles(original, probed, new Set([PROBE_IMPORTER_KEY]));

    return isEmptyDiff(diff)
      ? { kind: 'ok' }
      : { diff, kind: 'not-fixed-point' };
  } finally {
    await rm(sandbox.dir, { force: true, recursive: true });
  }
};

const settle = async (root: string): Promise<void> => {
  const sandbox = await createSandbox(root);

  try {
    pnpmLockfileOnly(sandbox.dir, ['dedupe']);
    await addProbe(sandbox);
    pnpmLockfileOnly(sandbox.dir);
    await removeProbe(sandbox);
    pnpmLockfileOnly(sandbox.dir);
    await writeFile(
      join(root, 'pnpm-lock.yaml'),
      await readLockfile(sandbox.dir),
    );
  } finally {
    await rm(sandbox.dir, { force: true, recursive: true });
  }
};

async function main(): Promise<void> {
  const root = process.cwd();

  if (hasFlag('fix')) {
    logger.step(
      'Re-settling pnpm-lock.yaml (dedupe, then one incremental re-resolve)…',
    );
    await settle(root);
  }

  const result = await check(root);

  if (result.kind === 'ok') {
    logger.success(
      'pnpm-lock.yaml is a fixed point: re-resolving it, and adding a dependency, change nothing else.',
    );
    return;
  }

  if (result.kind === 'out-of-sync') {
    logger.fail(
      'pnpm-lock.yaml does not match the manifests: `pnpm install --lockfile-only` rewrites it:',
    );
    logger.blank();
    reportDiff(result.diff);
    logger.blank();
    logger.fail(
      'Run `pnpm install` and commit the lockfile. Never hand-edit it.',
    );
    process.exit(1);
  }

  logger.fail(
    'pnpm-lock.yaml is not a fixed point: adding one workspace dependency also rewrote these unrelated entries:',
  );
  logger.blank();
  reportDiff(result.diff);
  logger.blank();
  logger.fail(
    `Every future dependency add would drag these into its diff. Run \`${FIX_COMMAND}\`, review the lockfile diff, and commit it. Never hand-edit the lockfile. See MONOREPO.md § The lockfile is a fixed point.`,
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
