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
 * @description Strips leading YAML frontmatter when present (e.g. migrated `.cursor/skills/*\/SKILL.md`).
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

/**
 * @description Reads UTF-8 prompt text from `path` resolved against `cwd`.
 */
export const readRalphPromptFileUtf8 = (
  cwd: string,
  userPath: string,
): string => {
  const absolute = resolve(cwd, userPath.trim());
  const raw = readFileSync(absolute, 'utf8');
  return stripYamlFrontmatter(raw);
};

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
