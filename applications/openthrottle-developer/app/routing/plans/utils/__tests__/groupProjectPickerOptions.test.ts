import { describe, expect, test } from 'vitest';

import type { PlanProjectOptionFragment } from '~/__generated__/graphql';

import { groupProjectPickerOptions } from '../groupProjectPickerOptions';

const project = (
  id: string,
  name: string,
  isFavorite: boolean,
): PlanProjectOptionFragment => {
  return { __typename: 'ProjectObject', id, isFavorite, name };
};

describe('groupProjectPickerOptions', () => {
  test('splits starred projects from the rest, each sorted by name', () => {
    const ordered = groupProjectPickerOptions([
      project('1', 'zeta', false),
      project('2', 'Beta', true),
      project('3', 'alpha', false),
      project('4', 'Alpha star', true),
    ]);

    expect(ordered.starred.map((option) => option.id)).toEqual(['4', '2']);
    expect(ordered.others.map((option) => option.id)).toEqual(['3', '1']);
  });

  test('returns two empty groups for no projects', () => {
    expect(groupProjectPickerOptions([])).toEqual({ others: [], starred: [] });
  });
});
