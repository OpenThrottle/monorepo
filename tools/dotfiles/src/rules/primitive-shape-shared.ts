import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

/**
 * The six canonical section markers, in order. Kept in sync with the generator
 * templates and docs/monorepo/component-primitive-shape.md (R3) and
 * docs/monorepo/hook-primitive-shape.md (H4). A line comment `// Hooks` parses
 * to a comment whose trimmed value is `Hooks`. Shared by the component, hook
 * and route shape rules so they cannot drift.
 */
export const MARKERS: readonly string[] = [
  'Hooks',
  'Setup',
  'Handlers',
  'Markup',
  'Life Cycle',
  '🔌 Short Circuit',
];

/** The message ids a rule must declare to report marker violations. */
export type MarkerMessageId =
  'markerMissingBlankLine' | 'markerOutOfOrder' | 'missingMarker';

export interface ExpectedNameOptions {
  /**
   * Convert a kebab-case basename to camelCase (`use-foo-bar` → `useFooBar`).
   * Hooks compare against the camelCased name so a kebab file is reported by
   * the audit (H6) rather than double-reported by H1.
   */
  readonly camelCase?: boolean;
}

/** `use-foo-bar` → `useFooBar`; names without a hyphen are returned as-is. */
const toCamelCase = (name: string): string =>
  name.replace(/-+([a-zA-Z0-9])/g, (_match, char: string) =>
    char.toUpperCase(),
  );

/**
 * Derives the expected component/hook name from the file path: the basename
 * without extension, or the parent directory when the file is an `index`.
 */
export const expectedName = (
  filename: string,
  options: ExpectedNameOptions = {},
): string => {
  const parts = filename.split('/');
  const base = (parts[parts.length - 1] ?? '').replace(/\.tsx?$/, '');
  const name =
    base === 'index' && parts.length >= 2
      ? (parts[parts.length - 2] ?? base)
      : base;
  return options.camelCase === true ? toCamelCase(name) : name;
};

/**
 * The six markers, in order, each preceded by one blank line (component R3 /
 * hook H4). Returns the violations of a single function body as report
 * descriptors; each rule reports them under its own message text. A scaffold
 * fix for the full marker block is only offered when `allowScaffold` and the
 * body has no markers at all — inserting into a partially-marked body risks the
 * wrong placement — and only once (on the first missing marker) so the fixes
 * don't overlap.
 */
export const collectMarkerViolations = (
  sourceCode: Readonly<TSESLint.SourceCode>,
  body: TSESTree.BlockStatement,
  allowScaffold: boolean,
): readonly TSESLint.ReportDescriptor<MarkerMessageId>[] => {
  const descriptors: TSESLint.ReportDescriptor<MarkerMessageId>[] = [];

  const markerComments = sourceCode
    .getCommentsInside(body)
    .filter((c) => c.type === 'Line' && MARKERS.includes(c.value.trim()));
  const found = markerComments.map((c) => c.value.trim());

  const openBrace = sourceCode.getFirstToken(body);
  const braceLine = openBrace === null ? 0 : openBrace.loc.end.line;

  const missing = MARKERS.filter((m) => !found.includes(m));
  for (const marker of missing) {
    descriptors.push({
      data: { marker },
      fix:
        allowScaffold &&
        found.length === 0 &&
        marker === missing[0] &&
        openBrace !== null
          ? (fixer) => {
              const markerBlock = MARKERS.map((m) => `  // ${m}`).join('\n\n');
              return fixer.insertTextAfter(openBrace, `\n${markerBlock}\n`);
            }
          : undefined,
      messageId: 'missingMarker',
      node: body,
    });
  }

  // Order: the markers that ARE present must appear in canonical order.
  const expectedPresent = MARKERS.filter((m) => found.includes(m));
  if (found.length > 0 && found.join('|') !== expectedPresent.join('|')) {
    descriptors.push({
      data: { order: MARKERS.map((m) => `// ${m}`).join(', ') },
      messageId: 'markerOutOfOrder',
      node: body,
    });
  }

  // Whitespace: one blank line before each present marker — except a marker
  // that is the first line of the body (directly after `{`).
  const lines = sourceCode.lines;
  for (const comment of markerComments) {
    const line = comment.loc.start.line;
    if (line === braceLine + 1) continue;
    const above = (line >= 2 ? lines[line - 2] : '') ?? '';
    if (above.trim() !== '') {
      descriptors.push({
        data: { marker: comment.value.trim() },
        messageId: 'markerMissingBlankLine',
        node: comment,
      });
    }
  }

  return descriptors;
};
