/**
 * @description Which migration files a branch actually WROTE, for the
 * diff-scoped migration checks (`check-migration-table-comments`,
 * `check-migration-hygiene`). Shared so both checks agree on what "changed"
 * means across every database in `databases/database-registry.ts`.
 *
 * A pure rename is not a change. Moving `databases/migrations/` to
 * `databases/openthrottle/migrations/` renamed 159 applied files without
 * touching a byte, and counting those as changed would make the content rules
 * judge history nobody can edit. Git reports a byte-identical rename as `R100`;
 * those are dropped, and a rename that also edited the file still counts.
 * Deletions are dropped too: there is no file left to read.
 */

/** One line of `git diff --name-status -M`, split on tabs. */
const parseNameStatusLine = (line: string): string | undefined => {
  const [status, ...paths] = line.split('\t');
  if (!status || paths.length === 0) return undefined;

  const kind = status.charAt(0);
  if (kind === 'D') return undefined;

  const isPureMove = (kind === 'R' || kind === 'C') && status === `${kind}100`;
  if (isPureMove) return undefined;

  return paths.at(-1);
};

/**
 * Repo-relative `.sql` paths named by `git diff --name-status -M` output,
 * excluding deletions and byte-identical renames or copies.
 */
export const changedMigrationPaths = (nameStatus: string): string[] => {
  return nameStatus
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseNameStatusLine)
    .filter((file): file is string => file !== undefined)
    .filter((file) => file.endsWith('.sql'));
};

/** The `git diff` argv that {@link changedMigrationPaths} parses, scoped to `dirs`. */
export const migrationDiffArgs = (
  range: string,
  dirs: readonly string[],
): string[] => {
  return [
    'diff',
    '--name-status',
    '-M',
    range,
    '--',
    ...dirs.map((dir) => `${dir}/`),
  ];
};
