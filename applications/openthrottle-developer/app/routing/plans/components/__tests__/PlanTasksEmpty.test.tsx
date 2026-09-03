import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksEmpty } from '../PlanTasksEmpty';
import type { PlanTasksEmptyProps } from '../PlanTasksEmpty';
import {
  PLAN_TASKS_EMPTY_COPY,
  PLANS_INDEX_EMPTY_COPY,
} from '~/routing/plans/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('PlanTasksEmpty Component', () => {
  describe('plans variant with no active filter', () => {
    let component: RenderResult;
    let props: PlanTasksEmptyProps;

    beforeEach(() => {
      props = {};
      component = renderRoutesStub(<PlanTasksEmpty {...props} />);
    });

    test('renders the empty state without a create action', () => {
      expect(
        component.getByRole('heading', {
          name: PLANS_INDEX_EMPTY_COPY.emptyTitle,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByText(PLANS_INDEX_EMPTY_COPY.emptyDescription),
      ).toBeInTheDocument();
      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('plans variant with an active filter', () => {
    test('renders filtered empty state and link to clear', () => {
      const component = renderRoutesStub(<PlanTasksEmpty filtered={true} />);

      expect(
        component.getByRole('heading', {
          name: PLANS_INDEX_EMPTY_COPY.filteredTitle,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', {
          name: PLANS_INDEX_EMPTY_COPY.filteredAction,
        }),
      ).toHaveAttribute('href', '/plans');
    });
  });

  describe('tasks variant', () => {
    test('renders task-specific copy and no onboarding link', () => {
      const component = renderRoutesStub(<PlanTasksEmpty variant="tasks" />);

      expect(
        component.getByRole('heading', {
          name: PLAN_TASKS_EMPTY_COPY.title,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByText(PLAN_TASKS_EMPTY_COPY.description),
      ).toBeInTheDocument();
      // Neither empty state offers an action any more.
      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
