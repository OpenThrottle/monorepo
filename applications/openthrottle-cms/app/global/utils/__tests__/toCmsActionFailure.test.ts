import {
  GraphqlAuthError,
  GraphqlResponseError,
} from '@openthrottle/react-router-graphql';
import { describe, expect, it } from 'vitest';

import type { CmsActionFailureCopy } from '~/global/types/cms-action';

import { toCmsActionFailure } from '../toCmsActionFailure';

const COPY: CmsActionFailureCopy = {
  forbidden: 'forbidden copy',
  invalid: 'invalid copy',
  unauthenticated: 'unauthenticated copy',
};

describe('toCmsActionFailure', () => {
  describe('for BAD_USER_INPUT with issues', () => {
    it('returns the issues under the invalid copy', () => {
      const error = new GraphqlResponseError('GraphQL errors: bad', {
        code: 'BAD_USER_INPUT',
        issues: [
          { instancePath: '/size', message: 'must be one of' },
          { message: 'root problem' },
          'junk',
        ],
      });

      expect(toCmsActionFailure(error, COPY)).toEqual({
        issues: [
          { message: 'must be one of', path: '/size' },
          { message: 'root problem', path: '' },
        ],
        message: COPY.invalid,
        ok: false,
        requiresSignIn: false,
      });
    });
  });

  describe('for BAD_USER_INPUT without issues', () => {
    it('falls back to the error message', () => {
      const error = new GraphqlResponseError('GraphQL errors: bad uuid', {
        code: 'BAD_USER_INPUT',
      });

      expect(toCmsActionFailure(error, COPY)).toEqual({
        issues: [],
        message: 'GraphQL errors: bad uuid',
        ok: false,
        requiresSignIn: false,
      });
    });
  });

  describe('for auth refusals', () => {
    it.each([
      ['UNAUTHENTICATED', COPY.unauthenticated],
      ['FORBIDDEN', COPY.forbidden],
    ])('maps %s to its copy', (code, message) => {
      const error = new GraphqlResponseError('GraphQL errors: no', { code });

      expect(toCmsActionFailure(error, COPY)).toMatchObject({ message });
    });

    it('maps an HTTP auth error to the sign-in copy', () => {
      const error = new GraphqlAuthError('openthrottle-server 401', 401);

      expect(toCmsActionFailure(error, COPY)).toMatchObject({
        message: COPY.unauthenticated,
        requiresSignIn: true,
      });
    });

    it('asks for a sign-in only when nobody is signed in', () => {
      const unauthenticated = new GraphqlResponseError('no', { code: 'UNAUTHENTICATED' }); // prettier-ignore
      const forbidden = new GraphqlResponseError('no', { code: 'FORBIDDEN' });

      expect(toCmsActionFailure(unauthenticated, COPY)).toMatchObject({ requiresSignIn: true }); // prettier-ignore
      expect(toCmsActionFailure(forbidden, COPY)).toMatchObject({ requiresSignIn: false }); // prettier-ignore
    });
  });

  describe('for any other error', () => {
    it('uses its message', () => {
      expect(toCmsActionFailure(new Error('offline'), COPY)).toEqual({
        issues: [],
        message: 'offline',
        ok: false,
        requiresSignIn: false,
      });
    });
  });
});
