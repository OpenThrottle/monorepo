import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { toErrorMessage } from '@openthrottle/nodejs-utils';

import { SOCIAL_ENV_MANAGED_MARKER } from '../config/x-api.ts';
import type { Result } from '../types/social-post.ts';

const ENV_LINE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/u;

const unquote = (raw: string): string => {
  const value = raw.trim();
  const isQuoted =
    value.length >= 2 &&
    (value.startsWith('"') || value.startsWith("'")) &&
    value.endsWith(value[0] ?? '');

  return isQuoted ? value.slice(1, -1) : value;
};

const parseLine = (
  line: string,
): { readonly key: string; readonly value: string } | undefined => {
  if (line.trim().startsWith('#')) {
    return undefined;
  }

  const match = ENV_LINE.exec(line);

  if (match === null || match[1] === undefined) {
    return undefined;
  }

  return { key: match[1], value: unquote(match[2] ?? '') };
};

/**
 * @description The user-global env file, `~/.openthrottle/.env`, resolved per call so a test or a
 * job that sets `$HOME` is honoured. The same file openthrottle-server and the hooks read.
 * @public
 */
export const getUserEnvPath = (): string => {
  return join(homedir(), '.openthrottle', '.env');
};

/**
 * @description The file's `KEY=value` assignments. A missing file is an empty map; a later line
 * wins over an earlier one, as it does for every other reader of this file.
 * @public
 */
export const readEnvValues = async (
  envPath: string,
): Promise<Result<Readonly<Record<string, string>>, string>> => {
  let text: string;

  try {
    text = await readFile(envPath, 'utf8');
  } catch (error) {
    const isMissing =
      error instanceof Error && 'code' in error && error.code === 'ENOENT';

    return isMissing
      ? { ok: true, value: {} }
      : { error: toErrorMessage(error), ok: false };
  }

  const values: Record<string, string> = {};

  for (const line of text.split('\n')) {
    const assignment = parseLine(line);

    if (assignment !== undefined) {
      values[assignment.key] = assignment.value;
    }
  }

  return { ok: true, value: values };
};

const applyUpdates = (
  lines: readonly string[],
  updates: Readonly<Record<string, string>>,
): string[] => {
  const next = [...lines];
  const pending = new Set(Object.keys(updates));

  for (const [index, line] of next.entries()) {
    const assignment = parseLine(line);
    const value =
      assignment === undefined ? undefined : updates[assignment.key];

    if (assignment !== undefined && value !== undefined) {
      next[index] = `${assignment.key}=${value}`;
      pending.delete(assignment.key);
    }
  }

  while (next.at(-1) === '') {
    next.pop();
  }

  const appended = [...pending].sort().flatMap((key) => {
    return [SOCIAL_ENV_MANAGED_MARKER, `${key}=${updates[key] ?? ''}`];
  });
  const separator = appended.length > 0 && next.length > 0 ? [''] : [];

  return [...next, ...separator, ...appended, ''];
};

/**
 * @description Set `updates` in the env file and leave every other line as it was. A key already
 * assigned is rewritten in place (every assignment of it, so no stale copy outranks the new value);
 * a new key is appended under {@link SOCIAL_ENV_MANAGED_MARKER}.
 *
 * Atomic: the new content is written to a sibling temp file at mode 600 and renamed over the
 * original, so a crash mid-write never leaves a truncated file. That matters most for a rotated
 * refresh token: X has already invalidated the old one, and losing the new one locks the account
 * out until the setup command is run again.
 * @public
 */
export const upsertEnvValues = async (
  envPath: string,
  updates: Readonly<Record<string, string>>,
): Promise<Result<undefined, string>> => {
  let original = '';

  try {
    original = await readFile(envPath, 'utf8');
  } catch (error) {
    const isMissing =
      error instanceof Error && 'code' in error && error.code === 'ENOENT';

    if (!isMissing) {
      return { error: toErrorMessage(error), ok: false };
    }
  }

  const lines = original === '' ? [] : original.split('\n');
  const content = applyUpdates(lines, updates).join('\n');
  const tempPath = `${envPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;

  try {
    await mkdir(dirname(envPath), { mode: 0o700, recursive: true });
    await writeFile(tempPath, content, { mode: 0o600 });
    await rename(tempPath, envPath);
  } catch (error) {
    await rm(tempPath, { force: true });

    return { error: toErrorMessage(error), ok: false };
  }

  return { ok: true, value: undefined };
};
