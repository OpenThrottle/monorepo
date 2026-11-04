/**
 * @description Read KEY=VALUE .env files without mutating process.env — the
 * typed replacement for the `get_env() { grep | tail -1 | cut | tr -d '"' }`
 * idiom copied across the shell scripts. Later assignments win (matching the
 * shell `tail -1` semantics), quotes are stripped, and a missing file reads as
 * an empty map so callers can fall back to defaults.
 */
import { readFileSync } from 'node:fs';

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/**
 * Parse .env file contents into a map. Supports comments, blank lines, an
 * optional `export ` prefix, and single/double-quoted values. Lines without
 * an `=` are ignored. Duplicate keys: the last assignment wins.
 */
export const parseEnvContents = (contents: string): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const assignment = line.startsWith('export ') ? line.slice(7) : line;
    const separator = assignment.indexOf('=');

    if (separator <= 0) {
      continue;
    }

    const key = assignment.slice(0, separator).trim();
    let value = assignment.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
};

/**
 * Read and parse a .env file. A missing file returns `{}` (matching the shell
 * scripts' `|| true`); any other read error propagates.
 */
export const readEnvFile = (filePath: string): Record<string, string> => {
  try {
    return parseEnvContents(readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
};

/**
 * Convenience: one key from a .env file with a fallback — the direct
 * `get_env KEY` + `${VAR:-default}` replacement.
 */
export const readEnvValue = (
  filePath: string,
  key: string,
  fallback = '',
): string => {
  const value = readEnvFile(filePath)[key];

  return value === undefined || value === '' ? fallback : value;
};

/** First `KEY=value` match in raw .env contents (the shell's `sed | head -n1`). */
export const firstEnvMatch = (
  contents: string,
  key: string,
): string | undefined => {
  for (const line of contents.split('\n')) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1);
    }
  }

  return undefined;
};

/** Replace the `KEY=...` line, or append one when the key is absent. */
export const upsertEnvLine = (
  contents: string,
  key: string,
  value: string,
): string => {
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(contents)) {
    return contents.replace(pattern, `${key}=${value}`);
  }

  const separator = contents === '' || contents.endsWith('\n') ? '' : '\n';

  return `${contents}${separator}${key}=${value}\n`;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assignmentPattern = (key: string): RegExp =>
  new RegExp(
    `^${escapeRegExp(key)}=("[^"\\n]*"|'[^'\\n]*'|[^\\s#]*)(\\s+#.*)?$`,
    'm',
  );

/**
 * Rewrite an existing `KEY` from its current (unquoted) value, keeping the
 * line's quote style and trailing `# comment` (the shipped .env.default values
 * are quoted and annotated). Returns `contents` unchanged when the key is
 * absent or its line has an unrecognised shape. Only the first assignment is
 * touched.
 */
export const updateEnvValue = (
  contents: string,
  key: string,
  update: (current: string) => string,
): string => {
  const pattern = assignmentPattern(key);
  const match = pattern.exec(contents);

  if (match === null) {
    return contents;
  }

  const raw = match[1] ?? '';
  const quote = /^["']/.exec(raw)?.[0] ?? '';
  const current = quote === '' ? raw : raw.slice(1, -1);

  return contents.replace(
    pattern,
    () => `${key}=${quote}${update(current)}${quote}${match[2] ?? ''}`,
  );
};

/**
 * Set `KEY` to `value` (see {@link updateEnvValue} for what is preserved), or
 * append `KEY=value` when the key is absent or its line has an unrecognised
 * shape.
 */
export const setEnvValue = (
  contents: string,
  key: string,
  value: string,
): string => {
  const updated = updateEnvValue(contents, key, () => value);

  return updated === contents && firstEnvMatch(contents, key) === undefined
    ? upsertEnvLine(contents, key, value)
    : updated;
};
