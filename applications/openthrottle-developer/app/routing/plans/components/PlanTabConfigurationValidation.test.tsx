import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, test } from 'vitest';
import { workflowRalphRunOptionsAtom } from '~/routing/plans/data/atom.plan';
import { PlanTabConfigurationValidation } from './PlanTabConfigurationValidation';

const renderValidation = (
  store: ReturnType<typeof createStore>,
): RenderResult =>
  render(
    <Provider store={store}>
      <PlanTabConfigurationValidation />
    </Provider>,
  );

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
    const current = store.get(workflowRalphRunOptionsAtom);
    store.set(workflowRalphRunOptionsAtom, { ...current, iterations: 0 });

    const component = renderValidation(store);

    const alert = component.getByTestId('workflow-run-validation');
    expect(alert).toHaveTextContent('Workflow options blocked until fixed');
    expect(alert).toHaveTextContent(
      '--iterations must be a positive integer greater than 0',
    );
  });
});
