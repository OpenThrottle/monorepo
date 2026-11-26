import type { DiffLineKind } from '../data/diff-view';

/** Headers git prints before the first hunk of a file. */
const META_PREFIXES = [
  'diff --git ',
  'index ',
  'new file mode',
  'deleted file mode',
  'old mode',
  'new mode',
  'similarity index',
  'rename from',
  'rename to',
  'Binary files',
  '\\ No newline',
] as const;

/**
 * @description Classifies one line of a unified patch. `+++`/`---` file headers are `meta` (only
 * before the first hunk header would they be ambiguous with an added or removed line that starts
 * with `++` or `--`, so callers pass whether a hunk has started).
 */
export const classifyDiffLine = (
  line: string,
  isInsideHunk: boolean,
): DiffLineKind => {
  if (line.startsWith('@@')) {
    return 'hunk';
  }

  if (!isInsideHunk) {
    const isHeader =
      line.startsWith('+++') ||
      line.startsWith('---') ||
      META_PREFIXES.some((prefix) => line.startsWith(prefix));

    return isHeader ? 'meta' : 'context';
  }

  if (line.startsWith('\\')) {
    return 'meta';
  }
  if (line.startsWith('+')) {
    return 'add';
  }
  if (line.startsWith('-')) {
    return 'remove';
  }

  return 'context';
};

/** A patch line with its resolved kind. */
export interface ClassifiedDiffLine {
  readonly kind: DiffLineKind;
  readonly text: string;
}

/**
 * @description Splits a patch into lines and classifies each. A trailing newline does not add an
 * empty last line; the first `@@` flips the parser into hunk mode for the rest of that file, and a
 * following `diff --git` flips it back.
 */
export const classifyDiffLines = (
  patch: string,
): readonly ClassifiedDiffLine[] => {
  if (patch === '') {
    return [];
  }

  const lines = patch.replace(/\n$/, '').split('\n');
  let isInsideHunk = false;

  return lines.map((text) => {
    if (text.startsWith('diff --git ')) {
      isInsideHunk = false;
    }
    const kind = classifyDiffLine(text, isInsideHunk);
    if (kind === 'hunk') {
      isInsideHunk = true;
    }

    return { kind, text };
  });
};
