import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsEmpty } from '../SkillsEmpty';
import type { SkillsEmptyProps } from '../SkillsEmpty';

describe('SkillsEmpty Component', () => {
  let props: SkillsEmptyProps;

  beforeEach(() => {
    props = {};
  });

  test('when there is no search shows empty list copy and link to create', () => {
    const Component = () => <SkillsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('No skills yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first skill to get started.'),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'New skill' });
    expect(link).toHaveAttribute('href', '/skills/create');
  });

  describe('when search is active', () => {
    beforeEach(() => {
      cleanup();
      props = { search: 'alpha' };
    });

    test('shows filtered-empty copy and link to clear filters', () => {
      const Component = () => <SkillsEmpty {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      render(<RoutesStub />);

      expect(
        screen.getByText('No skills match your filters'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Try clearing the search to see all skills.'),
      ).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'Clear filters' });
      expect(link).toHaveAttribute('href', '/skills');
    });
  });
});
