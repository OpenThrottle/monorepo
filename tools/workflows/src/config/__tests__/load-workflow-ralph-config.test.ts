/**
 * @description Tests for shared Ralph config loader: file, env, merge precedence, ENOENT.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RALPH_RUNNER } from '../../utils/ralph-execution-backend';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  loadWorkflowRalphConfig,
  loadWorkflowRalphDefaultsFileV1,
  readWorkflowRalphConfigEnv,
  readWorkflowRalphDebugFromEnv,
  resolveWorkflowRalphTransport,
  WORKFLOW_RALPH_CONFIG_ENV,
  WORKFLOW_RALPH_ENV,
} from '../load-workflow-ralph-config';
import { WORKFLOW_RALPH_DEFAULTS_FILENAME } from '../workflow-ralph-defaults.types';
import {
  OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV,
  WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV,
} from '../../utils/ot-diagnostics';
import { WORKFLOW_RALPH_TRANSPORT_ENV } from '../../utils/workflow-transport';

describe('loadWorkflowRalphDefaultsFileV1', () => {
  it('returns {} when file is missing (ENOENT)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      expect(loadWorkflowRalphDefaultsFileV1(dir)).toEqual({});
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('reads v1 fields including spawn, diagnostics, debug, transport', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({
          backend: 'claude',
          debug: 'verbose',
          diagnostics: { ot: true, spawn: false },
          iterations: 5,
          lifecycleHooksChildJobs: false,
          spawn: { home: '/home/agent', otRoot: '/repo' },
          transport: 'postgres-direct',
        }),
        'utf8',
      );
      expect(loadWorkflowRalphDefaultsFileV1(dir)).toEqual({
        backend: 'claude',
        debug: 'verbose',
        diagnostics: { ot: true, spawn: false },
        iterations: 5,
        lifecycleHooksChildJobs: false,
        spawn: { home: '/home/agent', otRoot: '/repo' },
        transport: 'postgres-direct',
      });
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws on unknown top-level keys (strict mode)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({ secretPostgresUrl: 'postgres://x' }),
        'utf8',
      );
      expect(() => loadWorkflowRalphDefaultsFileV1(dir)).toThrow(
        /unknown top-level key "secretPostgresUrl"/,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        '{ not valid json',
        'utf8',
      );
      expect(() => loadWorkflowRalphDefaultsFileV1(dir)).toThrow();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('readWorkflowRalphConfigEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads spawn, transport, diagnostics, and lifecycle env vars', () => {
    const env: NodeJS.ProcessEnv = {
      [WORKFLOW_RALPH_CONFIG_ENV.spawnHome]: '/mounted',
      [WORKFLOW_RALPH_CONFIG_ENV.spawnOtRoot]: '/ot',
      [OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV]: 'true',
      [WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV]: '1',
      [WORKFLOW_RALPH_TRANSPORT_ENV]: 'postgres',
      [WORKFLOW_RALPH_CONFIG_ENV.lifecycleHooksChildJobs]: 'false',
    };

    expect(readWorkflowRalphConfigEnv(env)).toEqual({
      diagnostics: { ot: true, spawn: true },
      lifecycleHooksChildJobs: false,
      spawn: { home: '/mounted', otRoot: '/ot' },
      transport: 'postgres-direct',
    });
  });

  it('maps debug env to verbose when WORKFLOW_RALPH_VERBOSE=1', () => {
    vi.stubEnv(WORKFLOW_RALPH_CONFIG_ENV.verbose, '1');
    expect(readWorkflowRalphDebugFromEnv()).toBe('verbose');
  });

  it('maps RALPH_DEBUG legacy alias', () => {
    vi.stubEnv(WORKFLOW_RALPH_CONFIG_ENV.debugLegacy, '1');
    expect(readWorkflowRalphDebugFromEnv()).toBe('debug');
  });
});

describe('loadWorkflowRalphConfig precedence', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses built-ins when file and env absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      const config = loadWorkflowRalphConfig(dir, {});
      expect(config.backend).toBe(DEFAULT_RALPH_RUNNER);
      expect(config.prompt).toBe(DEFAULT_RALPH_PROMPT);
      expect(config.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
      expect(config.model).toBe(DEFAULT_RALPH_MODEL);
      expect(config.debug).toBe('omit');
      expect(config.transport).toBe('graphql');
      expect(config.lifecycleHooksChildJobs).toBe(true);
      expect(config.diagnostics).toEqual({ ot: false, spawn: false });
      expect(config.spawn).toEqual({});
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('file overrides built-ins; env overrides file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({
          backend: 'cursor',
          debug: 'debug',
          diagnostics: { ot: true },
          iterations: 2,
          prompt: '/agents/from-file',
          spawn: { home: '/file-home' },
          transport: 'graphql',
        }),
        'utf8',
      );
      const env: NodeJS.ProcessEnv = {
        [WORKFLOW_RALPH_ENV.iterations]: '7',
        [WORKFLOW_RALPH_ENV.prompt]: '/agents/from-env',
        [WORKFLOW_RALPH_CONFIG_ENV.spawnHome]: '/env-home',
        [WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV]: '0',
        [WORKFLOW_RALPH_TRANSPORT_ENV]: 'postgres-direct',
      };

      const config = loadWorkflowRalphConfig(dir, env);
      expect(config.iterations).toBe(7);
      expect(config.prompt).toBe('/agents/from-env');
      expect(config.backend).toBe('cursor');
      expect(config.debug).toBe('debug');
      expect(config.transport).toBe('postgres-direct');
      expect(config.spawn.home).toBe('/env-home');
      expect(config.diagnostics.ot).toBe(false);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('env debug overrides file debug', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({ debug: 'omit' }),
        'utf8',
      );
      const env: NodeJS.ProcessEnv = {
        [WORKFLOW_RALPH_CONFIG_ENV.debug]: 'verbose',
      };
      expect(loadWorkflowRalphConfig(dir, env).debug).toBe('verbose');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('file lifecycleHooksChildJobs=false when env unset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({ lifecycleHooksChildJobs: false }),
        'utf8',
      );
      expect(loadWorkflowRalphConfig(dir, {}).lifecycleHooksChildJobs).toBe(
        false,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws when env prompt and promptFile are both set', () => {
    const env: NodeJS.ProcessEnv = {
      [WORKFLOW_RALPH_ENV.prompt]: '/a',
      [WORKFLOW_RALPH_ENV.promptFile]: 'b.md',
    };
    expect(() => loadWorkflowRalphConfig('/tmp', env)).toThrow(
      /cannot both be set/,
    );
  });
});

describe('resolveWorkflowRalphTransport', () => {
  it('returns graphql by default', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      expect(resolveWorkflowRalphTransport(dir, {})).toBe('graphql');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('reads transport from file when env unset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-config-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({ transport: 'postgres-direct' }),
        'utf8',
      );
      expect(resolveWorkflowRalphTransport(dir, {})).toBe('postgres-direct');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
