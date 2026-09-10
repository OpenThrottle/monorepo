/**
 * @description GraphQL codegen drift guard that works whether or not a
 * project's `__generated__` output is committed.
 *
 * The guard this replaces was `graphql-codegen && git diff --exit-code --
 * <project>/src/__generated__`, which only measures drift for a project whose
 * generated output is TRACKED. Two of the three projects carrying that target
 * leave the output gitignored (`.gitignore` `**\/__generated__/**\/*`, tracking
 * only `.gitkeep`), and `git diff` over ignored untracked paths always exits 0
 * — so those guards could never fail, in CI or locally. That is how a shared
 * fragment lost `runConfigJson` without a single gate going red (OT plan
 * 4b7576ac).
 *
 * The mechanism here does not depend on git: snapshot whatever output is on
 * disk, regenerate, then byte-compare. A difference means the checked-in
 * `.graphql` documents (or the committed `schema.gql`) no longer agree with the
 * generated code, which is the same failure `git diff` was meant to catch —
 * detected from the filesystem instead of the index. The snapshot is restored
 * before exiting either way, so the guard never leaves the worktree changed.
 *
 * ONE HONEST LIMIT, reported loudly rather than papered over: with no output on
 * disk to compare against (a fresh clone, or CI, where the directory is
 * gitignored and built on demand), a regeneration has nothing to disagree with.
 * That run still proves codegen succeeds against the committed schema, and the
 * script says plainly that the comparison was vacuous. The drift itself stays
 * covered in CI by the projects that DO commit their output — notably
 * openthrottle-agentic-ralph, which owns the shared plan/task documents every
 * other consumer spreads.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createLogger, flagValue, run } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();

/** Default output directory, relative to the project root. */
const DEFAULT_OUTPUT_DIR = 'src/__generated__';

/**
 * Never compared: a tracking placeholder for an otherwise-ignored directory,
 * not codegen output.
 */
const IGNORED_ENTRIES = new Set(['.gitkeep']);

/** How a regenerated file differs from its snapshot. */
const DRIFT_KIND = {
  added: 'added',
  changed: 'changed',
  removed: 'removed',
} as const;

type DriftKind = (typeof DRIFT_KIND)[keyof typeof DRIFT_KIND];

interface Drift {
  /** Path relative to the output directory. */
  readonly file: string;
  readonly kind: DriftKind;
}

/** Every file under `dir`, as paths relative to `dir`, sorted. */
const listFiles = (dir: string, prefix = ''): string[] => {
  if (!existsSync(dir)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...listFiles(path.join(dir, entry.name), relative));
      continue;
    }

    if (!IGNORED_ENTRIES.has(entry.name)) {
      files.push(relative);
    }
  }

  return files.sort();
};

/** Compare two output trees file-by-file. */
const compareTrees = (before: string, after: string): Drift[] => {
  const beforeFiles = new Set(listFiles(before));
  const afterFiles = new Set(listFiles(after));
  const drift: Drift[] = [];

  for (const file of [...beforeFiles].sort()) {
    if (!afterFiles.has(file)) {
      drift.push({ file, kind: DRIFT_KIND.removed });
      continue;
    }

    const isSame = readFileSync(path.join(before, file)).equals(
      readFileSync(path.join(after, file)),
    );

    if (!isSame) {
      drift.push({ file, kind: DRIFT_KIND.changed });
    }
  }

  for (const file of [...afterFiles].sort()) {
    if (!beforeFiles.has(file)) {
      drift.push({ file, kind: DRIFT_KIND.added });
    }
  }

  return drift;
};

/** Replace `outputPath`'s contents with the snapshot's. */
const restore = (snapshot: string, outputPath: string): void => {
  for (const file of listFiles(outputPath)) {
    rmSync(path.join(outputPath, file));
  }

  for (const file of listFiles(snapshot)) {
    const destination = path.join(outputPath, file);

    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(snapshot, file), destination);
  }
};

const projectDir = flagValue('project');

if (projectDir === undefined) {
  logger.fail('--project=<path to project root> is required.');
  process.exit(1);
}

const outputPath = path.join(
  ROOT,
  projectDir,
  flagValue('output') ?? DEFAULT_OUTPUT_DIR,
);

logger.heading(`GraphQL codegen drift guard — ${projectDir}`);

const snapshotRoot = mkdtempSync(path.join(tmpdir(), 'ot-codegen-verify-'));
const snapshot = path.join(snapshotRoot, 'before');

mkdirSync(snapshot, { recursive: true });

if (existsSync(outputPath)) {
  cpSync(outputPath, snapshot, { recursive: true });
}

const baseline = listFiles(snapshot);

logger.step(
  baseline.length === 0
    ? 'No existing generated output to compare against.'
    : `Snapshotted ${baseline.length} generated file(s).`,
);

const codegen = run('pnpm', ['exec', 'graphql-codegen'], {
  allowFailure: true,
  cwd: path.join(ROOT, projectDir),
  stdio: 'inherit',
});

if (codegen.exitCode !== 0) {
  restore(snapshot, outputPath);
  rmSync(snapshotRoot, { force: true, recursive: true });
  logger.blank();
  logger.fail(
    'graphql-codegen failed. The checked-in .graphql documents do not agree with applications/openthrottle-server/schema.gql.',
  );
  process.exit(1);
}

const drift = compareTrees(snapshot, outputPath);

restore(snapshot, outputPath);
rmSync(snapshotRoot, { force: true, recursive: true });

if (baseline.length === 0) {
  logger.blank();
  logger.warn(
    'Codegen succeeded, but there was no prior output to compare — this run proves the documents generate, NOT that anything is up to date.',
  );
  logger.detail(
    'Run the project once (codegen-graphql, build or dev) so the guard has a baseline, or rely on a project that commits its __generated__ output.',
  );
  process.exit(0);
}

if (drift.length === 0) {
  logger.blank();
  logger.success(
    `Generated output matches the .graphql documents (${baseline.length} file(s) compared).`,
  );
  process.exit(0);
}

logger.blank();
logger.fail(`Generated output is stale — ${drift.length} file(s) drifted:`);

for (const { file, kind } of drift) {
  logger.detail(`${kind.padEnd(7)} ${file}`);
}

logger.blank();
logger.info(
  `Fix: pnpm nx run ${path.basename(projectDir)}:codegen-graphql — then commit the result in projects that track __generated__.`,
);
process.exit(1);
