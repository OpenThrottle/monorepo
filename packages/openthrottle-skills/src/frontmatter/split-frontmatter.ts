import type { FrontmatterScalar } from './parse-yaml-frontmatter.ts';

import { extractContentAfterFrontmatter } from './extract-frontmatter-body.ts';
import { parseYamlFrontmatter } from './parse-yaml-frontmatter.ts';

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
