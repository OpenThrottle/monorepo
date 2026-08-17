import { describe, expect, test } from 'vitest';
import { isExternalHref } from '../external-href';

describe('isExternalHref', () => {
  test('is true for absolute https and http targets', () => {
    expect(isExternalHref('https://agentskills.io/specification')).toBe(true);
    expect(isExternalHref('http://example.com/docs')).toBe(true);
  });

  test('is false for in-app routes', () => {
    expect(isExternalHref('/skills/vocabulary')).toBe(false);
    expect(isExternalHref('skills/vocabulary')).toBe(false);
  });

  test('is false for a target that only mentions a scheme mid-string', () => {
    expect(isExternalHref('/redirect?to=https://example.com')).toBe(false);
  });
});
