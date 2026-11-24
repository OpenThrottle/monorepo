import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PLAN_RUN_DEBUG_ENV,
  PLAN_RUN_OT_ROOT_ENV,
  PLAN_RUN_VERBOSE_ENV,
  WORKFLOW_RUNNER_IDS,
} from '../../config/index.ts';
import {
  getOpenThrottleRoot,
  getWorkflowConfigCwd,
  isWorkflowRunnerId,
  parseWorkflowRunnerId,
  readWorkflowDebugLevelFromEnv,
} from '../workflow.ts';

/** Marker file that identifies the OpenThrottle monorepo root. */
const OPENTHROTTLE_WORKSPACE_MARKER = '.openthrottle.mjs';

/** Narrows an optional resolved root to a string, failing the test when undefined. */
function assertResolvedRoot(
  value: string | undefined,
): asserts value is string {
  if (value === undefined) {
    throw new Error('expected getOpenThrottleRoot to resolve a directory');
  }
}

/** Temp dir without a workspace marker. */
let emptyRoot: string;
/** Temp dir with the OpenThrottle marker to simulate the monorepo root. */
let otRoot: string;

beforeAll(() => {
  emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-empty-'));
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-root-'));
  fs.writeFileSync(
    path.join(otRoot, OPENTHROTTLE_WORKSPACE_MARKER),
    'export default {};\n',
  );
});

afterAll(() => {
  fs.rmSync(emptyRoot, { force: true, recursive: true });
  fs.rmSync(otRoot, { force: true, recursive: true });
});

describe('getOpenThrottleRoot', () => {
  it('honors an explicit OPENTHROTTLE_PLAN_RUN_OT_ROOT when the directory exists', () => {
    expect(getOpenThrottleRoot({ [PLAN_RUN_OT_ROOT_ENV]: otRoot })).toBe(
      otRoot,
    );
  });

  it('falls through past a missing explicit root to the module walk-up', () => {
    const resolved = getOpenThrottleRoot({
      [PLAN_RUN_OT_ROOT_ENV]: path.join(otRoot, 'does-not-exist'),
    });

    expect(resolved).toBeDefined();
    assertResolvedRoot(resolved);
    expect(
      fs.existsSync(path.join(resolved, OPENTHROTTLE_WORKSPACE_MARKER)),
    ).toBe(true);
  });

  it('prefers WORKSPACE_ROOT when it contains the workspace marker', () => {
    expect(getOpenThrottleRoot({ WORKSPACE_ROOT: otRoot })).toBe(otRoot);
  });

  it('ignores WORKSPACE_ROOT without the workspace marker', () => {
    const resolved = getOpenThrottleRoot({
      [PLAN_RUN_OT_ROOT_ENV]: otRoot,
      WORKSPACE_ROOT: emptyRoot,
    });

    expect(resolved).toBe(otRoot);
  });

  it('falls back to module walk-up when env overrides are unset', () => {
    const resolved = getOpenThrottleRoot({});

    expect(resolved).toBeDefined();
    assertResolvedRoot(resolved);
    expect(
      fs.existsSync(path.join(resolved, OPENTHROTTLE_WORKSPACE_MARKER)),
    ).toBe(true);
  });
});

describe('getWorkflowConfigCwd', () => {
  it('prefers workingDirectory over WORKSPACE_ROOT and process cwd', () => {
    expect(
      getWorkflowConfigCwd('/job/wt', { WORKSPACE_ROOT: '/server/root' }),
    ).toBe('/job/wt');
  });

  it('falls back to WORKSPACE_ROOT when workingDirectory is blank', () => {
    expect(getWorkflowConfigCwd('  ', { WORKSPACE_ROOT: '/server/root' })).toBe(
      '/server/root',
    );
  });

  it('falls back to process.cwd when workingDirectory and WORKSPACE_ROOT are unset', () => {
    expect(getWorkflowConfigCwd(undefined, {})).toBe(process.cwd());
  });
});

describe('readWorkflowDebugLevelFromEnv', () => {
  it('returns off when unset and legacy unset', () => {
    expect(
      readWorkflowDebugLevelFromEnv({
        [PLAN_RUN_DEBUG_ENV]: undefined,
        [PLAN_RUN_VERBOSE_ENV]: undefined,
      }),
    ).toBe('off');
  });

  it('maps truthy OPENTHROTTLE_PLAN_RUN_DEBUG to debug', () => {
    expect(readWorkflowDebugLevelFromEnv({ [PLAN_RUN_DEBUG_ENV]: '1' })).toBe(
      'debug',
    );
    expect(
      readWorkflowDebugLevelFromEnv({ [PLAN_RUN_DEBUG_ENV]: 'true' }),
    ).toBe('debug');
  });

  it('maps verbose level from OPENTHROTTLE_PLAN_RUN_DEBUG', () => {
    expect(
      readWorkflowDebugLevelFromEnv({
        [PLAN_RUN_DEBUG_ENV]: 'verbose',
      }),
    ).toBe('verbose');
    expect(readWorkflowDebugLevelFromEnv({ [PLAN_RUN_DEBUG_ENV]: '2' })).toBe(
      'verbose',
    );
  });

  it('maps OPENTHROTTLE_PLAN_RUN_VERBOSE to verbose', () => {
    expect(readWorkflowDebugLevelFromEnv({ [PLAN_RUN_VERBOSE_ENV]: '1' })).toBe(
      'verbose',
    );
  });

  it('returns off for explicit falsy strings', () => {
    expect(readWorkflowDebugLevelFromEnv({ [PLAN_RUN_DEBUG_ENV]: '0' })).toBe(
      'off',
    );
    expect(
      readWorkflowDebugLevelFromEnv({ [PLAN_RUN_DEBUG_ENV]: 'false' }),
    ).toBe('off');
  });
});

describe('parseWorkflowRunnerId', () => {
  it('accepts cursor case-insensitively', () => {
    expect(parseWorkflowRunnerId('cursor', 'cli')).toBe('cursor');
    expect(parseWorkflowRunnerId('Cursor', 'env')).toBe('cursor');
  });

  it('accepts claude case-insensitively', () => {
    expect(parseWorkflowRunnerId('claude', 'cli')).toBe('claude');
    expect(parseWorkflowRunnerId('CLAUDE', 'env')).toBe('claude');
    expect(parseWorkflowRunnerId('  Claude  ', 'file')).toBe('claude');
  });

  it('accepts the widened ids codex and grok', () => {
    expect(parseWorkflowRunnerId('codex', 'cli')).toBe('codex');
    expect(parseWorkflowRunnerId('grok', 'env')).toBe('grok');
  });

  it('rejects unknown backends', () => {
    expect(() => parseWorkflowRunnerId('copilot', 'cli')).toThrow(
      /Unknown driver/,
    );
  });

  it('rejects empty string', () => {
    expect(() => parseWorkflowRunnerId('  ', 'file')).toThrow(
      /non-empty string/,
    );
  });

  it('lists known backends in error message', () => {
    expect(() => parseWorkflowRunnerId('copilot', 'cli')).toThrow(
      /claude.*cursor|cursor.*claude/,
    );
  });
});

describe('isWorkflowRunnerId', () => {
  it.each(WORKFLOW_RUNNER_IDS)('returns true for %s', (id) => {
    expect(isWorkflowRunnerId(id)).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(isWorkflowRunnerId('copilot')).toBe(false);
    expect(isWorkflowRunnerId('')).toBe(false);
  });
});

describe('WORKFLOW_RUNNER_IDS', () => {
  it('includes claude and cursor (one runner per plan run)', () => {
    expect(WORKFLOW_RUNNER_IDS).toEqual(
      expect.arrayContaining(['claude', 'cursor']),
    );
  });
});
