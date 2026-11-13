import {
  GraphqlAuthError,
  GraphqlResponseError,
} from '@openthrottle/react-router-graphql';
import { describe, expect, it } from 'vitest';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';

import {
  readFragmentUpdateForm,
  toCmsFormIssues,
  toFragmentActionFailure,
} from '../fragment-action';

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

describe('toFragmentActionFailure', () => {
  describe('for BAD_USER_INPUT with issues', () => {
    it('returns the issues', () => {
      const error = new GraphqlResponseError('GraphQL errors: bad', {
        code: 'BAD_USER_INPUT',
        issues: [
          { instancePath: '/size', message: 'must be one of' },
          { message: 'root problem' },
          'junk',
        ],
      });

      expect(toFragmentActionFailure(error)).toEqual({
        issues: [
          { message: 'must be one of', path: '/size' },
          { message: 'root problem', path: '' },
        ],
        message: FRAGMENT_EDITOR_COPY.invalid,
        ok: false,
      });
    });
  });

  describe('for BAD_USER_INPUT without issues', () => {
    it('falls back to the error message', () => {
      const error = new GraphqlResponseError('GraphQL errors: bad uuid', {
        code: 'BAD_USER_INPUT',
      });

      expect(toFragmentActionFailure(error)).toEqual({
        issues: [],
        message: 'GraphQL errors: bad uuid',
        ok: false,
      });
    });
  });

  describe('for auth refusals', () => {
    it.each([
      ['UNAUTHENTICATED', FRAGMENT_EDITOR_COPY.unauthenticated],
      ['FORBIDDEN', FRAGMENT_EDITOR_COPY.forbidden],
    ])('maps %s to its message', (code, message) => {
      const error = new GraphqlResponseError('GraphQL errors: no', { code });

      expect(toFragmentActionFailure(error)).toMatchObject({ message });
    });

    it('maps an HTTP auth error to the sign-in message', () => {
      const error = new GraphqlAuthError('openthrottle-server 401', 401);

      expect(toFragmentActionFailure(error)).toMatchObject({
        message: FRAGMENT_EDITOR_COPY.unauthenticated,
      });
    });
  });

  describe('for any other error', () => {
    it('uses its message', () => {
      expect(toFragmentActionFailure(new Error('offline'))).toEqual({
        issues: [],
        message: 'offline',
        ok: false,
      });
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
