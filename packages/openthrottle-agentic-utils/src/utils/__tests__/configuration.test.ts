import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKFLOW_DEBUG,
  DEFAULT_WORKFLOW_ITERATIONS,
  DEFAULT_WORKFLOW_RUNNER,
} from '../../config/index.js';
import {
  safeParseBoolean,
  safeParseDebug,
  safeParseIterations,
  safeParseRunner,
  safeParseString,
} from '../configuration.js';

describe('safeParseRunner', () => {
  it('accepts every known runner id', () => {
    expect(safeParseRunner('claude')).toBe('claude');
    expect(safeParseRunner('codex')).toBe('codex');
    expect(safeParseRunner('cursor')).toBe('cursor');
    expect(safeParseRunner('grok')).toBe('grok');
    expect(safeParseRunner('opencode')).toBe('opencode');
  });

  it('falls back to the default runner for unknown values', () => {
    expect(safeParseRunner('gemini')).toBe(DEFAULT_WORKFLOW_RUNNER);
  });

  it('falls back to the default runner for empty/auto values', () => {
    expect(safeParseRunner('')).toBe(DEFAULT_WORKFLOW_RUNNER);
    expect(safeParseRunner('auto')).toBe(DEFAULT_WORKFLOW_RUNNER);
  });

  it('falls back to the default runner when undefined', () => {
    expect(safeParseRunner(undefined)).toBe(DEFAULT_WORKFLOW_RUNNER);
  });
});

describe('safeParseBoolean', () => {
  const cases: ReadonlyArray<[string | undefined, boolean]> = [
    ['true', true],
    ['false', false],
    ['TRUE', true],
    ['False', false],
    ['  true  ', true],
    ['\tFALSE\n', false],
    ['1', false],
    ['0', false],
    ['yes', false],
    ['no', false],
    ['', false],
    [undefined, false],
  ];

  it.each(cases)(
    'parses %j as %s with the default false',
    (input, expected) => {
      expect(safeParseBoolean(input)).toBe(expected);
    },
  );

  it('returns the supplied default for unrecognized values', () => {
    expect(safeParseBoolean('maybe', true)).toBe(true);
    expect(safeParseBoolean(undefined, true)).toBe(true);
    expect(safeParseBoolean('', true)).toBe(true);
  });

  it('honors an explicit literal over the supplied default', () => {
    expect(safeParseBoolean('false', true)).toBe(false);
    expect(safeParseBoolean('true', false)).toBe(true);
  });
});

describe('safeParseDebug', () => {
  it('accepts every known debug level', () => {
    expect(safeParseDebug('debug')).toBe('debug');
    expect(safeParseDebug('omit')).toBe('omit');
    expect(safeParseDebug('verbose')).toBe('verbose');
  });

  it('falls back to the default for unknown values', () => {
    expect(safeParseDebug('loud')).toBe(DEFAULT_WORKFLOW_DEBUG);
    expect(safeParseDebug('')).toBe(DEFAULT_WORKFLOW_DEBUG);
  });

  it('falls back to the default when undefined', () => {
    expect(safeParseDebug(undefined)).toBe(DEFAULT_WORKFLOW_DEBUG);
  });
});

describe('safeParseIterations', () => {
  const cases: ReadonlyArray<[string, number]> = [
    ['1', 1],
    ['10', 10],
    ['100', 100],
    ['50', 50],
    // Clamps above the max of 100.
    ['101', 100],
    ['1000', 100],
    // Below the minimum of 1 falls back to the default.
    ['0', DEFAULT_WORKFLOW_ITERATIONS],
    ['-5', DEFAULT_WORKFLOW_ITERATIONS],
    // Non-numeric / NaN falls back to the default.
    ['abc', DEFAULT_WORKFLOW_ITERATIONS],
    ['', DEFAULT_WORKFLOW_ITERATIONS],
    // parseInt tolerates trailing junk and decimals (Number.isInteger of an
    // integer parse stays true), so the leading integer wins.
    ['12px', 12],
    ['3.9', 3],
  ];

  it.each(cases)('parses %j as %d', (input, expected) => {
    expect(safeParseIterations(input)).toBe(expected);
  });
});

describe('safeParseString', () => {
  it('trims surrounding whitespace', () => {
    expect(safeParseString('  hello  ')).toBe('hello');
    expect(safeParseString('\tname\n')).toBe('name');
  });

  it('returns the value unchanged when already trimmed', () => {
    expect(safeParseString('value')).toBe('value');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(safeParseString('   ')).toBe('');
  });

  it('returns an empty string for an empty input', () => {
    expect(safeParseString('')).toBe('');
  });
});
