import { describe, expect, test } from 'vitest';

import { getSortChildren } from '../sort-children';

describe('utils/getSortChildren', () => {
  test('sorts records into the reference order', () => {
    const reference = [{ uuid: 'a' }, { uuid: 'b' }, { uuid: 'c' }];
    const records = [{ uuid: 'c' }, { uuid: 'a' }, { uuid: 'b' }];

    expect([...records].sort(getSortChildren(reference))).toStrictEqual(
      reference,
    );
  });

  test('puts records missing from the reference first', () => {
    const reference = [{ uuid: 'a' }];
    const records = [{ uuid: 'a' }, { uuid: 'x' }];

    expect([...records].sort(getSortChildren(reference))).toStrictEqual([
      { uuid: 'x' },
      { uuid: 'a' },
    ]);
  });
});
