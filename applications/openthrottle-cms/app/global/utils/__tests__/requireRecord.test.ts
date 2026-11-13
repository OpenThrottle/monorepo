import { describe, expect, it } from 'vitest';

import { requireRecord } from '~/global/utils/requireRecord';

const catchThrown = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('requireRecord', () => {
  it('returns the record when present', () => {
    const record = { name: 'Home' };

    expect(requireRecord(record, 'Layout')).toBe(record);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('throws a 404 for %s', (_name, value) => {
    const thrown = catchThrown(() => requireRecord(value, 'Layout'));

    expect(thrown).toMatchObject({
      data: 'Layout not found',
      init: { status: 404, statusText: 'Not Found' },
    });
  });
});
