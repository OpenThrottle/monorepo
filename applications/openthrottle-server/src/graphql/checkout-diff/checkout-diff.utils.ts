import { FALLBACK_BASE_REFS } from './checkout-diff.constants.ts';
import type { CheckoutDiffFileStatusValue } from './checkout-diff.enum.ts';
import { CHECKOUT_DIFF_FILE_STATUS } from './checkout-diff.enum.ts';
import type {
  CappedPatch,
  CheckoutDiffFile,
  NameStatusEntry,
  NumstatEntry,
} from './checkout-diff.types.ts';

const NUMSTAT_HEAD = /^(-|\d+)\t(-|\d+)\t([\s\S]*)$/u;

/**
 * @description Parses `git diff --numstat -z`. A plain record is `adds\tdels\tpath\0`; a rename
 * or copy is `adds\tdels\t\0old\0new\0`. A binary file reports `-` for both counts.
 */
export function parseNumstatZ(output: string): NumstatEntry[] {
  const tokens = output.split('\0');
  const entries: NumstatEntry[] = [];
  let index = 0;

  while (index < tokens.length) {
    const head = tokens[index++] ?? '';
    const match = NUMSTAT_HEAD.exec(head);

    if (match === null) continue;

    const [, adds = '-', dels = '-', inlinePath = ''] = match;
    const isMoved = inlinePath === '';
    const previousPath = isMoved ? (tokens[index++] ?? '') : null;
    const path = isMoved ? (tokens[index++] ?? '') : inlinePath;

    if (path === '') continue;

    entries.push({
      additions: adds === '-' ? 0 : Number(adds),
      binary: adds === '-' || dels === '-',
      deletions: dels === '-' ? 0 : Number(dels),
      path,
      previousPath,
    });
  }

  return entries;
}

/** @description Maps a `--name-status` letter (`M`, `A`, `D`, `R095`, `C100`, `T`) to a status. */
export function toFileStatus(code: string): CheckoutDiffFileStatusValue {
  const letter = code.charAt(0);

  if (letter === 'A' || letter === 'C') return CHECKOUT_DIFF_FILE_STATUS.ADDED;
  if (letter === 'D') return CHECKOUT_DIFF_FILE_STATUS.DELETED;
  if (letter === 'R') return CHECKOUT_DIFF_FILE_STATUS.RENAMED;

  return CHECKOUT_DIFF_FILE_STATUS.MODIFIED;
}

/**
 * @description Parses `git diff --name-status -z`: `STATUS\0path\0`, and for a rename or copy
 * `Rnnn\0old\0new\0`.
 */
export function parseNameStatusZ(output: string): NameStatusEntry[] {
  const tokens = output.split('\0');
  const entries: NameStatusEntry[] = [];
  let index = 0;

  while (index < tokens.length) {
    const code = tokens[index++] ?? '';

    if (code === '') continue;

    const isMoved = code.startsWith('R') || code.startsWith('C');
    const previousPath = isMoved ? (tokens[index++] ?? '') : null;
    const path = tokens[index++] ?? '';

    if (path === '') continue;

    entries.push({ path, previousPath, status: toFileStatus(code) });
  }

  return entries;
}

/** @description Parses `git ls-files --others -z` into relative paths. */
export function parseNulSeparated(output: string): string[] {
  return output.split('\0').filter((entry) => entry !== '');
}

/** @description Joins the two views of one diff into the per-file list, sorted by path. */
export function mergeDiffEntries(
  nameStatus: readonly NameStatusEntry[],
  numstat: readonly NumstatEntry[],
): CheckoutDiffFile[] {
  const counts = new Map(numstat.map((entry) => [entry.path, entry]));

  return nameStatus
    .map((entry) => {
      const stat = counts.get(entry.path);

      return {
        additions: stat?.additions ?? 0,
        binary: stat?.binary ?? false,
        deletions: stat?.deletions ?? 0,
        path: entry.path,
        previousPath: entry.previousPath,
        status: entry.status,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** @description Number of lines in a text: a final line without a trailing newline still counts. */
export function countTextLines(text: string): number {
  if (text === '') return 0;

  const newlines = text.split('\n').length - 1;

  return text.endsWith('\n') ? newlines : newlines + 1;
}

/** @description True when the bytes contain a NUL in their first 8 KB, git's own binary heuristic. */
export function looksBinary(bytes: Uint8Array): boolean {
  return bytes.subarray(0, 8192).includes(0);
}

/**
 * @description Whether a client-sent path is a plain relative path with no way out of the checkout:
 * non-empty, no NUL, not absolute, no `..` segment.
 */
export function isSafeRelativePath(path: string): boolean {
  if (path === '' || path.includes('\0')) return false;
  if (path.startsWith('/') || path.startsWith('\\') || /^[a-z]:/iu.test(path)) {
    return false;
  }

  return !path.split(/[\\/]/u).includes('..');
}

/** @description A unified patch for a file git does not track yet, shaped like `git diff` output. */
export function buildAddedFilePatch(path: string, text: string): string {
  const lines = text === '' ? [] : text.replace(/\n$/u, '').split('\n');
  const header = [
    `diff --git a/${path} b/${path}`,
    `new file mode 100644`,
    `--- /dev/null`,
    `+++ b/${path}`,
  ];

  if (lines.length === 0) return `${header.join('\n')}\n`;

  const body = lines.map((line) => `+${line}`);

  return (
    [...header, `@@ -0,0 +1,${lines.length} @@`, ...body].join('\n') + '\n'
  );
}

/** @description Cuts a patch to `maxChars`, on a line boundary, and says whether it cut. */
export function capPatch(patch: string, maxChars: number): CappedPatch {
  if (patch.length <= maxChars) return { patch, truncated: false };

  const cut = patch.slice(0, maxChars);
  const lastBreak = cut.lastIndexOf('\n');

  return {
    patch: lastBreak > 0 ? cut.slice(0, lastBreak + 1) : cut,
    truncated: true,
  };
}

/**
 * @description Base refs to try, best first: what `origin/HEAD` points at (`origin/main`), then the
 * conventional names. Duplicates are dropped.
 */
export function candidateBaseRefs(originHead: string | null): string[] {
  const head = originHead?.trim() ?? '';

  return [...new Set([...(head === '' ? [] : [head]), ...FALLBACK_BASE_REFS])];
}
