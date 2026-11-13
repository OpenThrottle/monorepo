import { describe, expect, test } from 'vitest';

import { findDeepLink } from '../findDeepLink.ts';
import { mapDeepLink } from '../mapDeepLink.ts';

const ID = '24f3510f-6cc5-4f70-a01d-62ddbbdb3f94';

describe('mapDeepLink', () => {
  test('maps a plan link to its route', () => {
    expect(mapDeepLink(`openthrottle://plans/${ID}`)).toBe(`/plans/${ID}`);
  });

  test('lowercases the id and ignores query and hash', () => {
    expect(mapDeepLink(`openthrottle://plans/${ID.toUpperCase()}?x=1#y`)).toBe(
      `/plans/${ID}`,
    );
  });

  test.each([
    'openthrottle://plans/not-a-uuid',
    'openthrottle://plans/',
    'openthrottle://plans',
    `openthrottle://plans/${ID}/tasks`,
    `openthrottle://plans/${ID}/`,
    `openthrottle://evil/${ID}`,
    `openthrottle://plans.evil.test/${ID}`,
    `openthrottle://user@plans/${ID}`,
    `openthrottle://plans:80/${ID}`,
    `openthrottle:///plans/${ID}`,
    `https://plans/${ID}`,
    `javascript:alert(1)`,
    `http://127.0.0.1/plans/${ID}`,
    'not a url',
    '',
  ])('rejects %s', (url) => {
    expect(mapDeepLink(url)).toBeUndefined();
  });
});

describe('findDeepLink', () => {
  test('finds the first openthrottle argument', () => {
    expect(
      findDeepLink(['electron', '.', '--flag', 'openthrottle://plans/x']),
    ).toBe('openthrottle://plans/x');
  });

  test('returns undefined without one', () => {
    expect(
      findDeepLink(['electron', '.', 'https://example.com']),
    ).toBeUndefined();
  });
});
