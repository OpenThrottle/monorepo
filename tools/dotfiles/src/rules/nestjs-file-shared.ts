/**
 * The NestJS file-kind contract shared by `nestjs-file-naming` and
 * `nestjs-file-exports` (docs/monorepo/code-style.md, "NestJS file names").
 * A NestJS file is `<stem>.<kind>.ts`; the kind is the last dotted segment and
 * states what the file exports.
 */

/**
 * Module-scoped kinds: at most one per folder, and the stem IS the folder name
 * (`queues/usage-limit/usage-limit.service.ts`). A second module or service in
 * a folder is a second unit and gets its own sub-folder.
 */
export const FOLDER_KINDS: readonly string[] = [
  'constants',
  'controller',
  'module',
  'processor',
  'resolver',
  'service',
  'types',
  'utils',
];

/**
 * Subject-named kinds: many per folder, each named for what it describes
 * (`graphql/queues/job.object.ts`, `guards/global-auth.guard.ts`).
 */
export const SUBJECT_KINDS: readonly string[] = [
  'decorator',
  'entity',
  'enum',
  'executor',
  'factory',
  'guard',
  'input',
  'mapper',
  'object',
  'options',
  'policy',
  'strategy',
  'token',
];

/** Basenames that are never a NestJS unit and carry no kind. */
const EXEMPT_BASENAMES: ReadonlySet<string> = new Set(['index.ts', 'main.ts']);

/** Test-file suffixes, stripped so a test is checked as its source name. */
const TEST_SUFFIX = /\.(?:integration\.)?(?:spec|test)\.ts$/;

export interface ParsedNestFile {
  /** The basename as written, e.g. `usage-limit.service.test.ts`. */
  readonly basename: string;
  /** The trailing extension: `.ts`, `.test.ts`, `.spec.ts` or `.integration.test.ts`. */
  readonly extension: string;
  /**
   * The folder the stem must match: the parent directory, skipping a
   * `__tests__` directory, and naming the project (`nestjs-auth`) for a file
   * directly in its `src/` root.
   */
  readonly folder: string;
  /** The parent directory is the project's `src/` root. */
  readonly isSourceRoot: boolean;
  /** True when the file is a test (`.test.ts`, `.spec.ts`, `.integration.test.ts`). */
  readonly isTest: boolean;
  /** The last dotted segment, or `null` when the source name has a single segment. */
  readonly kind: string | null;
  /** Everything before the kind (`usage-limit`), or the whole name when kindless. */
  readonly stem: string;
}

/**
 * Parses an absolute or relative `.ts` path into the parts the NestJS rules
 * check. Returns `null` for files the contract does not cover: `index.ts`,
 * `main.ts`, declaration files and anything that is not `.ts`.
 */
export const parseNestFile = (filename: string): ParsedNestFile | null => {
  const parts = filename.replace(/\\/g, '/').split('/');
  const basename = parts[parts.length - 1] ?? '';
  if (!basename.endsWith('.ts') || basename.endsWith('.d.ts')) return null;
  if (EXEMPT_BASENAMES.has(basename)) return null;

  const extension = TEST_SUFFIX.exec(basename)?.[0] ?? '.ts';
  const isTest = extension !== '.ts';
  const sourceName = basename.slice(0, -extension.length);

  const dirs = parts.slice(0, -1);
  if (dirs[dirs.length - 1] === '__tests__') dirs.pop();
  const parent = dirs[dirs.length - 1] ?? '';
  const isSourceRoot = parent === 'src';
  const folder = isSourceRoot ? (dirs[dirs.length - 2] ?? parent) : parent;

  const segments = sourceName.split('.');
  if (segments.length < 2) {
    return {
      basename,
      extension,
      folder,
      isSourceRoot,
      isTest,
      kind: null,
      stem: sourceName,
    };
  }
  return {
    basename,
    extension,
    folder,
    isSourceRoot,
    isTest,
    kind: segments[segments.length - 1] ?? null,
    stem: segments.slice(0, -1).join('.'),
  };
};
