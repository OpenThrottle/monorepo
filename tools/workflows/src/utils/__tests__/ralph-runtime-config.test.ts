/**
 * @description Tests for Ralph runtime seed: file, env, merge precedence.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RALPH_RUNNER } from '../ralph-execution-backend';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  WORKFLOW_RALPH_DEFAULTS_FILE,
  WORKFLOW_RALPH_ENV,
  loadWorkflowRalphDefaultsFile,
  mergeRalphRuntimeSeed,
  readWorkflowRalphEnv,
} from '../ralph-runtime-config';

describe('loadWorkflowRalphDefaultsFile', () => {
  it('returns {} when file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      expect(loadWorkflowRalphDefaultsFile(dir)).toEqual({});
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('reads valid JSON fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({
          iterationTimeout: 120,
          iterations: 3,
          model: 'opus',
          project: 'foo-app',
          prompt: '/agents/custom',
        }),
        'utf8',
      );
      expect(loadWorkflowRalphDefaultsFile(dir)).toEqual({
        iterationTimeout: 120,
        iterations: 3,
        model: 'opus',
        project: 'foo-app',
        prompt: '/agents/custom',
      });
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws on invalid JSON shape', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ iterations: 0 }),
        'utf8',
      );
      expect(() => loadWorkflowRalphDefaultsFile(dir)).toThrow(
        /iterations.*positive integer/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws on unknown backend in file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ backend: 'unknown-runner' }),
        'utf8',
      );
      expect(() => loadWorkflowRalphDefaultsFile(dir)).toThrow(
        /Unknown execution backend/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('readWorkflowRalphEnv + mergeRalphRuntimeSeed', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('merge uses built-ins when file and env absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      const seed = mergeRalphRuntimeSeed(dir);
      expect(seed.backend).toBe(DEFAULT_RALPH_RUNNER);
      expect(seed.prompt).toBe(DEFAULT_RALPH_PROMPT);
      expect(seed.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
      expect(seed.model).toBe(DEFAULT_RALPH_MODEL);
      expect(seed.project).toBeUndefined();
      expect(seed.iterationTimeoutMs).toBeUndefined();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('file overrides built-ins; env overrides file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({
          iterationTimeout: 60,
          iterations: 2,
          prompt: '/agents/from-file',
        }),
        'utf8',
      );
      vi.stubEnv(WORKFLOW_RALPH_ENV.iterations, '7');
      vi.stubEnv(WORKFLOW_RALPH_ENV.prompt, '/agents/from-env');

      const seed = mergeRalphRuntimeSeed(dir);
      expect(seed.iterations).toBe(7);
      expect(seed.prompt).toBe('/agents/from-env');
      expect(seed.iterationTimeoutMs).toBe(60_000);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('merge backend: env overrides file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ backend: 'cursor', prompt: '/x' }),
        'utf8',
      );
      vi.stubEnv(WORKFLOW_RALPH_ENV.backend, 'CURSOR');
      const seed = mergeRalphRuntimeSeed(dir);
      expect(seed.backend).toBe('cursor');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('merge backend: env claude wins over file cursor', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ backend: 'cursor' }),
        'utf8',
      );
      vi.stubEnv(WORKFLOW_RALPH_ENV.backend, 'claude');
      const seed = mergeRalphRuntimeSeed(dir);
      expect(seed.backend).toBe('claude');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('merge backend: file claude flows through when env unset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ backend: 'claude' }),
        'utf8',
      );
      const seed = mergeRalphRuntimeSeed(dir);
      expect(seed.backend).toBe('claude');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('env iteration timeout overrides file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ iterationTimeout: 60 }),
        'utf8',
      );
      vi.stubEnv(WORKFLOW_RALPH_ENV.iterationTimeout, '90');
      const seed = mergeRalphRuntimeSeed(dir);
      expect(seed.iterationTimeoutMs).toBe(90_000);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('readWorkflowRalphEnv throws on invalid iterations', () => {
    vi.stubEnv(WORKFLOW_RALPH_ENV.iterations, 'nope');
    expect(() => readWorkflowRalphEnv()).toThrow(WORKFLOW_RALPH_ENV.iterations);
  });

  it('readWorkflowRalphEnv throws when prompt and promptFile are both set', () => {
    vi.stubEnv(WORKFLOW_RALPH_ENV.prompt, '/agents/x');
    vi.stubEnv(WORKFLOW_RALPH_ENV.promptFile, './p.md');
    expect(() => readWorkflowRalphEnv()).toThrow(/cannot both be set/);
  });

  it('merge throws when defaults combine non-default prompt with promptFile', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({
          prompt: '/agents/custom',
          promptFile: 'foo.md',
        }),
        'utf8',
      );
      expect(() => mergeRalphRuntimeSeed(dir)).toThrow(/cannot both be set/);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('merge throws when env prompt and file promptFile conflict', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ promptFile: 'foo.md' }),
        'utf8',
      );
      vi.stubEnv(WORKFLOW_RALPH_ENV.prompt, '/agents/from-env');
      expect(() => mergeRalphRuntimeSeed(dir)).toThrow(
        /prompt file path with a non-default named prompt/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
