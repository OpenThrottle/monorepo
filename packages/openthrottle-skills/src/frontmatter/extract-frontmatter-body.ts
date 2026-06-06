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
