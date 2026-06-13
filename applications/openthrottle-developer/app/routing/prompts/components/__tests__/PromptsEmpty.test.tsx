import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsEmpty } from '../PromptsEmpty';
import type { PromptsEmptyProps } from '../PromptsEmpty';
import { PROMPTS_EMPTY_COPY } from '~/routing/prompts/data/data.copy';

describe('PromptsEmpty Component', () => {
  let props: PromptsEmptyProps;

  beforeEach(() => {
    props = {};
  });

  test('when there is no search shows empty list copy and link to create', () => {
    const Component = () => <PromptsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByText(PROMPTS_EMPTY_COPY.title)).toBeInTheDocument();
    expect(
      component.getByText(PROMPTS_EMPTY_COPY.description),
    ).toBeInTheDocument();
    const link = component.getByRole('link', { name: 'New prompt' });
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
      const component = render(<RoutesStub />);

      expect(
        component.getByText(PROMPTS_EMPTY_COPY.searchTitle),
      ).toBeInTheDocument();
      expect(
        component.getByText(PROMPTS_EMPTY_COPY.searchDescription),
      ).toBeInTheDocument();
      const link = component.getByRole('link', { name: 'Clear filters' });
      expect(link).toHaveAttribute('href', '/prompts');
    });
  });
});
