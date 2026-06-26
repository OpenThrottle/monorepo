import { extractFrontmatterBody } from './extract-frontmatter-body.ts';

export type FrontmatterScalar = string | boolean | undefined;

export interface ParsedYamlFrontmatter {
  readonly fields: Readonly<Record<string, FrontmatterScalar>>;
}

const parseScalarValue = (rest: string): string | undefined => {
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

const parseBooleanScalar = (value: string | undefined): boolean | undefined => {
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

const isBlockContinuationLine = (line: string): boolean =>
  line.trim() === '' || /^\s{2,}/.test(line);

const stripBlockIndent = (line: string): string => line.replace(/^\s{2,}/, '');

const parseIndentedBlock = (
  lines: readonly string[],
  startIndex: number,
  joinWith: 'space' | 'newline',
): { readonly nextIndex: number; readonly value: string } => {
  const parts: string[] = [];
  let index = startIndex;

  while (index < lines.length && isBlockContinuationLine(lines[index] ?? '')) {
    const line = lines[index] ?? '';
    if (line.trim() === '') {
      parts.push('');
    } else {
      parts.push(stripBlockIndent(line));
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

const parseKeyLine = (
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

/**
 * @description Parses supported YAML frontmatter keys from markdown/mdc content.
 *
 * This is a deliberately minimal parser for the constrained agent-asset
 * frontmatter dialect — NOT a general-purpose YAML implementation. Only the
 * following subset is understood:
 *
 * - Top-level `key: scalar` pairs (no nesting; keys match `[A-Za-z0-9_-]+`).
 * - Single- or double-quoted scalars (the surrounding quotes are stripped, but
 *   escapes and embedded same-quote characters are not interpreted).
 * - `true` / `false` literals, coerced to booleans (case-insensitive).
 * - Folded block scalars introduced by `>` or `>-` (joined with spaces).
 * - Literal block scalars introduced by `|` or `|-` (joined with newlines).
 *   Continuation lines are any blank line or any line indented by >= 2 spaces.
 *
 * Anything outside this subset is mishandled rather than rejected, producing a
 * wrong-but-non-failing value. Known unsupported constructs include: flow
 * scalars and inline lists/maps (`[a, b]`, `{a: 1}`), explicit chomping or
 * indentation indicators on block scalars (`>2`, `|+`), trailing comments after
 * a value (`name: foo # bar` keeps `# bar`), and YAML truthy/falsy aliases
 * other than `true`/`false` (`yes`, `no`, `on`, `off`) — those stay strings.
 *
 * If asset authors hit these surprises, migrate to the `yaml` package behind
 * this same interface rather than extending the hand-rolled parser.
 */
export const parseYamlFrontmatter = (
  fileContent: string,
): ParsedYamlFrontmatter => {
  const body = extractFrontmatterBody(fileContent);
  if (body === null) {
    return { fields: {} };
  }

  const lines = body.split(/\r?\n/);
  const fields: Record<string, FrontmatterScalar> = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const parsedKey = parseKeyLine(line);
    if (!parsedKey) {
      index += 1;
      continue;
    }

    const { key, rest } = parsedKey;

    if (/^>-?\s*$/.test(rest)) {
      const block = parseIndentedBlock(lines, index + 1, 'space');
      fields[key] = block.value;
      index = block.nextIndex;
      continue;
    }

    if (/^\|-?\s*$/.test(rest)) {
      const block = parseIndentedBlock(lines, index + 1, 'newline');
      fields[key] = block.value;
      index = block.nextIndex;
      continue;
    }

    const scalar = parseScalarValue(rest);
    const booleanValue = parseBooleanScalar(scalar);
    fields[key] = booleanValue ?? scalar ?? '';
    index += 1;
  }

  return { fields };
};
