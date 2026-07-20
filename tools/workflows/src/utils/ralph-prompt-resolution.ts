/**
 * @description Layer 1 — resolves Ralph prompt text from named profiles, file paths, or stdin.
 * Keeps canonical command files addressable via `--prompt-file` without copying content into code.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RalphRuntimeSeed } from './ralph-runtime-config';

/** How the effective prompt string was obtained (for logging / `--help` semantics). */
export type RalphPromptProfileKind = 'named' | 'file' | 'stdin';

interface ResolvedRalphPromptProfile {
  readonly prompt: string;
  readonly promptProfileKind: RalphPromptProfileKind;
  /** Short label for logs: command-style path, absolute file path, or `stdin`. */
  readonly promptProfileLabel: string;
}

/**
 * @description Strips leading YAML frontmatter when present (e.g. `.agents/skills/*\/SKILL.md`).
 */
export const stripYamlFrontmatter = (content: string): string => {
  if (!content.startsWith('---\n')) {
    return content;
  }
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return content;
  }
  return content.slice(end + 5);
};

/** Separator between concatenated `--prompt-file` bodies (order preserved). */
export const RALPH_PROMPT_FILE_SEPARATOR = '\n\n';

/**
 * @description Reads UTF-8 prompt text from `path` resolved against `cwd`.
 */
export const readRalphPromptFileUtf8 = (
  cwd: string,
  userPath: string,
): string => {
  const absolute = resolve(cwd, userPath.trim());
  const raw = readFileSync(absolute, 'utf8');
  return stripYamlFrontmatter(raw).trimStart();
};

/**
 * @description Reads multiple prompt files in order; strips YAML frontmatter from each.
 */
export const readRalphPromptFilesUtf8 = (
  cwd: string,
  userPaths: readonly string[],
): string => {
  if (userPaths.length === 0) {
    throw new Error('--prompt-file requires at least one non-empty path');
  }

  const bodies = userPaths.map((userPath) => {
    const trimmed = userPath.trim();
    if (trimmed === '') {
      throw new Error('--prompt-file requires a non-empty path');
    }
    return readRalphPromptFileUtf8(cwd, trimmed).trim();
  });

  return bodies.filter((body) => body !== '').join(RALPH_PROMPT_FILE_SEPARATOR);
};

/**
 * @description Log label for one or more `--prompt-file` paths (absolute, comma-separated when multiple).
 */
export const formatRalphPromptFileProfileLabel = (
  cwd: string,
  userPaths: readonly string[],
): string =>
  userPaths.map((userPath) => resolve(cwd, userPath.trim())).join(', ');

/**
 * @description Reads the entire stdin stream as UTF-8 (fd 0). Use only when stdin is not a TTY.
 */
export const readRalphPromptStdinUtf8 = (): string => readFileSync(0, 'utf8');

/**
 * @description Applies seed defaults: optional `promptFile` (read contents) or named `prompt`.
 */
export const resolveRalphPromptFromSeed = (
  cwd: string,
  seed: RalphRuntimeSeed,
): ResolvedRalphPromptProfile => {
  const rawPath = seed.promptFile?.trim();
  if (rawPath !== undefined && rawPath !== '') {
    const absolute = resolve(cwd, rawPath);
    const prompt = readRalphPromptFileUtf8(cwd, rawPath);
    return {
      prompt,
      promptProfileKind: 'file',
      promptProfileLabel: absolute,
    };
  }
  return {
    prompt: seed.prompt,
    promptProfileKind: 'named',
    promptProfileLabel: seed.prompt,
  };
};
