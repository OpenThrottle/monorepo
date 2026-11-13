import { describe, expect, it } from 'vitest';

import {
  getChildPickerSearch,
  readChildPickerQuery,
  toChildPickerPaging,
  toChildTypenames,
} from '../fragment-child-picker';

describe('readChildPickerQuery', () => {
  it('reads the page and a trimmed typename', () => {
    expect(
      readChildPickerQuery(
        new URLSearchParams('childPage=3&childTypename=%20Heading%20'),
      ),
    ).toEqual({ page: 3, typename: 'Heading' });
  });

  it.each(['', 'childPage=-1', 'childPage=1.5', 'childPage=abc'])(
    'reads %j as the first page with no filter',
    (search) => {
      expect(readChildPickerQuery(new URLSearchParams(search))).toEqual({
        page: 0,
        typename: null,
      });
    },
  );
});

describe('toChildPickerPaging', () => {
  it('skips whole pages', () => {
    expect(toChildPickerPaging({ page: 4, typename: null })).toEqual({
      skip: 100,
      take: 25,
    });
  });
});

describe('getChildPickerSearch', () => {
  it('keeps unrelated params and drops defaults', () => {
    expect(
      getChildPickerSearch('?tab=a&childPage=2&childTypename=Heading', {
        page: 0,
        typename: null,
      }),
    ).toBe('?tab=a');
  });

  it('is empty when nothing is left', () => {
    expect(getChildPickerSearch('', { page: 0, typename: null })).toBe('');
  });
});

describe('toChildTypenames', () => {
  it('dedupes and sorts', () => {
    expect(
      toChildTypenames([
        { typename: 'Heading' },
        { typename: 'Button' },
        { typename: 'Heading' },
      ]),
    ).toEqual(['Button', 'Heading']);
  });
});
