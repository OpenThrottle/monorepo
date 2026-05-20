import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsEmpty } from '../PromptsEmpty';
import type { PromptsEmptyProps } from '../PromptsEmpty';

describe('PromptsEmpty Component', () => {
  let props: PromptsEmptyProps;

  beforeEach(() => {
    props = {};
  });

  test('when there is no search shows empty list copy and link to create', () => {
    const Component = () => <PromptsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('No prompts yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first prompt to get started.'),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'New prompt' });
    expect(link).toHaveAttribute('href', '/prompts/create');
  });

  describe('when search is active', () => {
    beforeEach(() => {
      cleanup();
      props = { search: 'alpha' };
    });

    test('shows filtered-empty copy and link to clear filters', () => {
      const Component = () => <PromptsEmpty {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      render(<RoutesStub />);

      expect(
        screen.getByText('No prompts match your filters'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Try clearing the search to see all prompts.'),
      ).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'Clear filters' });
      expect(link).toHaveAttribute('href', '/prompts');
    });
  });
});
