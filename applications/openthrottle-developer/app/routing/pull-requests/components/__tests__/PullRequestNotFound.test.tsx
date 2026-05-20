import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestNotFound } from '../PullRequestNotFound';
import type { PullRequestNotFoundProps } from '../PullRequestNotFound';

describe('PullRequestNotFound Component', () => {
  describe('when listQuery is set', () => {
    let component: RenderResult;
    let props: PullRequestNotFoundProps;

    beforeEach(() => {
      props = {
        listQuery: 'owner=acme&repo=demo',
        owner: 'acme',
        repo: 'demo',
      };

      const Component = () => <PullRequestNotFound {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('renders empty state messaging', () => {
      expect(component.getByTestId('PullRequestNotFound')).toBeInTheDocument();
      expect(
        component.getByRole('heading', { name: 'Pull request not found' }),
      ).toBeInTheDocument();
      expect(
        component.getByText(
          /This PR was not found for the selected owner and repo/i,
        ),
      ).toBeInTheDocument();
    });

    test('links back to the list with the current query', () => {
      const back = component.getByRole('link', { name: 'Back to list' });
      expect(back).toHaveAttribute(
        'href',
        '/pull-requests?owner=acme&repo=demo',
      );
    });

    test('links to the GitHub repository', () => {
      const github = component.getByRole('link', {
        name: 'Open repo on GitHub',
      });
      expect(github).toHaveAttribute('href', 'https://github.com/acme/demo');
      expect(github).toHaveAttribute('target', '_blank');
      expect(github).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('when listQuery is empty', () => {
    test('back to list points at bare pull-requests route', () => {
      const props: PullRequestNotFoundProps = {
        listQuery: '',
        owner: 'acme',
        repo: 'demo',
      };
      const Component = () => <PullRequestNotFound {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const component = render(<RoutesStub />);

      const back = component.getByRole('link', { name: 'Back to list' });
      expect(back).toHaveAttribute('href', '/pull-requests');
    });
  });
});
