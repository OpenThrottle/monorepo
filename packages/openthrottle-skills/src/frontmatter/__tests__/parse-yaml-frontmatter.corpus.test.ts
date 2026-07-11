// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { extractFrontmatterBody } from '../extract-frontmatter-body.js';
import { parseYamlFrontmatter } from '../parse-yaml-frontmatter.js';

/**
 * Corpus-verified, not generically behavior-preserving (see
 * docs/monorepo/skill-availability-design.md, "Tags"): the `yaml` package
 * differs from the retired hand-rolled parser on edge cases the old parser's
 * own docstring documented (trailing comments, quote escapes, block-scalar
 * chomping). This test freezes a byte-for-byte copy of the *retired* parser
 * logic as a reference implementation, runs it against every file in the
 * actual current `.agents/` corpus alongside the new parser, and asserts the
 * two agree — except for a short, explicit, named list of divergences that
 * were found by running this exact comparison and are intentional per the
 * design doc (see KNOWN_CONTENT_DIVERGENCES below). Each is asserted as a
 * precise, content-derived relationship (not a hardcoded copy of the corpus
 * text) so the test still fails loudly if the actual relationship ever
 * changes. Any *other* divergence — anywhere else in the corpus — also fails
 * the test loudly, rather than being silently absorbed.
 */

const monorepoRoot = join(import.meta.dirname, '../../../../..');

// ---------------------------------------------------------------------------
// FROZEN REFERENCE: byte-for-byte copy of the retired hand-rolled parser from
// parse-yaml-frontmatter.ts as it existed before this migration. Do not "fix"
// or improve this copy — its entire purpose is to reproduce the old,
// pre-migration behavior for comparison. `extractFrontmatterBody` itself is
// unchanged by this migration, so it is imported live rather than duplicated.
// ---------------------------------------------------------------------------

type OldFrontmatterScalar = string | boolean | undefined;

const oldParseScalarValue = (rest: string): string | undefined => {
  const trimmed = rest.trim();
  if (!trimmed) {
    return undefined;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const oldParseBooleanScalar = (
  value: string | undefined,
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return undefined;
};

const oldIsBlockContinuationLine = (line: string): boolean =>
  line.trim() === '' || /^\s{2,}/.test(line);

const oldStripBlockIndent = (line: string): string =>
  line.replace(/^\s{2,}/, '');

const oldParseIndentedBlock = (
  lines: readonly string[],
  startIndex: number,
  joinWith: 'space' | 'newline',
): { readonly nextIndex: number; readonly value: string } => {
  const parts: string[] = [];
  let index = startIndex;

  while (
    index < lines.length &&
    oldIsBlockContinuationLine(lines[index] ?? '')
  ) {
    const line = lines[index] ?? '';
    if (line.trim() === '') {
      parts.push('');
    } else {
      parts.push(oldStripBlockIndent(line));
    }
    index += 1;
  }

  if (joinWith === 'newline') {
    return { nextIndex: index, value: parts.join('\n').trim() };
  }

  let result = '';
  for (const part of parts) {
    if (part === '') {
      result = `${result.trimEnd()}\n\n`;
    } else if (result === '') {
      result = part;
    } else {
      result = `${result.trimEnd()} ${part}`;
    }
  }

  return { nextIndex: index, value: result.trim() };
};

const oldParseKeyLine = (
  line: string,
): { readonly key: string; readonly rest: string } | null => {
  const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
  if (!match) {
    return null;
  }

  return {
    key: match[1] ?? '',
    rest: match[2] ?? '',
  };
};

const oldParseYamlFrontmatter = (
  fileContent: string,
): { readonly fields: Readonly<Record<string, OldFrontmatterScalar>> } => {
  const body = extractFrontmatterBody(fileContent);
  if (body === null) {
    return { fields: {} };
  }

  const lines = body.split(/\r?\n/);
  const fields: Record<string, OldFrontmatterScalar> = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const parsedKey = oldParseKeyLine(line);
    if (!parsedKey) {
      index += 1;
      continue;
    }

    const { key, rest } = parsedKey;

    if (/^>-?\s*$/.test(rest)) {
      const block = oldParseIndentedBlock(lines, index + 1, 'space');
      fields[key] = block.value;
      index = block.nextIndex;
      continue;
    }

    if (/^\|-?\s*$/.test(rest)) {
      const block = oldParseIndentedBlock(lines, index + 1, 'newline');
      fields[key] = block.value;
      index = block.nextIndex;
      continue;
    }

    const scalar = oldParseScalarValue(rest);
    const booleanValue = oldParseBooleanScalar(scalar);
    fields[key] = booleanValue ?? scalar ?? '';
    index += 1;
  }

  return { fields };
};

// ---------------------------------------------------------------------------
// Corpus walk: the real `.agents/skills/*/SKILL.md`, `.agents/rules/**/*.mdc`,
// and `.agents/personas/*.md` files, per the design doc's stated scope.
// ---------------------------------------------------------------------------

const listSkillFiles = (): string[] => {
  const skillsRoot = join(monorepoRoot, '.agents/skills');
  const files: string[] = [];
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillMd = join(skillsRoot, entry.name, 'SKILL.md');
    try {
      readFileSync(skillMd, 'utf8');
      files.push(skillMd);
    } catch {
      // No SKILL.md in this directory; not part of the corpus.
    }
  }
  return files;
};

const listRuleFiles = (): string[] => {
  const rulesRoot = join(monorepoRoot, '.agents/rules');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.mdc')) {
        files.push(full);
      }
    }
  };
  walk(rulesRoot);
  return files;
};

const listPersonaFiles = (): string[] => {
  const personasRoot = join(monorepoRoot, '.agents/personas');
  const files: string[] = [];
  for (const entry of readdirSync(personasRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(join(personasRoot, entry.name));
    }
  }
  return files;
};

const corpusFiles = [
  ...listSkillFiles(),
  ...listRuleFiles(),
  ...listPersonaFiles(),
];

const toRepoRelativePath = (absolutePath: string): string =>
  absolutePath
    .slice(monorepoRoot.length + 1)
    .split('\\')
    .join('/');

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected a string frontmatter value, got ${typeof value}`);
  }
}

interface KnownDivergence {
  /** Asserts the exact, content-derived relationship between old and new. */
  readonly assertRelationship: (oldValue: unknown, newValue: unknown) => void;
  readonly field: string;
  readonly path: string;
}

/**
 * Explicit, named divergences discovered by running this exact comparison
 * across the real corpus. Each corresponds to one of the real-YAML-edge
 * categories the design doc calls out ("trailing comments", "quote
 * escapes") plus block-scalar chomping — genuine content in these three
 * files trips a real difference between the retired regex parser and real
 * YAML semantics. Each assertion derives the expected relationship from the
 * *actual* parsed values rather than a hardcoded copy of the corpus text, so
 * it keeps verifying the true cause of the divergence even if the corpus
 * file's wording changes later. Any divergence *not* listed here fails the
 * test loudly instead of being silently absorbed.
 */
const KNOWN_CONTENT_DIVERGENCES: readonly KnownDivergence[] = [
  // NOTE: `.agents/skills/github-squash/SKILL.md` used to diverge here (real
  // YAML treats ` #` in a plain scalar as a comment start, truncating its
  // `Closes #123` example; the retired parser kept the text verbatim). That
  // was real content loss, so the corpus file's description is now
  // single-quoted at the source and both parsers agree — any plain-scalar
  // ` #` introduced in future frontmatter will fail this suite loudly, which
  // is the correct prompt to quote the field.
  {
    // The retired parser stripped only the outer quotes of a single-quoted
    // scalar, leaving a doubled `''` YAML escape sequence in the middle of
    // the string; the `yaml` package correctly unescapes it to a literal
    // `'`. So replacing the first `''` in the old value with `'` yields
    // exactly the new value.
    assertRelationship: (oldValue, newValue) => {
      assertIsString(oldValue);
      assertIsString(newValue);
      expect(oldValue.includes("''")).toBe(true);
      expect(oldValue.replace("''", "'")).toBe(newValue);
    },
    field: 'description',
    path: '.agents/skills/link-workspace-packages/SKILL.md',
  },
  {
    // This file's description uses a *clip*-chomped folded block scalar
    // (`>`, not `>-`): real YAML keeps exactly one trailing newline, while
    // the retired parser always `.trim()`ed the assembled block regardless
    // of the chomping indicator. So the new value is exactly the old value
    // plus one trailing `\n`.
    assertRelationship: (oldValue, newValue) => {
      assertIsString(oldValue);
      assertIsString(newValue);
      expect(`${oldValue}\n`).toBe(newValue);
    },
    field: 'description',
    path: '.agents/skills/brag-sheet/SKILL.md',
  },
];

/**
 * The retired parser represented "no value" (a bare `key:` with nothing
 * after it) as an empty string; the new parser represents it as an absent
 * key (`undefined`), per this migration's tri-state contract (absent /
 * boolean / string). Every downstream consumer already normalizes an empty
 * string the same way it normalizes `undefined` (see `toOptionalString` in
 * `parse-skill-frontmatter.ts` and friends), so this is a deliberate,
 * documented representational change, not a content difference. Fold it away
 * before comparing so the assertion is about real content, not this known
 * shape change. Because this drops '' independently on each side, a real
 * asymmetric difference (one side '', the other side a real value) still
 * surfaces as a mismatch below.
 */
const normalizeForComparison = (
  fields: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === '') {
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
};

describe('parseYamlFrontmatter corpus regression', () => {
  test('the current .agents corpus is non-empty (sanity check for the walk itself)', () => {
    expect(corpusFiles.length).toBeGreaterThan(40);
  });

  test('every known divergence is exercised by at least one corpus file', () => {
    // Guards against the allowlist going stale (e.g. a referenced file is
    // renamed/deleted) by requiring every entry to actually match a walked
    // corpus path.
    const walkedPaths = new Set(corpusFiles.map(toRepoRelativePath));
    for (const divergence of KNOWN_CONTENT_DIVERGENCES) {
      expect(walkedPaths.has(divergence.path)).toBe(true);
    }
  });

  test.each(corpusFiles.map((file) => [toRepoRelativePath(file), file]))(
    '%s parses identically to the retired parser (modulo known divergences)',
    (relativePath, absolutePath) => {
      const content = readFileSync(absolutePath, 'utf8');
      const oldFields = oldParseYamlFrontmatter(content).fields;
      const newFields = parseYamlFrontmatter(content).fields;

      const divergences = KNOWN_CONTENT_DIVERGENCES.filter(
        (divergence) => divergence.path === relativePath,
      );

      const oldForComparison = normalizeForComparison(oldFields);
      const newForComparison = normalizeForComparison(newFields);

      for (const divergence of divergences) {
        divergence.assertRelationship(
          oldFields[divergence.field],
          newFields[divergence.field],
        );
        delete oldForComparison[divergence.field];
        delete newForComparison[divergence.field];
      }

      expect(newForComparison).toEqual(oldForComparison);
    },
  );
});
