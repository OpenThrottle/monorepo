import { describe, expect, it } from 'vitest';

import { readFragmentUpdateForm, toCmsFormIssues } from '../fragment-action';

const formOf = (fields: Record<string, string>): FormData => {
  const form = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    form.set(key, value);
  });

  return form;
};

describe('readFragmentUpdateForm', () => {
  describe('when properties are posted', () => {
    it('reads them with a trimmed name', () => {
      expect(
        readFragmentUpdateForm(formOf({ name: ' Hero ', properties: '{}' })),
      ).toEqual({ name: 'Hero', propertiesJson: '{}' });
    });

    it('leaves a blank name unset', () => {
      expect(
        readFragmentUpdateForm(formOf({ name: '  ', properties: '{}' })),
      ).toEqual({ name: undefined, propertiesJson: '{}' });
    });
  });

  describe('when properties are missing', () => {
    it('returns undefined', () => {
      expect(readFragmentUpdateForm(formOf({ name: 'Hero' }))).toBeUndefined();
    });
  });
});

describe('toCmsFormIssues', () => {
  it('groups messages by top-level property and skips root issues', () => {
    expect(
      toCmsFormIssues([
        { message: 'a', path: '/items/0/title' },
        { message: 'b', path: '/items/1' },
        { message: 'c', path: '/a~1b' },
        { message: 'root', path: '' },
      ]),
    ).toEqual({ 'a/b': ['c'], items: ['a', 'b'] });
  });
});
