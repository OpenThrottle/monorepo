/**
 * @description Guards the root `.gitattributes` against the failure mode
 * `.prettierignore` already learned the hard way: a new generated payload lands,
 * nobody adds a glob for it, and the omission is invisible until something else
 * breaks. `plan-run-janitor.cjs` is the recorded case.
 *
 * The rule is one sentence: **a tracked file whose header carries a generated
 * banner must be marked `linguist-generated` in `.gitattributes`.** Marked
 * output collapses in GitHub's "Files changed" view and drops out of language
 * stats and code search, so a reviewer sees the authored change instead of the
 * payload.
 *
 * Detection is by banner, not by path list — a path list is the thing that goes
 * stale. A new payload directory is therefore caught the moment it is
 * committed, without this script knowing it exists. Two things make that
 * workable:
 *
 *   - **Header-only.** The banner counts only in the first HEADER_LINES lines.
 *     `packages/agentic-hooks/scripts/bundle-hooks.ts` contains both banners as
 *     string literals — it is the *generator*, and flagging it would be exactly
 *     backwards.
 *   - **Every banner in use.** The agentic-hooks bundles and plugin READMEs use
 *     one wording, NestJS's `autoSchemaFile` another. Both are listed; a third
 *     generator introducing a third wording is invisible here, which is the
 *     known limit of this approach.
 *
 * Deliberately NOT checked: that `-diff` is set. That attribute is a judgment
 * call per payload (right for an esbuild bundle, wrong for output a reviewer
 * occasionally reads), and a guard insisting on it would enforce taste rather
 * than coverage.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger, run } from './lib/index.ts';

const logger = createLogger();

/** Banners generators in this repo stamp into the files they write. */
export const GENERATED_BANNERS: readonly string[] = [
  'GENERATED — DO NOT EDIT',
  'THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)',
];

/**
 * How far into a file a banner still counts as a header. Generators put theirs
 * on line 1-6; a match past this is a mention, not a declaration.
 */
export const HEADER_LINES = 15;

/**
 * Paths whose header carries a banner but which must stay unmarked, each with
 * the reason. Additions need a defensible answer to "why should a reviewer be
 * shown this by default?".
 */
export const ATTRIBUTE_EXEMPT_PATHS: Readonly<Record<string, string>> = {
  'applications/openthrottle-server/schema.gql':
    "the schema diff is the review that enforces deprecate-don't-remove",
};

/** A tracked, banner-headed path and whether git marks it generated. */
export interface GeneratedPathStatus {
  readonly marked: boolean;
  readonly path: string;
}

/** True when one of the banners appears in the file's header. */
export const hasBannerHeader = (cwd: string, path: string): boolean => {
  let header: string;
  try {
    header = readFileSync(join(cwd, path), 'utf8')
      .split('\n', HEADER_LINES)
      .join('\n');
  } catch {
    return false;
  }

  return GENERATED_BANNERS.some((banner) => header.includes(banner));
};

/**
 * Tracked files whose header carries a banner. `git grep` narrows the field
 * (rather than a filesystem walk, so untracked scratch files and node_modules
 * cannot produce findings nobody can act on); the header check then discards
 * the generators that merely mention a banner.
 */
export const findBannerPaths = (cwd: string): string[] => {
  const patterns = GENERATED_BANNERS.flatMap((banner) => ['-e', banner]);
  const result = run(
    'git',
    ['grep', '--files-with-matches', '--fixed-strings', ...patterns],
    { allowFailure: true, cwd },
  );

  // git grep exits 1 with no output when nothing matches — not an error here.
  if (result.exitCode !== 0 && result.stdout === '') {
    return [];
  }

  return result.stdout
    .split('\n')
    .filter((line) => line !== '')
    .filter((path) => hasBannerHeader(cwd, path));
};

/**
 * Resolve `linguist-generated` for each path in one `git check-attr` call.
 * Output is one `<path>: linguist-generated: <value>` line per input; `value`
 * is `true` when set and `unspecified` when no glob matches.
 */
export const checkAttributes = (
  cwd: string,
  paths: string[],
): GeneratedPathStatus[] => {
  if (paths.length === 0) {
    return [];
  }

  const result = run('git', ['check-attr', '--stdin', 'linguist-generated'], {
    allowFailure: true,
    cwd,
    input: `${paths.join('\n')}\n`,
  });

  const suffix = ': linguist-generated: ';
  const marked = new Set<string>();
  for (const line of result.stdout.split('\n')) {
    const separator = line.lastIndexOf(suffix);
    if (separator === -1) {
      continue;
    }

    if (line.slice(separator + suffix.length) === 'true') {
      marked.add(line.slice(0, separator));
    }
  }

  return paths.map((path) => ({ marked: marked.has(path), path }));
};

/** Banner-headed paths that are neither marked nor exempt. */
export const findUnmarkedPaths = (
  statuses: readonly GeneratedPathStatus[],
): string[] =>
  statuses
    .filter(
      (status) =>
        !status.marked && !Object.hasOwn(ATTRIBUTE_EXEMPT_PATHS, status.path),
    )
    .map((status) => status.path);

/**
 * The `.gitattributes` line to add for a path — a folder glob, never the file
 * name, so the next payload in the same directory is covered without a second
 * commit. This is the `.prettierignore` lesson, encoded.
 */
export const suggestGlob = (path: string): string => {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) {
    return `${path} linguist-generated=true`;
  }

  const directory = path.slice(0, lastSlash);
  const extension = path.slice(path.lastIndexOf('.'));

  return `${directory}/*${extension} linguist-generated=true`;
};

export const main = (cwd: string = process.cwd()): number => {
  const paths = findBannerPaths(cwd);
  const unmarked = findUnmarkedPaths(checkAttributes(cwd, paths));

  if (unmarked.length === 0) {
    logger.success(`Generated-payload attributes: ${paths.length} banner-headed file(s), all covered by .gitattributes`); // prettier-ignore

    return 0;
  }

  logger.fail(`${unmarked.length} generated file(s) carry a generated banner but are not marked linguist-generated:`); // prettier-ignore
  for (const path of unmarked) {
    logger.info(`  ${path}`);
  }

  logger.blank();
  logger.info('Add to .gitattributes (folder globs, not file names):');
  for (const glob of [...new Set(unmarked.map(suggestGlob))].sort()) {
    logger.info(`  ${glob}`);
  }

  logger.blank();
  logger.info('If a path must stay reviewable, add it to ATTRIBUTE_EXEMPT_PATHS'); // prettier-ignore
  logger.info('in scripts/check-generated-attributes.ts with the reason.');

  return 1;
};

if (process.argv[1]?.endsWith('check-generated-attributes.ts')) {
  process.exit(main());
}
