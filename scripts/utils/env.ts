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
