import { isRecord } from '@openthrottle/nodejs-utils';
import { parse as parseYamlDocument } from 'yaml';

/**
 * @description Returns YAML frontmatter body between opening and closing `---` delimiters.
 */
export const extractFrontmatterBody = (fileContent: string): string | null => {
  const trimmed = fileContent.trimStart();
  if (!trimmed.startsWith('---')) {
    return null;
  }

  const afterOpen = trimmed.slice(3);
  const closeIndex = afterOpen.search(/\r?\n---(?:\r?\n|$)/);
  if (closeIndex < 0) {
    return null;
  }

  return afterOpen.slice(0, closeIndex);
};

/**
 * @description Returns file content after the closing YAML frontmatter delimiter.
 *
 * Tri-state return contract:
 * - No frontmatter block (content does not start with `---`): returns the
 *   original, unmodified `fileContent` (the whole file is the body).
 * - Well-formed frontmatter (opening `---` and a matching closing `---`):
 *   returns the substring after the closing delimiter (may be an empty string).
 * - Malformed frontmatter (opens with `---` but never closes): returns `null`.
 *
 * Callers must therefore treat `null` as "malformed, do not trust this file"
 * and distinguish it from the no-frontmatter case (a non-null string equal to
 * the original content), not as "no frontmatter".
 */
export const extractContentAfterFrontmatter = (
  fileContent: string,
): string | null => {
  const trimmed = fileContent.trimStart();
  if (!trimmed.startsWith('---')) {
    return fileContent;
  }

  const afterOpen = trimmed.slice(3);
  const closeIndex = afterOpen.search(/\r?\n---(?:\r?\n|$)/);
  if (closeIndex < 0) {
    return null;
  }

  const closeDelimiterMatch = afterOpen
    .slice(closeIndex)
    .match(/^(\r?\n---(?:\r?\n|$))/);

  if (!closeDelimiterMatch) {
    return null;
  }

  return afterOpen.slice(closeIndex + closeDelimiterMatch[0].length);
};

/**
 * @description A single frontmatter value: an absent/`null`-ish key normalizes
 * to `undefined`, a real YAML boolean stays a `boolean`, every other scalar
 * (strings, and numbers coerced via `String()`) stays a `string`, and a
 * sequence of scalars becomes a `readonly string[]`.
 */
export type FrontmatterScalar =
  string | boolean | readonly string[] | undefined;

export interface ParsedYamlFrontmatter {
  readonly fields: Readonly<Record<string, FrontmatterScalar>>;
}

/**
 * Placeholder for constructs outside this dialect (nested maps, sequences
 * containing a map/sequence element, …). Mirrors the retired hand-rolled
 * parser's behavior for the same inputs: a non-throwing but semantically
 * meaningless empty string, rather than the real (unsupported) shape.
 */
const UNSUPPORTED_CONSTRUCT_PLACEHOLDER = '';

const toFrontmatterArray = (
  items: readonly unknown[],
): readonly string[] | string => {
  const values: string[] = [];

  for (const item of items) {
    if (typeof item === 'string') {
      values.push(item);
    } else if (typeof item === 'number' || typeof item === 'boolean') {
      values.push(String(item));
    } else {
      return UNSUPPORTED_CONSTRUCT_PLACEHOLDER;
    }
  }

  return values;
};

const toFrontmatterScalar = (value: unknown): FrontmatterScalar => {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return toFrontmatterArray(value);
  }

  return UNSUPPORTED_CONSTRUCT_PLACEHOLDER;
};

/**
 * @description Parses supported YAML frontmatter keys from markdown/mdc content.
 *
 * Backed by the `yaml` package (YAML 1.2 core schema) rather than a hand-rolled
 * regex parser. Supported shapes, per top-level `key: value` mapping entry:
 *
 * - Scalars: strings and `true`/`false` booleans keep their type; any other
 *   bare scalar (e.g. an unquoted number) is coerced with `String()` so every
 *   non-boolean value stays a `string`, matching the historical contract.
 * - Sequences: block (`- a`) and flow (`[a, b]`) sequences of scalars become a
 *   `readonly string[]` (non-string scalar items are stringified the same way
 *   as a top-level scalar). A sequence containing a nested map or sequence is
 *   treated as an unsupported construct (see below).
 * - Folded (`>`, `>-`) and literal (`|`, `|-`) block scalars are handled
 *   natively by the `yaml` package.
 * - Duplicate top-level keys use last-value-wins (`uniqueKeys: false`) instead
 *   of the strict-YAML default of raising an error.
 * - A key with no value (`key:` alone, or an explicit `null`/`~`) is omitted
 *   from `fields` entirely — absent, not an empty string.
 *
 * Unsupported constructs — nested maps, and sequences containing a non-scalar
 * element — are normalized to an empty string rather than rejected outright,
 * mirroring how the retired parser silently mishandled the same shapes.
 * Malformed YAML (a genuine parse error) yields `{ fields: {} }`, the same as
 * an unterminated frontmatter block.
 *
 * This *does* change behavior at a few real-YAML edges the old regex parser
 * got wrong (see the corpus regression test for the exhaustive comparison):
 * a ` #comment` after a plain scalar is now stripped as a real YAML comment
 * instead of being kept as literal text, and a doubled `''` inside a
 * single-quoted scalar is now unescaped to a literal `'` instead of being
 * kept doubled.
 */
export const parseYamlFrontmatter = (
  fileContent: string,
): ParsedYamlFrontmatter => {
  const body = extractFrontmatterBody(fileContent);
  if (body === null) {
    return { fields: {} };
  }

  let document: unknown;
  try {
    document = parseYamlDocument(body, { uniqueKeys: false });
  } catch {
    return { fields: {} };
  }

  if (!isRecord(document)) {
    return { fields: {} };
  }

  const fields: Record<string, FrontmatterScalar> = {};
  for (const [key, value] of Object.entries(document)) {
    if (value === null || value === undefined) {
      continue;
    }

    fields[key] = toFrontmatterScalar(value);
  }

  return { fields };
};

export interface SplitFrontmatterResult {
  /** The file body with any leading YAML frontmatter block stripped. */
  readonly content: string;
  /** The parsed frontmatter fields; `{}` when there is no usable frontmatter. */
  readonly metadata: Record<string, unknown>;
  /**
   * The original, unmodified input. Consumers that render the stripped `content`
   * but must still round-trip the whole file (e.g. an editor whose save
   * overwrites the file) edit against this instead of losing the frontmatter.
   */
  readonly rawSkill: string;
}

/**
 * @description Splits raw file content into its body and parsed frontmatter in a
 * single, SSR-safe pass (pure JS via the `yaml` package — no `fs`/Buffer/DOM).
 *
 * Combines {@link extractContentAfterFrontmatter} and {@link parseYamlFrontmatter}
 * and collapses the extractor's tri-state body into a guaranteed non-null string:
 *
 * - No frontmatter block: `content` is the original file verbatim, `metadata` is `{}`.
 * - Well-formed frontmatter: `content` is the substring after the closing `---`
 *   (may be `''`), `metadata` is the parsed fields.
 * - Malformed frontmatter (opens `---` but never closes): treated as no usable
 *   frontmatter — `content` is the original file, `metadata` is `{}`. Non-throwing.
 *
 * `metadata` widens the parser's `Record<string, FrontmatterScalar>` to
 * `Record<string, unknown>` (a valid assignment, no cast); values keep the
 * established scalar coercions from {@link parseYamlFrontmatter}. `rawSkill`
 * echoes the untouched input for round-trip/edit consumers.
 */
export const splitFrontmatter = (
  fileContent: string,
): SplitFrontmatterResult => {
  const body = extractContentAfterFrontmatter(fileContent);
  if (body === null) {
    return { content: fileContent, metadata: {}, rawSkill: fileContent };
  }

  const { fields } = parseYamlFrontmatter(fileContent);
  const metadata: Record<string, FrontmatterScalar> = { ...fields };
  return { content: body, metadata, rawSkill: fileContent };
};
