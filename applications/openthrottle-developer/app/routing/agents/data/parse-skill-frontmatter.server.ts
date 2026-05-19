/**
 * @description Parses `name` and `description` from SKILL.md YAML frontmatter.
 * Supports inline scalars and folded (`>-`) / literal (`|-`) multiline blocks.
 */
export interface SkillFrontmatter {
  readonly name: string | undefined;
  readonly description: string | undefined;
}

const extractFrontmatterBody = (fileContent: string): string | null => {
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

const isBlockContinuationLine = (line: string): boolean =>
  line.trim() === '' || /^\s{2,}/.test(line);

const stripBlockIndent = (line: string): string => line.replace(/^\s{2,}/, '');

const parseIndentedBlock = (
  lines: readonly string[],
  startIndex: number,
  joinWith: 'space' | 'newline',
): { readonly value: string; readonly nextIndex: number } => {
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

const parseFrontmatterBody = (body: string): SkillFrontmatter => {
  const lines = body.split(/\r?\n/);
  let name: string | undefined;
  let description: string | undefined;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (line.startsWith('name:')) {
      name = parseScalarValue(line.slice('name:'.length));
      index += 1;
      continue;
    }

    if (/^description:\s*>-?\s*$/.test(line)) {
      const block = parseIndentedBlock(lines, index + 1, 'space');
      description = block.value;
      index = block.nextIndex;
      continue;
    }

    if (/^description:\s*\|-?\s*$/.test(line)) {
      const block = parseIndentedBlock(lines, index + 1, 'newline');
      description = block.value;
      index = block.nextIndex;
      continue;
    }

    if (line.startsWith('description:')) {
      description = parseScalarValue(line.slice('description:'.length));
      index += 1;
      continue;
    }

    index += 1;
  }

  return { description, name };
};

/**
 * @description Returns frontmatter `name` and `description` when a `---` block is present.
 */
export const parseSkillFrontmatter = (
  fileContent: string,
): SkillFrontmatter => {
  const body = extractFrontmatterBody(fileContent);
  if (body === null) {
    return { description: undefined, name: undefined };
  }

  return parseFrontmatterBody(body);
};
