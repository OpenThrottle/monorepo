/**
 * @description Enforces ot-folders rule 4 — no junk-drawer folder names. A
 * directory named `lib`, `helpers`, `common`, `shared` or `misc` says nothing
 * about what belongs in it, so it grows without bound, and every one left in
 * the tree is an example the next agent copies. The skill states the rule; this
 * makes it fail.
 *
 * Matching is by whole path **segment**, and only directory segments — never the
 * basename. `library.ts`, `common.ts` and a `@nestjs/common` import are all
 * fine; `src/lib/x.ts` is not. Each offending directory reports once, however
 * many files it holds.
 *
 * Two modes over one list:
 *
 *   - **Whole tree** (default) — `git ls-files`, so untracked scratch output and
 *     `node_modules` cannot produce findings nobody can act on. It also lists
 *     intent-to-add paths (`git add -N`), which is how to probe the check
 *     without committing anything. `check:local` and the CI `gates` job run this.
 *   - **`--staged`** — only paths the index adds or renames *to*
 *     (`git diff --cached --diff-filter=AR`). `.husky/pre-commit` runs this via
 *     `.husky/utils/folder-vocabulary-gate.sh`, so a commit is refused before CI
 *     has to say so. A rename *out of* a banned folder is the fix, so only the
 *     destination counts; modified files are the whole-tree check's business.
 *
 * It also enforces ot-folders rule 1 — do not invent new folders — for the
 * top-level `src/` folders of every project under `packages/` and `tools/`.
 * The project's `technology:` tags pick its bucket ({@link resolveBucket}), and
 * the bucket's words come from `BUCKET_FOLDER_VOCABULARY` in @tools/generators.
 * The `nestjs` bucket and `applications/` are not checked: NestJS is
 * folder-per-unit, and the React Router apps' `app/routing` + `app/global`
 * layout has its own audits. Folders that predate the check are listed in
 * {@link GRANDFATHERED_FOLDERS}, which only ever shrinks.
 *
 * Known limits:
 *
 *   - **Tracked files only.** An empty directory (or one holding only ignored
 *     files) is invisible to git and therefore to this check. That is fine in
 *     practice: an empty `lib/` has nothing in it to copy.
 *   - **Names, not intent.** A tool's own specific term is allowed even when it
 *     sounds generic, but only the five names in BANNED_FOLDER_NAMES are
 *     banned everywhere; a sixth vague name needs adding there deliberately.
 *     The bucket check covers only top-level `src/` folders of checked
 *     projects — nested folders, NestJS and applications stay honor system.
 *   - **Shrink-only is enforced here, not in the spec.** The whole-tree run
 *     also fails on a {@link GRANDFATHERED_FOLDERS} entry that no tracked file
 *     sits under, or whose folder is now in the vocabulary, because this target
 *     is never cached and a cached spec could miss the rename.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';
import type { BannedFolderName, CheckedBucket } from '@tools/generators';
import {
  BANNED_FOLDER_NAMES,
  BUCKET_FOLDER_VOCABULARY,
  FOLDER_VOCABULARY_SKILL_POINTER,
} from '@tools/generators';

import { hasFlag } from './utils/args.ts';
import { run } from './utils/exec.ts';
import { createLogger } from './utils/logger.ts';

const logger = createLogger();

// The banned names and their hints live in @tools/generators, which validates
// `--folder` / `--name` against the same list. Re-exported so this script's
// spec and callers have one import site.
export type { BannedFolderName };
export { BANNED_FOLDER_NAMES };

/** A path prefix exempt from the check, and why. */
export interface AllowlistEntry {
  /** Matched against the path with a `**` segment standing for any depth. */
  readonly pattern: string;
  readonly reason: string;
}

/**
 * Paths exempt from the check, each with the reason. Additions need a
 * defensible answer to "why is a vague name right here?" — never "it was
 * already there".
 */
export const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    pattern: 'tools/generators/**/files/**',
    reason: `generator template input — the folder name is the generated output's, not ours`,
  },
];

/** A directory carrying a banned segment, reported once per directory. */
export interface BannedFolderHit {
  /** What to use instead, from BANNED_FOLDER_NAMES. */
  readonly hint: string;
  /** The directory path, up to and including the banned segment. */
  readonly path: string;
  readonly segment: BannedFolderName;
}

const isBannedName = (segment: string): segment is BannedFolderName => {
  return Object.hasOwn(BANNED_FOLDER_NAMES, segment);
};

const escapeRegExp = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/** `a/**\/b/**` → a regex matching `a/<any depth>/b/<anything>`. */
const allowlistPattern = (pattern: string): RegExp => {
  const source = pattern
    .split('/')
    .map((segment) =>
      segment === '**' ? '(?:[^/]+/)*' : `${escapeRegExp(segment)}/`,
    )
    .join('');

  return new RegExp(`^${source}`);
};

const ALLOWLIST_PATTERNS = ALLOWLIST.map((entry) =>
  allowlistPattern(entry.pattern),
);

/** True when an allowlist entry covers the path. */
export const isAllowlisted = (path: string): boolean => {
  return ALLOWLIST_PATTERNS.some((pattern) => pattern.test(path));
};

/**
 * Every directory in `paths` that carries a banned segment. The basename is
 * never checked — a file may be called `common.ts`. Nested hits
 * (`lib/helpers/x.ts`) report both directories; hits are deduped by directory
 * and sorted.
 */
export const findBannedFolders = (
  paths: readonly string[],
): BannedFolderHit[] => {
  const hits = new Map<string, BannedFolderHit>();

  for (const path of paths) {
    if (isAllowlisted(path)) {
      continue;
    }

    const directories = path.split('/').slice(0, -1);
    directories.forEach((segment, index) => {
      if (!isBannedName(segment)) {
        return;
      }

      const directory = directories.slice(0, index + 1).join('/');
      if (!hits.has(directory)) {
        hits.set(directory, {
          hint: BANNED_FOLDER_NAMES[segment],
          path: directory,
          segment,
        });
      }
    });
  }

  return [...hits.values()].sort((a, b) => a.path.localeCompare(b.path));
};

/** A project root under `packages/` or `tools/` and the bucket its tags pick. */
export interface ProjectBucket {
  readonly bucket: CheckedBucket;
  /** Repo-relative, e.g. `packages/openthrottle-mcp`. */
  readonly root: string;
}

/** An exact `<project>/src/<folder>` path exempt from the bucket check. */
export interface GrandfatheredFolder {
  readonly path: string;
  readonly reason: string;
}

const PREDATES_CHECK = `predates the bucket allowlist; move it into the vocabulary when next touched`;
const MCP_VOCABULARY = `MCP protocol vocabulary: the server registers tools and resources`;

/**
 * @description Top-level `src/` folders outside their bucket's vocabulary that
 * existed when the check landed. **Shrink-only**: never add an entry for a new
 * folder — pick a vocabulary word, or move the code to the bucket that owns it.
 * The spec fails on an entry that no longer matches a tracked folder, so a
 * rename into the vocabulary has to delete its line.
 */
export const GRANDFATHERED_FOLDERS: readonly GrandfatheredFolder[] = [
  { path: 'packages/agentic-evals/src/calibration', reason: PREDATES_CHECK },
  { path: 'packages/agentic-evals/src/judge-cache', reason: PREDATES_CHECK },
  { path: 'packages/agentic-evals/src/report', reason: PREDATES_CHECK },
  { path: 'packages/agentic-evals/src/runner', reason: PREDATES_CHECK },
  { path: 'packages/agentic-evals/src/stats', reason: PREDATES_CHECK },
  { path: 'packages/agentic-evals/src/workspace', reason: PREDATES_CHECK },
  { path: 'packages/agentic-hooks/src/adapters', reason: PREDATES_CHECK },
  { path: 'packages/agentic-hooks/src/memory', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-agentic-loop/src/contract', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-agentic-utils/src/bin', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-agentic-utils/src/memory-reconcile', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-drivers/src/drivers', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-drivers/src/engine', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-drivers/src/errors', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-drivers/src/registry', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-drivers/src/run-agent-prompt', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp-evals/src/code-search', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp-evals/src/sandbox', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp-evals/src/search-ranking', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp-evals/src/tool-selection', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/auth', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/graphql', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/http', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/model-facing-text', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/nest', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/resources', reason: MCP_VOCABULARY },
  { path: 'packages/openthrottle-mcp/src/session', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-mcp/src/tools', reason: MCP_VOCABULARY },
  { path: 'packages/openthrottle-product/src/scripts', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/assemble', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/episodes', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/fixtures', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/narrate', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/runner', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/scan', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/scripts', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/snapshot', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/surfaces', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-showroom/src/validate', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-skills/src/frontmatter', reason: PREDATES_CHECK },
  { path: 'packages/openthrottle-skills/src/schemas', reason: PREDATES_CHECK },
  { path: 'packages/react-router-chat/src/context', reason: PREDATES_CHECK },
  { path: 'packages/react-router-shadcn/src/themes', reason: PREDATES_CHECK },
  { path: 'tools/dotfiles/src/rules', reason: `ESLint plugin layout: the package exports its rules` },
  { path: 'tools/generators/src/generators', reason: `Nx plugin layout: generators.json points into src/generators/` },
]; // prettier-ignore

const GRANDFATHERED_PATHS = new Set(
  GRANDFATHERED_FOLDERS.map((entry) => entry.path),
);

/** A top-level `src/` folder outside its project's bucket vocabulary. */
export interface OffVocabularyHit {
  readonly allowed: readonly string[];
  readonly bucket: CheckedBucket;
  /** `<project>/src/<folder>`. */
  readonly path: string;
}

/**
 * @description The bucket a project's tags pick, first match wins:
 * `react-router` > `react` > `nestjs` > `nodejs` > `typescript` (a
 * typescript-only project takes the nodejs vocabulary). `undefined` means the
 * project is not checked — the `nestjs` bucket, or no matching tag.
 */
export const resolveBucket = (
  tags: readonly string[],
): CheckedBucket | undefined => {
  if (tags.includes('technology:react-router')) {
    return 'react-router';
  }
  if (tags.includes('technology:react')) {
    return 'react';
  }
  if (tags.includes('technology:nestjs')) {
    return undefined;
  }
  const isNodeBucket =
    tags.includes('technology:nodejs') ||
    tags.includes('technology:typescript');
  if (isNodeBucket) {
    return 'nodejs';
  }

  return undefined;
};

/** `packages/<name>/package.json` or `tools/<name>/package.json`, one level deep. */
const PROJECT_MANIFEST = /^((?:packages|tools)\/[^/]+)\/package\.json$/;

/**
 * @description The manifest's `nx.tags`, or none when it is missing, malformed
 * mid-edit or carries no tags. Never throws: the pre-commit hook runs this on
 * every tracked manifest, and a stack trace there would block an unrelated
 * commit. An unreadable manifest's project is simply not checked.
 */
const readTags = (manifestPath: string): readonly string[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }

  const nx = isRecord(parsed) ? parsed.nx : undefined;
  const tags = isRecord(nx) ? nx.tags : undefined;
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === 'string');
};

/** Every checked project among the tracked manifests, with its bucket. */
export const listProjectBuckets = (
  cwd: string,
  trackedPaths: readonly string[],
): ProjectBucket[] => {
  return trackedPaths.flatMap((path) => {
    const root = PROJECT_MANIFEST.exec(path)?.[1];
    if (root === undefined) {
      return [];
    }

    const bucket = resolveBucket(readTags(join(cwd, path)));

    return bucket === undefined ? [] : [{ bucket, root }];
  });
};

/**
 * @description Every top-level `src/` folder in `paths` that its project's bucket does not
 * allow and {@link GRANDFATHERED_FOLDERS} does not list. Files directly under
 * `src/` are never hits; hits are deduped by folder and sorted.
 */
export const findOffVocabularyFolders = (
  paths: readonly string[],
  projects: readonly ProjectBucket[],
): OffVocabularyHit[] => {
  const hits = new Map<string, OffVocabularyHit>();

  for (const project of projects) {
    const prefix = `${project.root}/src/`;
    const allowed: readonly string[] = BUCKET_FOLDER_VOCABULARY[project.bucket];

    for (const path of paths) {
      const rest = path.startsWith(prefix) ? path.slice(prefix.length) : '';
      const folder = rest.includes('/') ? rest.split('/')[0] : undefined;
      if (folder === undefined || allowed.includes(folder)) {
        continue;
      }

      const folderPath = `${prefix}${folder}`;
      if (GRANDFATHERED_PATHS.has(folderPath) || isAllowlisted(path)) {
        continue;
      }

      hits.set(folderPath, {
        allowed,
        bucket: project.bucket,
        path: folderPath,
      });
    }
  }

  return [...hits.values()].sort((a, b) => a.path.localeCompare(b.path));
};

/** Grandfather entries that no longer earn their place. */
export interface GrandfatherDrift {
  /** The folder is now in its bucket's vocabulary, or its project is unchecked. */
  readonly redundant: readonly string[];
  /** No tracked file sits under the folder any more. */
  readonly stale: readonly string[];
}

/**
 * @description The {@link GRANDFATHERED_FOLDERS} entries a whole-tree run must
 * reject, so the list can only shrink: a renamed or deleted folder leaves a
 * stale entry, and a folder that moved into a checked vocabulary (or whose
 * project left the checked buckets) leaves a redundant one.
 */
export const findGrandfatherDrift = (
  trackedPaths: readonly string[],
  projects: readonly ProjectBucket[],
  entries: readonly GrandfatheredFolder[] = GRANDFATHERED_FOLDERS,
): GrandfatherDrift => {
  const stale = entries
    .filter((entry) => !trackedPaths.some((path) => path.startsWith(`${entry.path}/`)))
    .map((entry) => entry.path); // prettier-ignore

  const redundant = entries
    .filter((entry) => {
      const project = projects.find((candidate) =>
        entry.path.startsWith(`${candidate.root}/src/`),
      );
      if (project === undefined) {
        return true;
      }
      const allowed: readonly string[] =
        BUCKET_FOLDER_VOCABULARY[project.bucket];

      return allowed.includes(entry.path.split('/').at(-1) ?? '');
    })
    .map((entry) => entry.path);

  return { redundant, stale };
};

/** The failure line for one off-vocabulary folder: the path, bucket and words. */
export const formatOffVocabularyHit = (hit: OffVocabularyHit): string => {
  return `  ${hit.path}/ — not in the ${hit.bucket} vocabulary; use one of ${hit.allowed.join(', ')}`;
};

/** The failure line for one hit: the path, then what to use instead. */
export const formatHit = (hit: BannedFolderHit): string => {
  return `  ${hit.path}/ — "${hit.segment}" is a junk-drawer name; use ${hit.hint}`;
};

const splitNulSeparated = (stdout: string): string[] => {
  return stdout.split('\0').filter((path) => path !== '');
};

/** Every tracked path, including intent-to-add ones. */
export const listTrackedPaths = (cwd: string): string[] => {
  return splitNulSeparated(run('git', ['ls-files', '-z'], { cwd }).stdout);
};

/** Paths the index adds, or renames to — never a rename's source. */
export const listStagedPaths = (cwd: string): string[] => {
  return splitNulSeparated(
    run('git', ['diff', '--cached', '--name-only', '--diff-filter=AR', '-z'], {
      cwd,
    }).stdout,
  );
};

export const main = (
  cwd: string = process.cwd(),
  staged: boolean = hasFlag('staged'),
  grandfathered: readonly GrandfatheredFolder[] = GRANDFATHERED_FOLDERS,
): number => {
  const trackedPaths = listTrackedPaths(cwd);
  const paths = staged ? listStagedPaths(cwd) : trackedPaths;
  const projects = listProjectBuckets(cwd, trackedPaths);
  const hits = findBannedFolders(paths);
  const offVocabulary = findOffVocabularyFolders(paths, projects);
  const scope = staged ? 'staged added/renamed' : 'tracked';
  // Drift is a whole-tree question: a staged run sees only part of the tree.
  const noDrift: GrandfatherDrift = { redundant: [], stale: [] };
  const drift = staged
    ? noDrift
    : findGrandfatherDrift(trackedPaths, projects, grandfathered);
  const driftCount = drift.redundant.length + drift.stale.length;

  if (hits.length === 0 && offVocabulary.length === 0 && driftCount === 0) {
    logger.success(`Folder vocabulary: ${paths.length} ${scope} path(s), no junk-drawer or off-vocabulary folders`); // prettier-ignore

    return 0;
  }

  if (hits.length > 0) {
    logger.fail(`${hits.length} folder(s) use a junk-drawer name (${Object.keys(BANNED_FOLDER_NAMES).join(', ')}):`); // prettier-ignore
    for (const hit of hits) {
      logger.info(formatHit(hit));
    }

    logger.blank();
    logger.info(`Rename the folder per ${FOLDER_VOCABULARY_SKILL_POINTER}.`);
    logger.info(
      'If a vague name is genuinely right, add an ALLOWLIST entry with',
    );
    logger.info('its reason in scripts/check-folder-vocabulary.ts.');
  }

  if (offVocabulary.length > 0) {
    logger.blank();
    logger.fail(`${offVocabulary.length} top-level src/ folder(s) are outside their bucket's vocabulary:`); // prettier-ignore
    for (const hit of offVocabulary) {
      logger.info(formatOffVocabularyHit(hit));
    }

    logger.blank();
    logger.info(
      'Use a vocabulary word, or move the code to the bucket that owns it,',
    );
    logger.info(
      'per skills/ot-folders/SKILL.md (rule 1, "Do not invent new folders").',
    );
  }

  if (driftCount > 0) {
    logger.blank();
    logger.fail(`${driftCount} GRANDFATHERED_FOLDERS entries no longer apply; delete them from scripts/check-folder-vocabulary.ts:`); // prettier-ignore
    for (const path of drift.stale) {
      logger.info(`  ${path}/ — no tracked file left under it`);
    }
    for (const path of drift.redundant) {
      logger.info(`  ${path}/ — in its bucket's vocabulary, or its project is not checked`); // prettier-ignore
    }
  }

  return 1;
};

if (process.argv[1]?.endsWith('check-folder-vocabulary.ts')) {
  process.exit(main());
}
