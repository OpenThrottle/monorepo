/**
 * @description Tests for execution backend id parsing and guards.
 */

import { describe, expect, it } from 'vitest';
import {
  isRalphExecutionBackendId,
  parseRalphExecutionBackendId,
  RALPH_EXECUTION_BACKEND_IDS,
  DEFAULT_RALPH_RUNNER,
} from '../ralph-execution-backend';

describe('parseRalphExecutionBackendId', () => {
  it('accepts cursor case-insensitively', () => {
    expect(parseRalphExecutionBackendId('cursor', 'cli')).toBe('cursor');
    expect(parseRalphExecutionBackendId('Cursor', 'env')).toBe('cursor');
  });

  it('accepts claude case-insensitively', () => {
    expect(parseRalphExecutionBackendId('claude', 'cli')).toBe('claude');
    expect(parseRalphExecutionBackendId('CLAUDE', 'env')).toBe('claude');
    expect(parseRalphExecutionBackendId('  Claude  ', 'file')).toBe('claude');
  });

  it('rejects unknown backends', () => {
    expect(() => parseRalphExecutionBackendId('copilot', 'cli')).toThrow(
      /Unknown execution backend/,
    );
  });

  it('rejects empty string', () => {
    expect(() => parseRalphExecutionBackendId('  ', 'file')).toThrow(
      /non-empty string/,
    );
  });

  it('lists known backends in error message', () => {
    expect(() => parseRalphExecutionBackendId('copilot', 'cli')).toThrow(
      /claude.*cursor|cursor.*claude/,
    );
  });
});

describe('isRalphExecutionBackendId', () => {
  it.each(RALPH_EXECUTION_BACKEND_IDS)('returns true for %s', (id) => {
    expect(isRalphExecutionBackendId(id)).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(isRalphExecutionBackendId('copilot')).toBe(false);
    expect(isRalphExecutionBackendId('')).toBe(false);
  });
});

describe('RALPH_EXECUTION_BACKEND_IDS', () => {
  it('includes claude and cursor (one runner per plan run)', () => {
    expect(RALPH_EXECUTION_BACKEND_IDS).toEqual(
      expect.arrayContaining(['claude', 'cursor']),
    );
  });
});

describe('DEFAULT_RALPH_RUNNER', () => {
  it('is cursor', () => {
    expect(DEFAULT_RALPH_RUNNER).toBe('cursor');
  });
});
