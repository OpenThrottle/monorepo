import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RulesEmpty } from '../RulesEmpty';
import type { RulesEmptyProps } from '../RulesEmpty';

describe('RulesEmpty Component', () => {
  let component: RenderResult;
  let props: RulesEmptyProps;

  const renderEmpty = (overrides?: Partial<RulesEmptyProps>): RenderResult => {
    const merged = { ...props, ...overrides };
    const Component = () => <RulesEmpty {...merged} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    cleanup();
    props = {};
    component = renderEmpty();
  });

  test('when unfiltered shows empty list copy and link to create', () => {
    expect(component.getByTestId('RulesEmpty')).toBeInTheDocument();
    expect(component.getByText(RULES_COPY.emptyTitle)).toBeInTheDocument();
    expect(component.getByText(RULES_COPY.emptyBody)).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: RULES_COPY.newRuleAction }),
    ).toHaveAttribute('href', '/rules/new');
  });

  describe('when filters are active', () => {
    beforeEach(() => {
      cleanup();
      props = { isFiltered: true };
      component = renderEmpty();
    });

    test('shows filtered-empty copy and link to clear filters', () => {
      expect(
        component.getByText(RULES_COPY.filteredEmptyTitle),
      ).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.filteredEmptyBody),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', { name: RULES_COPY.clearFiltersAction }),
      ).toHaveAttribute('href', '/rules');
    });
  });
});
