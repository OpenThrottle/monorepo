import { describe, expect, it } from 'vitest';
import { UnknownDriverError } from '../../errors/index.ts';
import type { AgentDriver } from '../../types/index.ts';
import {
  DEFAULT_DRIVER_ID,
  DRIVER_IDS,
  defineDriver,
  isDriverId,
  lookupDriver,
  parseDriverId,
} from '../index.ts';

const fakeDriver = (id: string): AgentDriver =>
  defineDriver({
    binary: id,
    buildShellCommand: (config) => `${id} ${config.prompt}`,
    capabilities: {
      chatStreaming: false,
      mcpAutoApprove: false,
      permissionMode: false,
      pluginDir: false,
      skipWorktreeSetup: false,
      supportsCustomBaseUrl: false,
      supportsModelFlag: false,
      worktree: false,
      worktreeBase: false,
    },
    id,
    label: id,
    versionArgs: ['--version'],
  });

describe('DRIVER_IDS / DEFAULT_DRIVER_ID', () => {
  it('contains the five initial driver ids', () => {
    expect([...DRIVER_IDS]).toEqual([
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ]);
  });

  it('defaults to cursor (matches legacy DEFAULT_WORKFLOW_RUNNER)', () => {
    expect(DEFAULT_DRIVER_ID).toBe('cursor');
  });
});

describe('defineDriver', () => {
  it('returns the driver unchanged (identity helper)', () => {
    const driver = fakeDriver('claude');
    expect(defineDriver(driver)).toBe(driver);
  });
});

describe('isDriverId', () => {
  it.each([...DRIVER_IDS])('returns true for %s', (id) => {
    expect(isDriverId(id)).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(isDriverId('gemini')).toBe(false);
    expect(isDriverId('')).toBe(false);
  });
});

describe('parseDriverId', () => {
  it('normalizes case and whitespace', () => {
    expect(parseDriverId('cursor', 'cli')).toBe('cursor');
    expect(parseDriverId('  Claude  ', 'file')).toBe('claude');
    expect(parseDriverId('OPENCODE', 'env')).toBe('opencode');
  });

  it('accepts the widened ids codex and grok', () => {
    expect(parseDriverId('codex')).toBe('codex');
    expect(parseDriverId('grok')).toBe('grok');
  });

  it('throws UnknownDriverError with a legacy-compatible message for unknown ids', () => {
    expect(() => parseDriverId('gemini', 'cli')).toThrow(UnknownDriverError);
    expect(() => parseDriverId('gemini', 'cli')).toThrow(
      /Unknown execution backend "gemini"\. Supported: claude, codex, cursor, grok, opencode/,
    );
  });

  it('throws for empty input with the non-empty-string message', () => {
    expect(() => parseDriverId('   ', 'file')).toThrow(
      /Execution backend \(file\) must be a non-empty string/,
    );
  });
});

describe('lookupDriver', () => {
  it('returns the registered driver for an id', () => {
    const claude = fakeDriver('claude');
    expect(lookupDriver({ claude }, 'claude')).toBe(claude);
  });

  it('throws UnknownDriverError when nothing is registered for the id', () => {
    expect(() => lookupDriver({}, 'grok')).toThrow(UnknownDriverError);
    expect(() => lookupDriver({}, 'grok')).toThrow(
      /No driver registered for id "grok"\. Registered: \(none\)/,
    );
  });

  it('lists the registered ids in the not-found message', () => {
    const cursor = fakeDriver('cursor');
    expect(() => lookupDriver({ cursor }, 'claude')).toThrow(
      /Registered: cursor/,
    );
  });
});
