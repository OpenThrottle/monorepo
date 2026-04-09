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
  readRalphPromptFileUtf8,
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
});
