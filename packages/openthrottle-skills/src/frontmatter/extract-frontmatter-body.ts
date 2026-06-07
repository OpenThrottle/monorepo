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
 * When no frontmatter block is present, returns the original file content.
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
