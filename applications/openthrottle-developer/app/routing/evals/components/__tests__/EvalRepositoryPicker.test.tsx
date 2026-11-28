import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { EvalRepositoryPicker } from '../EvalRepositoryPicker';

const REPOSITORIES = [
  { displayName: 'monorepo', id: 'repo-1' },
  { displayName: 'website', id: 'repo-2' },
];

const buildHref = (repositoryId: string | null): string => {
  return repositoryId === null ? '/all' : `/repo/${repositoryId}`;
};

describe('EvalRepositoryPicker Component', () => {
  describe('without an all choice', () => {
    test('links one entry per repository', () => {
      const component = renderEvals(
        <EvalRepositoryPicker
          allLabel={null}
          buildHref={buildHref}
          label="Repository"
          repositories={REPOSITORIES}
          selectedRepositoryId={null}
        />,
      );

      expect(
        component.getAllByRole('link').map((link) => link.getAttribute('href')),
      ).toEqual(['/repo/repo-1', '/repo/repo-2']);
    });
  });

  describe('with an all choice', () => {
    test('leads with it and marks the selected repository current', () => {
      const component = renderEvals(
        <EvalRepositoryPicker
          allLabel="All"
          buildHref={buildHref}
          label="Repository"
          repositories={REPOSITORIES}
          selectedRepositoryId="repo-2"
        />,
      );
      const links = component.getAllByRole('link');

      expect(links[0]).toHaveAttribute('href', '/all');
      expect(links[2]).toHaveAttribute('aria-current', 'page');
      expect(links[0]).not.toHaveAttribute('aria-current');
    });
  });
});
