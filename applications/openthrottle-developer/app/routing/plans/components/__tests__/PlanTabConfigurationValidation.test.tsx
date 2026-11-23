import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { workflowRunOptionsAtom } from '~/routing/plans/data/data.atom-plan';

import { PlanTabConfigurationValidation } from '../PlanTabConfigurationValidation';

const renderValidation = (
  store: ReturnType<typeof createStore>,
): RenderResult => {
  return render(
    <Provider store={store}>
      <PlanTabConfigurationValidation />
    </Provider>,
  );
};

describe('PlanTabConfigurationValidation Component', () => {
  test('renders nothing when the run options are valid', () => {
    const store = createStore();

    const component = renderValidation(store);

    expect(
      component.queryByTestId('workflow-run-validation'),
    ).not.toBeInTheDocument();
  });

  test('renders a blocking alert with issue messages when the run options are invalid', () => {
    const store = createStore();
    const current = store.get(workflowRunOptionsAtom);
    store.set(workflowRunOptionsAtom, { ...current, planId: 'not-a-uuid' });

    const component = renderValidation(store);

    const alert = component.getByTestId('workflow-run-validation');
    expect(alert).toHaveTextContent('Workflow options blocked until fixed');
    expect(alert).toHaveTextContent('Plan must be a OpenThrottle plan UUID');
  });
});
