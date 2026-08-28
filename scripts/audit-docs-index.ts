/**
 * Reachability audit for `docs/**\/*.md` — the enforcement arm of the docs
 * contract in CONTRIBUTING.md ("## Documentation", rule 5): every doc must be
 * findable by a reader who starts at an index, not only by someone who already
 * knows the filename.
 *
 * **Seeds.** `docs/README.md` and every directory README under `docs/`
 * (`docs/marketing/README.md`, `docs/nx/dependency-graphs/README.md`, …).
 * Future directory READMEs are picked up automatically — nothing to register.
 *
 * **Reachability is transitive, one hop.** A doc linked directly from a seed is
 * reachable, and so is a doc linked from one of those docs. A README is not the
 * only thing that can index a directory: `docs/tools/templates/AGENT_USAGE.md`
 * is linked from `docs/README.md` and is itself the index for the eight
 * generator docs beside it, so those count as reached. The hop stops there —
 * two docs that link each other cannot bootstrap themselves into the index, and
 * a chain of prose does not make its tail discoverable.
 *
 * READMEs are seeds, never audit subjects. An intentionally unindexed doc goes
 * in `audit-docs-index.rules.ts` with a reason.
 *
 * Usage: tsx ./scripts/audit-docs-index.ts [--json] [--strict]
 *   --json    emit the full report as JSON.
 *   --strict  exit non-zero when any orphan exists (the CI gate).
 * Warn-mode (exit 0) otherwise.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { ALLOWLIST } from './audit-docs-index.rules.ts';
import { createLogger, hasFlag } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const DOCS_DIR = 'docs';
const DOCS_GLOB = 'docs/**/*.md';

/** How far link-following goes past a seed. See the header comment. */
const MAX_HOPS = 2;

/** Markdown inline links and reference definitions: `[text](target)`. */
const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)/g;

export interface DocsIndexReport {
  readonly allowlisted: readonly string[];
  readonly orphans: readonly string[];
  readonly reachable: readonly string[];
  readonly seeds: readonly string[];
  readonly total: number;
}

/** Every link target in a markdown body, unresolved and unfiltered. */
export const extractLinks = (markdown: string): readonly string[] =>
  [...markdown.matchAll(LINK_PATTERN)].map((match) => match[1]);

/**
 * A link target resolved to a repo-relative `docs/**\/*.md` path, or null when
 * it points outside the docs tree (external URL, anchor, image, sibling repo
 * file).
 */
export const resolveDocLink = (
  fromDoc: string,
  href: string,
): string | null => {
  const target = href.split('#')[0].split('?')[0].trim();

  if (target === '' || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  if (!target.endsWith('.md')) return null;

  const resolved = path
    .normalize(path.join(path.dirname(fromDoc), target))
    .split(path.sep)
    .join('/');

  return resolved.startsWith(`${DOCS_DIR}/`) ? resolved : null;
};

const isReadme = (docPath: string): boolean =>
  path.basename(docPath) === 'README.md';

/**
 * Walks the seeds outward and reports which docs no reader can find. `tree`
 * maps a repo-relative doc path to its markdown body.
 */
export const auditDocsTree = (
  tree: ReadonlyMap<string, string>,
  allowlist: readonly string[] = ALLOWLIST,
): DocsIndexReport => {
  const seeds = [...tree.keys()].filter(isReadme).sort();
  const reachable = new Set<string>(seeds);

  let frontier = seeds;

  for (let hop = 0; hop < MAX_HOPS && frontier.length > 0; hop += 1) {
    const next: string[] = [];

    for (const doc of frontier) {
      for (const href of extractLinks(tree.get(doc) ?? '')) {
        const target = resolveDocLink(doc, href);

        if (target === null || reachable.has(target)) continue;

        reachable.add(target);
        next.push(target);
      }
    }

    frontier = next;
  }

  const allowed = new Set(allowlist);
  const subjects = [...tree.keys()].filter((doc) => !isReadme(doc)).sort();

  return {
    allowlisted: subjects.filter((doc) => allowed.has(doc)),
    orphans: subjects.filter((doc) => !reachable.has(doc) && !allowed.has(doc)),
    reachable: subjects.filter((doc) => reachable.has(doc)),
    seeds,
    total: subjects.length,
  };
};

const readDocsTree = (): ReadonlyMap<string, string> => {
  const files = globSync(DOCS_GLOB, { cwd: ROOT, posix: true }).sort();

  return new Map(
    files.map((file) => [file, readFileSync(path.join(ROOT, file), 'utf-8')]),
  );
};

const groupByDirectory = (
  docs: readonly string[],
): ReadonlyMap<string, readonly string[]> => {
  const groups = new Map<string, string[]>();

  for (const doc of docs) {
    const directory = path.dirname(doc);
    groups.set(directory, [...(groups.get(directory) ?? []), doc]);
  }

  return groups;
};

const run = (): void => {
  const json = hasFlag('json');
  const strict = hasFlag('strict');
  const report = auditDocsTree(readDocsTree());

  if (json) {
    console.log(JSON.stringify(report, null, 2));

    if (strict && report.orphans.length > 0) process.exit(1);

    return;
  }

  logger.heading('Docs index audit (reachability)');
  logger.info(
    `${report.total} doc(s) under ${DOCS_DIR}/, indexed from ${report.seeds.length} README seed(s).`,
  );
  logger.blank();

  if (report.orphans.length === 0) {
    logger.success('Every doc is reachable from an index.');
  } else {
    logger.warn(
      `${report.orphans.length} orphan(s) — unreachable from any index:`,
    );

    for (const [directory, docs] of [
      ...groupByDirectory(report.orphans).entries(),
    ].sort()) {
      logger.blank();
      logger.info(`${directory}/`);
      for (const doc of docs) logger.detail(path.basename(doc));
    }
  }

  if (report.allowlisted.length > 0) {
    logger.blank();
    logger.info(
      `Allowlisted (deliberately unindexed): ${report.allowlisted.length}`,
    );
    for (const doc of report.allowlisted) logger.detail(doc);
  }

  if (strict && report.orphans.length > 0) {
    logger.blank();
    logger.fail(
      `${report.orphans.length} orphaned doc(s) — link each from an index or allowlist it with a reason (--strict).`,
    );
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
