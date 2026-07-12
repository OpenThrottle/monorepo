import { parse as parseYamlDocument } from 'yaml';

import { extractFrontmatterBody } from './extract-frontmatter-body.ts';

/**
 * @description A single frontmatter value: an absent/`null`-ish key normalizes
 * to `undefined`, a real YAML boolean stays a `boolean`, every other scalar
 * (strings, and numbers coerced via `String()`) stays a `string`, and a
 * sequence of scalars becomes a `readonly string[]`.
 */
export type FrontmatterScalar =
  | string
  | boolean
  | readonly string[]
  | undefined;

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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  if (!isPlainRecord(document)) {
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
