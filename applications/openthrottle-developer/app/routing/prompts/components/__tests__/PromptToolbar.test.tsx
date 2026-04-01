import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptToolbar } from '../PromptToolbar';
import type { PromptToolbarProps } from '../PromptToolbar';

const DEFAULT_PROPS: PromptToolbarProps = {
  limit: 20,
  page: 1,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  types: [],
};

describe('PromptToolbar Component', () => {
  let component: RenderResult;
  let props: PromptToolbarProps;

  beforeEach(() => {
    props = { ...DEFAULT_PROPS };

    const Component = () => <PromptToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid PromptToolbar', () => {
    expect(component.getByTestId('PromptToolbar')).toBeInTheDocument();
  });

  test('should render search input', () => {
    expect(
      component.getByTestId('PromptToolbar-search-input'),
    ).toBeInTheDocument();
  });

  test('should render search button', () => {
    expect(
      component.getByTestId('PromptToolbar-search-button'),
    ).toBeInTheDocument();
  });

  test('should render type filter', () => {
    expect(
      component.getByTestId('PromptToolbar-type-filter'),
    ).toBeInTheDocument();
  });

  test('should render sort dropdown', () => {
    expect(
      component.getByTestId('PromptSortDropdown'),
    ).toBeInTheDocument();
  });

  test('should render create button', () => {
    expect(
      component.getByTestId('PromptToolbar-create-button'),
    ).toBeInTheDocument();
  });

  test('should have create button linking to /prompts/create', () => {
    const createButton = component.getByTestId(
      'PromptToolbar-create-button',
    );
    expect(createButton).toHaveAttribute('href', '/prompts/create');
  });

  describe('when filters are active', () => {
    beforeEach(() => {
      props = { ...DEFAULT_PROPS, types: ['AGENTS'] };

      const Component = () => <PromptToolbar {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should show clear filters button', () => {
      expect(
        component.getByTestId('PromptToolbar-clear-filters'),
      ).toBeInTheDocument();
    });
  });

  describe('when no filters are active', () => {
    beforeEach(() => {
      props = { ...DEFAULT_PROPS };

      const Component = () => <PromptToolbar {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should not show clear filters button', () => {
      expect(
        component.queryByTestId('PromptToolbar-clear-filters'),
      ).not.toBeInTheDocument();
    });
  });
});
