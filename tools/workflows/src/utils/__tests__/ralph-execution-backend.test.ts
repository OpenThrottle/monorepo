/**
 * @description Tests for execution backend id parsing and guards.
 */

import { describe, expect, it } from 'vitest';
import {
  parseRalphExecutionBackendId,
  DEFAULT_RALPH_RUNNER,
} from '../ralph-execution-backend';

describe('parseRalphExecutionBackendId', () => {
  it('accepts cursor case-insensitively', () => {
    expect(parseRalphExecutionBackendId('cursor', 'cli')).toBe('cursor');
    expect(parseRalphExecutionBackendId('Cursor', 'env')).toBe('cursor');
  });

  it('rejects unknown backends', () => {
    expect(() => parseRalphExecutionBackendId('codex', 'cli')).toThrow(
      /Unknown execution backend/,
    );
  });

  it('rejects empty string', () => {
    expect(() => parseRalphExecutionBackendId('  ', 'file')).toThrow(
      /non-empty string/,
    );
  });
});

describe('DEFAULT_RALPH_RUNNER', () => {
  it('is cursor', () => {
    expect(DEFAULT_RALPH_RUNNER).toBe('cursor');
  });
});
