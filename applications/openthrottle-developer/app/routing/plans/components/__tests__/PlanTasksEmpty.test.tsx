import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksEmpty } from '../PlanTasksEmpty';
import type { PlanTasksEmptyProps } from '../PlanTasksEmpty';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('PlanTasksEmpty Component', () => {
  describe('when no search filter is active', () => {
    let component: RenderResult;
    let props: PlanTasksEmptyProps;

    beforeEach(() => {
      props = {};
      component = renderRoutesStub(<PlanTasksEmpty {...props} />);
    });

    test('renders onboarding empty state and link to create', () => {
      expect(
        component.getByRole('heading', { name: 'No plans yet' }),
      ).toBeInTheDocument();
      expect(component.getByRole('link', { name: 'New plan' })).toHaveAttribute(
        'href',
        '/plans/create',
      );
    });
  });

  describe('when search filter is active', () => {
    test('renders filtered empty state and link to clear', () => {
      const component = renderRoutesStub(<PlanTasksEmpty search="q=foo" />);

      expect(
        component.getByRole('heading', {
          name: 'No plans match your filters',
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', { name: 'Clear filters' }),
      ).toHaveAttribute('href', '/plans');
    });
  });
});
