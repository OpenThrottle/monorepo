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
