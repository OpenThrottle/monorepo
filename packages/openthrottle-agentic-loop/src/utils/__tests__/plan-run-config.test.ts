/**
 * @description Tests for the plan-run config loader: the `defaults` block of `.openthrottle/ot-loop.json`, env, merge precedence, ENOENT.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_PLAN_RUN_MODEL,
  DEFAULT_WORKFLOW_RUNNER,
  PLAN_RUN_OT_ROOT_ENV,
} from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PLAN_RUN_ENV } from '../../data/data.plan-run-config.ts';
import {
  applyPlanRunOtRootFromConfig,
  loadPlanRunConfig,
  loadPlanRunDefaultsFileV1,
  readPlanRunConfigEnv,
  readPlanRunDebugFromEnv,
} from '../plan-run-config.ts';
import { writePlanRunDefaults } from './writePlanRunDefaults.ts';

describe('loadPlanRunDefaultsFileV1', () => {
  it('returns {} when file is missing (ENOENT)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      expect(loadPlanRunDefaultsFileV1(dir)).toEqual({});
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('reads the v1 fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      const defaults = {
        debug: 'verbose',
        driver: 'claude',
        iterationTimeout: 600,
        lifecycleHooksChildJobs: false,
        model: 'sonnet',
        otRoot: '/repo',
        worktreeBase: 'develop',
      };
      writePlanRunDefaults(dir, defaults);
      expect(loadPlanRunDefaultsFileV1(dir)).toEqual(defaults);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('rejects keys only the retired runner read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, { iterations: 5 });
      expect(() => loadPlanRunDefaultsFileV1(dir)).toThrow(
        /unknown top-level key "iterations"/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws on unknown top-level keys (strict mode)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, { secretPostgresUrl: 'postgres://x' });
      expect(() => loadPlanRunDefaultsFileV1(dir)).toThrow(
        /unknown top-level key "secretPostgresUrl"/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, '{ not valid json');
      expect(() => loadPlanRunDefaultsFileV1(dir)).toThrow();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('readPlanRunConfigEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the driver, timeout, model, base, root and lifecycle env vars', () => {
    const env: NodeJS.ProcessEnv = {
      [PLAN_RUN_ENV.driver]: 'claude',
      [PLAN_RUN_ENV.iterationTimeout]: '90',
      [PLAN_RUN_ENV.lifecycleHooksChildJobs]: 'false',
      [PLAN_RUN_ENV.model]: 'opus',
      [PLAN_RUN_ENV.otRoot]: '/ot',
      [PLAN_RUN_ENV.worktreeBase]: 'develop',
    };

    expect(readPlanRunConfigEnv(env)).toEqual({
      driver: 'claude',
      iterationTimeout: 90,
      lifecycleHooksChildJobs: false,
      model: 'opus',
      otRoot: '/ot',
      worktreeBase: 'develop',
    });
  });

  it('names every variable OPENTHROTTLE_PLAN_RUN_*', () => {
    expect(PLAN_RUN_ENV.driver).toBe('OPENTHROTTLE_PLAN_RUN_DRIVER');
    expect(PLAN_RUN_ENV.debug).toBe('OPENTHROTTLE_PLAN_RUN_DEBUG');
  });

  it('maps debug env to verbose when OPENTHROTTLE_PLAN_RUN_VERBOSE=1', () => {
    vi.stubEnv(PLAN_RUN_ENV.verbose, '1');
    expect(readPlanRunDebugFromEnv()).toBe('verbose');
  });

  it('maps a truthy OPENTHROTTLE_PLAN_RUN_DEBUG to debug', () => {
    vi.stubEnv(PLAN_RUN_ENV.debug, '1');
    expect(readPlanRunDebugFromEnv()).toBe('debug');
  });

  it('rejects a non-positive timeout', () => {
    expect(() =>
      readPlanRunConfigEnv({ [PLAN_RUN_ENV.iterationTimeout]: '0' }),
    ).toThrow(/positive integer/);
  });
});

describe('loadPlanRunConfig precedence', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses built-ins when file and env absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      const config = loadPlanRunConfig(dir, {});
      expect(config.driver).toBe(DEFAULT_WORKFLOW_RUNNER);
      expect(config.model).toBe(DEFAULT_PLAN_RUN_MODEL);
      expect(config.debug).toBe('omit');
      expect(config.lifecycleHooksChildJobs).toBe(true);
      expect(config.otRoot).toBeUndefined();
      expect(config.worktreeBase).toBeUndefined();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('file overrides built-ins; env overrides file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, {
        debug: 'debug',
        driver: 'cursor',
        iterationTimeout: 30,
        model: 'from-file',
      });
      const env: NodeJS.ProcessEnv = {
        [PLAN_RUN_ENV.iterationTimeout]: '7',
        [PLAN_RUN_ENV.model]: 'from-env',
      };

      const config = loadPlanRunConfig(dir, env);
      expect(config.iterationTimeout).toBe(7);
      expect(config.model).toBe('from-env');
      expect(config.driver).toBe('cursor');
      expect(config.debug).toBe('debug');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('env debug overrides file debug', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, { debug: 'omit' });
      const env: NodeJS.ProcessEnv = {
        [PLAN_RUN_ENV.debug]: 'verbose',
      };
      expect(loadPlanRunConfig(dir, env).debug).toBe('verbose');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('file lifecycleHooksChildJobs=false when env unset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, { lifecycleHooksChildJobs: false });
      expect(loadPlanRunConfig(dir, {}).lifecycleHooksChildJobs).toBe(false);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('loadPlanRunDefaultsFileV1 shared file', () => {
  it('ignores the validation sections that resolveOtLoopCommands owns', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(
        dir,
        { model: 'x' },
        { validation: { commands: ['pnpm test'] } },
      );
      expect(loadPlanRunDefaultsFileV1(dir)).toEqual({ model: 'x' });
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns {} when the file has no defaults block', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writePlanRunDefaults(dir, '{ "validation": { "commands": ["x"] } }');
      expect(loadPlanRunDefaultsFileV1(dir)).toEqual({});
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('applyPlanRunOtRootFromConfig', () => {
  let dir: string;
  const originalOtRoot = process.env[PLAN_RUN_OT_ROOT_ENV];

  afterEach(() => {
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
    if (originalOtRoot === undefined) {
      delete process.env[PLAN_RUN_OT_ROOT_ENV];
    } else {
      process.env[PLAN_RUN_OT_ROOT_ENV] = originalOtRoot;
    }
  });

  it('sets OPENTHROTTLE_PLAN_RUN_OT_ROOT from otRoot in file when env unset', () => {
    dir = mkdtempSync(join(tmpdir(), 'wr-ot-root-file-'));
    delete process.env[PLAN_RUN_OT_ROOT_ENV];
    writePlanRunDefaults(dir, { otRoot: dir });

    applyPlanRunOtRootFromConfig(dir, process.env);

    expect(process.env[PLAN_RUN_OT_ROOT_ENV]).toBe(dir);
  });
});
