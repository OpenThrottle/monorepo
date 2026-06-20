/**
 * @description Tests for {@link resolveRalphPromptFromSeed} and file helpers.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RALPH_RUNNER } from '../ralph-execution-backend';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from '../ralph-runtime-config';
import {
  formatRalphPromptFileProfileLabel,
  readRalphPromptFileUtf8,
  readRalphPromptFilesUtf8,
  resolveRalphPromptFromSeed,
} from '../ralph-prompt-resolution';

describe('resolveRalphPromptFromSeed', () => {
  it('returns named profile when promptFile is absent', () => {
    const r = resolveRalphPromptFromSeed('/repo', {
      backend: DEFAULT_RALPH_RUNNER,
      iterationTimeoutMs: undefined,
      iterations: DEFAULT_RALPH_ITERATIONS,
      model: DEFAULT_RALPH_MODEL,
      project: undefined,
      prompt: '/agents/seo',
      promptFile: undefined,
      skipWorktreeSetup: undefined,
      taskIterations: undefined,
      worktree: undefined,
      worktreeBase: undefined,
    });
    expect(r.promptProfileKind).toBe('named');
    expect(r.prompt).toBe('/agents/seo');
    expect(r.promptProfileLabel).toBe('/agents/seo');
  });

  it('reads file contents when promptFile is set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      const filePath = join(dir, 'custom.md');
      writeFileSync(filePath, 'Hello from file\n', 'utf8');
      const r = resolveRalphPromptFromSeed(dir, {
        backend: DEFAULT_RALPH_RUNNER,
        iterationTimeoutMs: undefined,
        iterations: DEFAULT_RALPH_ITERATIONS,
        model: DEFAULT_RALPH_MODEL,
        project: undefined,
        prompt: DEFAULT_RALPH_PROMPT,
        promptFile: 'custom.md',
        skipWorktreeSetup: undefined,
        taskIterations: undefined,
        worktree: undefined,
        worktreeBase: undefined,
      });
      expect(r.promptProfileKind).toBe('file');
      expect(r.prompt).toBe('Hello from file\n');
      expect(r.promptProfileLabel).toBe(filePath);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('readRalphPromptFileUtf8', () => {
  it('returns UTF-8 contents', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      writeFileSync(join(dir, 'x.md'), 'abc', 'utf8');
      expect(readRalphPromptFileUtf8(dir, 'x.md')).toBe('abc');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('strips YAML frontmatter from skill-style files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      writeFileSync(
        join(dir, 'skill.md'),
        '---\nname: agents-ralph\ndescription: x\n---\n\n# Instructions\n\nBody\n',
        'utf8',
      );
      expect(readRalphPromptFileUtf8(dir, 'skill.md')).toBe(
        '# Instructions\n\nBody\n',
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('readRalphPromptFilesUtf8', () => {
  it('concatenates multiple files with frontmatter stripped', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      writeFileSync(join(dir, 'a.md'), '---\nname: a\n---\n\nFirst\n', 'utf8');
      writeFileSync(join(dir, 'b.md'), 'Second\n', 'utf8');
      expect(readRalphPromptFilesUtf8(dir, ['a.md', 'b.md'])).toBe(
        'First\n\nSecond',
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws when any path is empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      writeFileSync(join(dir, 'a.md'), 'x', 'utf8');
      expect(() => readRalphPromptFilesUtf8(dir, ['a.md', '   '])).toThrow(
        /non-empty path/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('formatRalphPromptFileProfileLabel', () => {
  it('returns a single absolute path for one file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      expect(formatRalphPromptFileProfileLabel(dir, ['x.md'])).toBe(
        join(dir, 'x.md'),
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns comma-separated absolute paths for multiple files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-prompt-'));
    try {
      expect(formatRalphPromptFileProfileLabel(dir, ['a.md', 'b.md'])).toBe(
        `${join(dir, 'a.md')}, ${join(dir, 'b.md')}`,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
