/**
 * @description Tests for `resolveDriverBinary`: the binEnv override wins when non-blank, and the
 * bare binary name is used when the override is unset, blank, or the driver declares no binEnv.
 */

import { describe, expect, it } from 'vitest';

import { resolveDriverBinary } from '../binary.ts';

const driver = { binEnv: 'OPENTHROTTLE_CLAUDE_BIN', binary: 'claude' };

describe('resolveDriverBinary', () => {
  describe('when the binEnv override is set', () => {
    it('returns the trimmed override', () => {
      expect(
        resolveDriverBinary(driver, {
          OPENTHROTTLE_CLAUDE_BIN: '  /tmp/stub/claude  ',
        }),
      ).toBe('/tmp/stub/claude');
    });
  });

  describe('when the binEnv override is unset or blank', () => {
    it('falls back to the bare binary when unset', () => {
      expect(resolveDriverBinary(driver, {})).toBe('claude');
    });

    it('falls back to the bare binary when blank', () => {
      expect(
        resolveDriverBinary(driver, { OPENTHROTTLE_CLAUDE_BIN: '   ' }),
      ).toBe('claude');
    });
  });

  describe('when the driver declares no binEnv', () => {
    it('always returns the bare binary', () => {
      expect(
        resolveDriverBinary(
          { binEnv: undefined, binary: 'agy' },
          { OPENTHROTTLE_CLAUDE_BIN: '/tmp/stub/claude' },
        ),
      ).toBe('agy');
    });
  });
});
