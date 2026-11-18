import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { CmsActionFailure } from '~/global/types/cms-action';

import { CmsActionFailureAlert } from '../CmsActionFailureAlert';

const COPY = {
  issuesTitle: 'Not saved',
  rootPath: 'record',
  signIn: 'Sign in',
};

const renderAlert = (failure: CmsActionFailure) => {
  const Component = () => {
    return (
      <CmsActionFailureAlert
        className={undefined}
        copy={COPY}
        failure={failure}
        signInHref="/auth/sign-in?redirectUrl=%2Fx"
      />
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('CmsActionFailureAlert', () => {
  describe('with validation issues', () => {
    test('lists each issue, naming the root for an empty path', () => {
      const component = renderAlert({
        issues: [
          { message: 'must be string', path: '/title' },
          { message: 'strict mode', path: '' },
        ],
        message: 'Invalid',
        ok: false,
        requiresSignIn: false,
      });
      const items = component.getAllByRole('listitem');

      expect(component.getByRole('alert')).toBeInTheDocument();
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('/title must be string');
      expect(items[1]).toHaveTextContent(`${COPY.rootPath} strict mode`);
      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('when a sign-in is required', () => {
    test('links to sign-in', () => {
      const component = renderAlert({
        issues: [],
        message: 'Sign in to save changes.',
        ok: false,
        requiresSignIn: true,
      });

      expect(
        component.getByRole('link', { name: COPY.signIn }),
      ).toHaveAttribute('href', '/auth/sign-in?redirectUrl=%2Fx');
    });
  });
});
