/**
 * @description Leg B resolution: turning "is there a hook payload, and are we allowed to inject
 * it?" into the list a driver hands to `--plugin-dir`. Every failure mode must resolve to an empty
 * list rather than an exception, because a telemetry overlay is never allowed to break the run it
 * is observing.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getOpenThrottleRootMock } = vi.hoisted(() => ({
  getOpenThrottleRootMock: vi.fn(),
}));

vi.mock('../workflow.ts', () => ({
  getOpenThrottleRoot: getOpenThrottleRootMock,
}));

import {
  HOOK_PLUGIN_DIR_ENV,
  HOOK_PLUGIN_ENABLED_ENV,
  resetHookPluginWarning,
  resolveHookPluginDirs,
} from '../hook-plugin-injection.ts';

let tmpRoot: string;
let payloadDir: string;
const warn = vi.fn();

/** Writes a payload whose manifest exists — the marker the resolver actually checks. */
const writePayload = (root: string): string => {
  const dir = path.join(root, 'plugins', 'openthrottle');
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.claude-plugin', 'plugin.json'),
    '{"name":"openthrottle"}',
    'utf8',
  );
  return dir;
};

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-plugin-'));
  payloadDir = writePayload(tmpRoot);
  getOpenThrottleRootMock.mockReturnValue(tmpRoot);
  resetHookPluginWarning();
});

afterEach(() => {
  fs.rmSync(tmpRoot, { force: true, recursive: true });
  vi.clearAllMocks();
});

describe('resolveHookPluginDirs', () => {
  it('resolves the payload under the OpenThrottle root by default', () => {
    expect(resolveHookPluginDirs({ env: {}, warn })).toEqual([payloadDir]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('honors an explicit payload override', () => {
    const other = writePayload(fs.mkdtempSync(path.join(os.tmpdir(), 'alt-')));
    expect(
      resolveHookPluginDirs({ env: { [HOOK_PLUGIN_DIR_ENV]: other }, warn }),
    ).toEqual([other]);
  });

  it.each(['0', 'false', 'no', 'off', 'OFF'])(
    'injects nothing when gated off with %s',
    (value) => {
      expect(
        resolveHookPluginDirs({
          env: { [HOOK_PLUGIN_ENABLED_ENV]: value },
          warn,
        }),
      ).toEqual([]);
    },
  );

  it('is on by default and stays on for a non-falsy value', () => {
    expect(
      resolveHookPluginDirs({ env: { [HOOK_PLUGIN_ENABLED_ENV]: '1' }, warn }),
    ).toEqual([payloadDir]);
    expect(
      resolveHookPluginDirs({ env: { [HOOK_PLUGIN_ENABLED_ENV]: '' }, warn }),
    ).toEqual([payloadDir]);
  });

  it('warns without throwing when the payload has not been built', () => {
    fs.rmSync(payloadDir, { force: true, recursive: true });
    expect(resolveHookPluginDirs({ env: {}, warn })).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('bundle-hooks');
  });

  it('rejects a directory that carries no plugin manifest', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    expect(
      resolveHookPluginDirs({ env: { [HOOK_PLUGIN_DIR_ENV]: empty }, warn }),
    ).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns without throwing when the OpenThrottle root cannot be found', () => {
    getOpenThrottleRootMock.mockReturnValue(undefined);
    expect(resolveHookPluginDirs({ env: {}, warn })).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(HOOK_PLUGIN_DIR_ENV);
  });

  it('warns once per process, not once per iteration', () => {
    getOpenThrottleRootMock.mockReturnValue(undefined);
    resolveHookPluginDirs({ env: {}, warn });
    resolveHookPluginDirs({ env: {}, warn });
    resolveHookPluginDirs({ env: {}, warn });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays silent when gated off, even with no payload present', () => {
    getOpenThrottleRootMock.mockReturnValue(undefined);
    expect(
      resolveHookPluginDirs({ env: { [HOOK_PLUGIN_ENABLED_ENV]: '0' }, warn }),
    ).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});
