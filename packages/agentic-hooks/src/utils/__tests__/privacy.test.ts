/**
 * Unit tests for the privacy seam (`utils/privacy`). Split out of the original
 * package-wide `lib.test.ts` so each source module owns its own spec.
 */
import { describe, expect, it } from 'vitest';

import { applyPrivacy, PRIVACY_LEVELS } from '../../index';

describe('applyPrivacy', () => {
  it('name-only returns null', () => {
    expect(applyPrivacy(PRIVACY_LEVELS.NAME_ONLY, 'hello world')).toBeNull();
  });

  it('truncated caps length and appends ellipsis', () => {
    const long = 'a'.repeat(300);
    const out = applyPrivacy(PRIVACY_LEVELS.TRUNCATED, long, { maxLen: 256 });
    expect(out).not.toBeNull();
    expect(out?.length).toBe(257);
    expect(out?.endsWith('…')).toBe(true);
    expect(out?.slice(0, 256)).toBe('a'.repeat(256));
  });

  it('truncated redacts bearer tokens', () => {
    const out = applyPrivacy(
      PRIVACY_LEVELS.TRUNCATED,
      'Authorization: Bearer abcdefghijklmnop',
    );
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('abcdefghijklmnop');
  });

  it('full keeps long args but still redacts secrets', () => {
    const long = `prefix sk-${'x'.repeat(40)} ${'y'.repeat(300)}`;
    const out = applyPrivacy(PRIVACY_LEVELS.FULL, long) ?? '';
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('prefix');
    expect(out).toContain('y'.repeat(300));
    expect(out.length).toBeGreaterThan(256);
    expect(out).not.toContain(`sk-${'x'.repeat(40)}`);
  });

  it('stringifies object args', () => {
    expect(applyPrivacy(PRIVACY_LEVELS.TRUNCATED, { foo: 'bar' })).toBe(
      '{"foo":"bar"}',
    );
  });
});
