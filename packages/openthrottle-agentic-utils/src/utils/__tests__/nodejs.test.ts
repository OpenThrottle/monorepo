import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  prependOpenThrottleBinToPath,
  resolveOpenThrottleBinDir,
} from '../nodejs.js';
import { WORKFLOW_RALPH_OT_ROOT_ENV } from '../workflow.js';

/** Temp dir without a node_modules/.bin so OT bin resolution is a no-op. */
let emptyRoot: string;
/** Temp dir with node_modules/.bin to simulate the OpenThrottle monorepo root. */
let otRoot: string;
let otBinDir: string;

beforeAll(() => {
  emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-empty-'));
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-root-'));
  otBinDir = path.join(otRoot, 'node_modules', '.bin');
  fs.mkdirSync(otBinDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(emptyRoot, { force: true, recursive: true });
  fs.rmSync(otRoot, { force: true, recursive: true });
});

describe('resolveOpenThrottleBinDir', () => {
  it('returns the OT node_modules/.bin when it exists', () => {
    expect(
      resolveOpenThrottleBinDir({ [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot }),
    ).toBe(otBinDir);
  });

  it('returns undefined when the resolved root has no node_modules/.bin', () => {
    expect(
      resolveOpenThrottleBinDir({ [WORKFLOW_RALPH_OT_ROOT_ENV]: emptyRoot }),
    ).toBeUndefined();
  });
});

describe('prependOpenThrottleBinToPath', () => {
  it('prepends the OT bin dir to PATH', () => {
    const out = prependOpenThrottleBinToPath({
      PATH: '/usr/bin',
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
    });

    expect(out.PATH).toBe(`${otBinDir}${path.delimiter}/usr/bin`);
  });

  it('is idempotent when the OT bin dir is already on PATH', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: `${otBinDir}${path.delimiter}/usr/bin`,
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
    };

    expect(prependOpenThrottleBinToPath(env)).toBe(env);
  });

  it('leaves env untouched when the bin dir cannot be resolved', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: '/usr/bin',
      [WORKFLOW_RALPH_OT_ROOT_ENV]: emptyRoot,
    };

    expect(prependOpenThrottleBinToPath(env)).toBe(env);
  });
});
