import { describe, expect, test } from 'vitest';

import { toPlanRoute } from '../toPlanRoute.ts';

const ID = '24f3510f-6cc5-4f70-a01d-62ddbbdb3f94';

describe('toPlanRoute', () => {
  test('accepts /plans/<uuid>', () => {
    expect(toPlanRoute(`/plans/${ID}`)).toBe(`/plans/${ID}`);
  });

  test.each([
    '/plans/abc',
    `/plans/${ID}/`,
    `/plans/${ID}?x=1`,
    `/plans/${ID}#x`,
    `//plans/${ID}`,
    `/tasks/${ID}`,
    `plans/${ID}`,
    `https://evil.test/plans/${ID}`,
    '',
  ])('rejects %s', (path) => {
    expect(toPlanRoute(path)).toBeUndefined();
  });
});
