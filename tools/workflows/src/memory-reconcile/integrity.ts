/**
 * The both-directions check: every memory file is reachable, and every pointer
 * resolves.
 *
 * This exists because the failure mode of tidying memory is losing it. A bulk
 * index rewrite once silently dropped four entries — the files stayed on disk,
 * nothing errored, and they simply stopped being reachable from anywhere. A
 * one-directional check would not have caught it: every remaining link still
 * resolved perfectly.
 *
 * So both directions are checked, and they catch different bugs:
 *
 * - **Orphans** (file on disk, reachable from nothing) — the rewrite bug. The
 *   memory still exists but no session will ever be told about it.
 * - **Broken links** (pointer to a file that is not there) — the rename or
 *   delete bug. A session is told to open something that does not exist.
 *
 * Pure, and local: no network, so this runs even when everything else is down.
 */

/** A markdown link target inside an index or archive: `[Title](file.md)`. */
const LINK_PATTERN = /\[([^\]]*)\]\(([^)]+\.md)\)/g;

export interface IntegrityIssue {
  /** The file this concerns. */
  readonly file: string;
  /** Where the pointer was found, for a broken link. */
  readonly source: string | null;
}

export interface IntegrityReport {
  /** Pointers whose target file does not exist. */
  readonly brokenLinks: readonly IntegrityIssue[];
  /** Files on disk reachable from neither the index nor the archive. */
  readonly orphans: readonly IntegrityIssue[];
  /** Total files considered, for the coverage line. */
  readonly totalFiles: number;
  /** Total distinct link targets found across index + archive. */
  readonly totalLinks: number;
}

export interface IntegrityInput {
  /** Archive contents, keyed by basename. Any number of archives is fine. */
  readonly archives: ReadonlyMap<string, string>;
  /**
   * Every `*.md` file in the memory directory, by basename. The index itself
   * (and the archive) are included by the caller; they are excluded here rather
   * than by the caller so the rule lives in one place.
   */
  readonly files: readonly string[];
  /** The index content. */
  readonly indexContent: string;
  /** Basename of the index, excluded from the orphan check. */
  readonly indexName: string;
}

const collectLinks = (content: string): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const match of content.matchAll(LINK_PATTERN)) {
    const target = match[2];
    // Ignore anything that walks out of the memory directory or is a URL — this
    // check is about local memory files, and a relative path elsewhere is not
    // a memory pointer at all.
    if (target === undefined) continue;
    if (target.includes('://') || target.includes('/')) continue;
    out.add(target);
  }
  return out;
};

export const checkIndexIntegrity = ({
  archives,
  files,
  indexContent,
  indexName,
}: IntegrityInput): IntegrityReport => {
  const onDisk = new Set(files);

  const linked = new Set(collectLinks(indexContent));
  const linkSource = new Map<string, string>();
  for (const target of linked) linkSource.set(target, indexName);

  for (const [archiveName, content] of archives) {
    for (const target of collectLinks(content)) {
      linked.add(target);
      if (!linkSource.has(target)) linkSource.set(target, archiveName);
    }
  }

  // The index and the archives are reachable by definition — the index is the
  // root, and each archive is linked from it. Counting them as orphans would
  // report a permanent false positive that trains the reader to ignore the check.
  const reachableByDefinition = new Set<string>([
    indexName,
    ...archives.keys(),
  ]);

  const orphans = files
    .filter((file) => !reachableByDefinition.has(file) && !linked.has(file))
    .map((file) => ({ file, source: null }));

  const brokenLinks = [...linked]
    .filter((target) => !onDisk.has(target))
    .map((target) => ({
      file: target,
      source: linkSource.get(target) ?? null,
    }));

  return {
    brokenLinks,
    orphans,
    totalFiles: onDisk.size,
    totalLinks: linked.size,
  };
};

export const formatIntegrityReport = (report: IntegrityReport): string => {
  const lines: string[] = ['Index integrity (both directions):'];

  if (report.orphans.length === 0) {
    lines.push('  orphans:      none');
  } else {
    lines.push(
      `  orphans:      ${report.orphans.length} file(s) reachable from neither the index nor an archive:`,
    );
    for (const issue of report.orphans) lines.push(`    ${issue.file}`);
  }

  if (report.brokenLinks.length === 0) {
    lines.push('  broken links: none');
  } else {
    lines.push(`  broken links: ${report.brokenLinks.length}:`);
    for (const issue of report.brokenLinks) {
      lines.push(
        `    ${issue.file} (linked from ${issue.source ?? 'unknown'})`,
      );
    }
  }

  lines.push(
    `  ${report.totalFiles} file(s) on disk, ${report.totalLinks} distinct link target(s)`,
  );

  return lines.join('\n');
};
