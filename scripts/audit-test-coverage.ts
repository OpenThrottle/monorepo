/**
 * Repo-wide test-coverage audit (docs/monorepo/test-coverage-audit.md).
 * Complements the primitive-shape guard-rails: where those keep authored files
 * thin and template-shaped, this one flags every route/component/hook/util that
 * ships without a co-located spec matching the generator starting point. Modeled
 * on `audit-route-shape.ts` (single walker, report-only default, --json/--strict,
 * opt-out pragma, per-project rollup).
 *
 * A source file is TESTED when a sibling `<Name>.test.tsx` OR a
 * `__tests__/<Name>.test.*` spec exists (loader/deep-link variants like
 * `<Name>.loader.test.ts` count). A spec still carrying the generator placeholder
 * `FIXME: should be defined` is STUB coverage, not real coverage.
 *
 * Categories: routes/components/hooks/utils are ENFORCED (warn now → strict
 * later); config/data are INFORMATIONAL (counted, never gate — not even under
 * --strict).
 *
 * Usage: tsx ./scripts/audit-test-coverage.ts [--json] [--strict] [--categories=routes,hooks]
 *   --json               emit the full machine-readable inventory (the baseline).
 *   --strict             exit non-zero when any ENFORCED-category file is missing.
 *   --categories=a,b     restrict the scan to the given categories.
 * Report-only (exit 0) otherwise.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';

const ROOT = process.cwd();

/** Union of one-per-file categories, classified purely by on-disk location. */
export const CATEGORIES = [
  'routes',
  'components',
  'hooks',
  'utils',
  'config',
  'data',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Gated (warn now → strict later). */
export const ENFORCED_CATEGORIES: readonly Category[] = [
  'routes',
  'components',
  'hooks',
  'utils',
];
/** Reported but never gated, even under --strict. */
export const INFORMATIONAL_CATEGORIES: readonly Category[] = ['config', 'data'];

/** Category folders discovered anywhere under an app or package source tree. */
const CATEGORY_FOLDERS: readonly Category[] = [
  'components',
  'hooks',
  'utils',
  'config',
  'data',
];

/** Shared exclusion set, reused verbatim from the sibling audit scripts. */
const EXCLUDE =
  /(?:\/__tests__\/|\/__generated__\/|\/dist\/|\.test\.[cm]?tsx?$|\.spec\.[cm]?tsx?$|\.stories\.tsx$|\.example\.tsx$|-test-utils\.tsx$|\.server\.tsx?$|\.graphql$|\.d\.ts$|\/index\.tsx?$|\/root\.tsx$)/;

/** First-line opt-out pragma. */
const OPT_OUT = /test-coverage:\s*opt-out/;

/** Generator placeholder assertion shipped by the hook + util templates. */
const STUB_MARKER = 'FIXME: should be defined';

/** A repo-relative path that is itself a spec file. */
const TEST_FILE = /\.test\.[cm]?tsx?$/;

/** Globs covering every source AND spec file the audit reasons over. */
const ALL_GLOBS = [
  'applications/*/app/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
];

/** File-level coverage status, in precedence order. */
export type CoverageStatus = 'opt-out' | 'stub' | 'tested' | 'missing';

export interface CoverageEntry {
  readonly category: Category;
  readonly file: string;
  readonly project: string;
  readonly status: CoverageStatus;
  readonly testFile: string | null;
}

export interface CategoryRollup {
  readonly category: Category;
  readonly enforced: boolean;
  readonly missing: number;
  readonly missingFiles: readonly string[];
  readonly optOut: number;
  readonly project: string;
  readonly stub: number;
  readonly stubFiles: readonly string[];
  readonly tested: number;
  readonly total: number;
}

export interface CoverageInventory {
  readonly entries: readonly CoverageEntry[];
  readonly rollups: readonly CategoryRollup[];
}

const toPosix = (p: string): string => p.split(path.sep).join('/');

const projectOf = (relativePath: string): string => {
  const match = relativePath.match(/^(applications|packages)\/([^/]+)/);
  return match ? `${match[1]}/${match[2]}` : 'unknown';
};

const isCategory = (value: string): value is Category =>
  CATEGORIES.some((category) => category === value);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Classify a repo-relative path into exactly one category, or null when it is
 * excluded or lives outside every category. Pure path logic — no filesystem.
 */
export const classify = (relativePath: string): Category | null => {
  const p = toPosix(relativePath);
  if (EXCLUDE.test(p)) return null;

  const inApp = /^applications\/[^/]+\/app\//.test(p);
  const inPkg = /^packages\/[^/]+\/src\//.test(p);
  if (!inApp && !inPkg) return null;

  const ext = path.extname(p);
  if (ext !== '.ts' && ext !== '.tsx') return null;

  // routes: flat, direct children of applications/*/app/routes/ only.
  if (/^applications\/[^/]+\/app\/routes\/[^/]+\.(?:ts|tsx)$/.test(p)) {
    return 'routes';
  }

  // Deepest category folder wins on overlap (a hook under components/ is a hook).
  const segments = p.split('/');
  let found: Category | null = null;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (isCategory(segment) && CATEGORY_FOLDERS.includes(segment)) {
      found = segment;
    }
  }
  if (found === null) return null;
  // A component is always JSX; a .ts under components/ is not a component.
  if (found === 'components' && ext !== '.tsx') return null;
  return found;
};

const testBasenameMatches = (base: string, testBasename: string): boolean =>
  new RegExp(`^${escapeRegExp(base)}(?:\\..+)?\\.test\\.(?:ts|tsx)$`).test(
    testBasename,
  );

/**
 * Core analysis. Pure over its inputs so it is unit-testable without the disk:
 * `paths` is every repo-relative source + spec path; `readFile` returns a path's
 * contents (used for the first-line opt-out pragma and the stub marker).
 */
export const analyzeCoverage = (
  paths: readonly string[],
  readFile: (relativePath: string) => string,
): CoverageEntry[] => {
  const posixPaths = paths.map(toPosix);

  // Index spec basenames by their containing directory.
  const testsByDir = new Map<string, string[]>();
  for (const p of posixPaths) {
    if (!TEST_FILE.test(p)) continue;
    const dir = path.posix.dirname(p);
    const list = testsByDir.get(dir) ?? [];
    list.push(path.posix.basename(p));
    testsByDir.set(dir, list);
  }

  const entries: CoverageEntry[] = [];
  for (const p of posixPaths) {
    const category = classify(p);
    if (category === null) continue;

    const dir = path.posix.dirname(p);
    const ext = path.extname(p);
    const base = path.posix.basename(p, ext);

    const candidates: { basename: string; full: string }[] = [
      ...(testsByDir.get(dir) ?? []).map((basename) => ({
        basename,
        full: `${dir}/${basename}`,
      })),
      ...(testsByDir.get(`${dir}/__tests__`) ?? []).map((basename) => ({
        basename,
        full: `${dir}/__tests__/${basename}`,
      })),
    ];
    const match = candidates.find((c) => testBasenameMatches(base, c.basename));

    const firstLine = readFile(p).split('\n')[0] ?? '';
    let status: CoverageStatus;
    let testFile: string | null = null;
    if (OPT_OUT.test(firstLine)) {
      status = 'opt-out';
    } else if (match) {
      testFile = match.full;
      status = readFile(match.full).includes(STUB_MARKER) ? 'stub' : 'tested';
    } else {
      status = 'missing';
    }

    entries.push({
      category,
      file: p,
      project: projectOf(p),
      status,
      testFile,
    });
  }

  return entries.sort((a, b) => a.file.localeCompare(b.file));
};

/** Fold entries into per-project, per-category rollups (sorted, deterministic). */
export const rollup = (entries: readonly CoverageEntry[]): CategoryRollup[] => {
  const rollups = new Map<
    string,
    {
      category: Category;
      missingFiles: string[];
      optOut: number;
      project: string;
      stub: number;
      stubFiles: string[];
      tested: number;
      total: number;
    }
  >();

  for (const entry of entries) {
    const key = `${entry.project} ${entry.category}`;
    const bucket = rollups.get(key) ?? {
      category: entry.category,
      missingFiles: [],
      optOut: 0,
      project: entry.project,
      stub: 0,
      stubFiles: [],
      tested: 0,
      total: 0,
    };
    bucket.total += 1;
    if (entry.status === 'tested') bucket.tested += 1;
    if (entry.status === 'opt-out') bucket.optOut += 1;
    if (entry.status === 'stub') {
      bucket.stub += 1;
      bucket.stubFiles.push(entry.file);
    }
    if (entry.status === 'missing') bucket.missingFiles.push(entry.file);
    rollups.set(key, bucket);
  }

  return [...rollups.values()]
    .map((b) => ({
      category: b.category,
      enforced: ENFORCED_CATEGORIES.includes(b.category),
      missing: b.missingFiles.length,
      missingFiles: [...b.missingFiles].sort(),
      optOut: b.optOut,
      project: b.project,
      stub: b.stub,
      stubFiles: [...b.stubFiles].sort(),
      tested: b.tested,
      total: b.total,
    }))
    .sort(
      (a, b) =>
        a.project.localeCompare(b.project) ||
        a.category.localeCompare(b.category),
    );
};

/** True when any enforced-category file is missing a spec (the --strict gate). */
export const hasStrictFailure = (entries: readonly CoverageEntry[]): boolean =>
  entries.some(
    (e) => ENFORCED_CATEGORIES.includes(e.category) && e.status === 'missing',
  );

const parseCategories = (argv: readonly string[]): Set<Category> => {
  const flag = argv.find((a) => a.startsWith('--categories='));
  if (!flag) return new Set(CATEGORIES);
  const requested = flag
    .slice('--categories='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(isCategory);
  return new Set(requested.length > 0 ? requested : CATEGORIES);
};

const run = (): void => {
  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');
  const selected = parseCategories(process.argv);

  const paths = ALL_GLOBS.flatMap((pattern) =>
    globSync(pattern, { cwd: ROOT }),
  ).map(toPosix);

  const readFile = (relativePath: string): string => {
    try {
      return readFileSync(path.join(ROOT, relativePath), 'utf-8');
    } catch {
      return '';
    }
  };

  const entries = analyzeCoverage(paths, readFile).filter((e) =>
    selected.has(e.category),
  );
  const rollups = rollup(entries);

  if (json) {
    const inventory: CoverageInventory = { entries, rollups };
    console.log(JSON.stringify(inventory, null, 2));
    if (strict && hasStrictFailure(entries)) process.exit(1);
    return;
  }

  const pct = (tested: number, total: number): string =>
    total === 0 ? '—' : `${Math.round((tested / total) * 100)}%`;

  console.log('Test-coverage audit (report-only)');
  console.log(
    `Scanned ${entries.length} source files across ${
      new Set(entries.map((e) => e.project)).size
    } projects.\n`,
  );

  let currentProject = '';
  for (const r of rollups) {
    if (r.project !== currentProject) {
      currentProject = r.project;
      console.log(currentProject);
    }
    const tag = r.enforced ? '' : ' (informational)';
    console.log(
      `  ${r.category.padEnd(11)}${tag}  ${r.tested}/${r.total} tested (${pct(
        r.tested,
        r.total,
      )})  · ${r.missing} missing · ${r.stub} stub · ${r.optOut} opt-out`,
    );
  }

  // Global per-category totals.
  console.log('\nTotals by category:');
  for (const category of CATEGORIES) {
    const cat = rollups.filter((r) => r.category === category);
    if (cat.length === 0) continue;
    const sum = (pick: (r: CategoryRollup) => number): number =>
      cat.reduce((n, r) => n + pick(r), 0);
    const total = sum((r) => r.total);
    const tested = sum((r) => r.tested);
    const enforced = ENFORCED_CATEGORIES.includes(category);
    console.log(
      `  ${category.padEnd(11)}${enforced ? '' : ' (informational)'}  ${tested}/${total} tested (${pct(
        tested,
        total,
      )})  · ${sum((r) => r.missing)} missing · ${sum((r) => r.stub)} stub · ${sum((r) => r.optOut)} opt-out`,
    );
  }

  const missingEnforced = entries.filter(
    (e) => ENFORCED_CATEGORIES.includes(e.category) && e.status === 'missing',
  );
  console.log(
    `\nMissing specs in enforced categories: ${missingEnforced.length}`,
  );
  for (const e of missingEnforced) console.log(`  [${e.category}] ${e.file}`);

  const stubs = entries.filter((e) => e.status === 'stub');
  if (stubs.length > 0) {
    console.log(`\nStub specs (untouched placeholder): ${stubs.length}`);
    for (const e of stubs) console.log(`  [${e.category}] ${e.file}`);
  }

  console.log(
    '\nReport-only: warning mode. Flip a category to --strict only once its gap closes.',
  );

  if (strict && hasStrictFailure(entries)) {
    console.log(
      `\n${missingEnforced.length} enforced-category file(s) missing a spec — failing (--strict).`,
    );
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
