import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { workflowOtLoopAtom } from '~/routing/plans/data/data.atom-plan';
import { PLAN_RUN_OT_LOOP_COPY } from '~/routing/plans/data/data.copy';

import { PlanWorkflowConfigValidation } from '../PlanWorkflowConfigValidation';

describe('PlanWorkflowConfigValidation Component', () => {
  let component: RenderResult;
  let store: ReturnType<typeof createStore>;

  const renderSection = (): void => {
    component = render(
      <Provider store={store}>
        <PlanWorkflowConfigValidation heading="Validation" />
      </Provider>,
    );
  };

  beforeEach(() => {
    store = createStore();
  });

  test('always shows the validation and retries fields, with no runner choice', () => {
    renderSection();

    expect(
      component.getByRole('textbox', {
        name: PLAN_RUN_OT_LOOP_COPY.validationLabel,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('spinbutton', {
        name: PLAN_RUN_OT_LOOP_COPY.maxRetriesLabel,
      }),
    ).toBeInTheDocument();
    expect(component.queryByRole('radio')).not.toBeInTheDocument();
  });

  test('stores validation commands trimmed, one per line, and retries as a number', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(
      component.getByRole('textbox', {
        name: PLAN_RUN_OT_LOOP_COPY.validationLabel,
      }),
      '  pnpm test {Enter}{Enter}pnpm lint',
    );
    await user.type(
      component.getByRole('spinbutton', {
        name: PLAN_RUN_OT_LOOP_COPY.maxRetriesLabel,
      }),
      '4',
    );

    expect(store.get(workflowOtLoopAtom)).toEqual({
      maxRetries: 4,
      validationCommands: ['pnpm test', 'pnpm lint'],
    });
  });

  test('an out-of-range count shows the error and keeps the last good value', async () => {
    const user = userEvent.setup();
    store.set(workflowOtLoopAtom, { maxRetries: 2 });
    renderSection();

    const retries = component.getByRole('spinbutton', {
      name: PLAN_RUN_OT_LOOP_COPY.maxRetriesLabel,
    });
    await user.type(retries, '9');

    expect(retries).toBeInvalid();
    expect(store.get(workflowOtLoopAtom)).toEqual({ maxRetries: 2 });
  });

  test('hydrates the fields from the stored otLoop block', () => {
    store.set(workflowOtLoopAtom, {
      maxRetries: 1,
      validationCommands: ['a', 'b'],
    });
    renderSection();

    expect(
      component.getByRole('textbox', {
        name: PLAN_RUN_OT_LOOP_COPY.validationLabel,
      }),
    ).toHaveValue('a\nb');
    expect(
      component.getByRole('spinbutton', {
        name: PLAN_RUN_OT_LOOP_COPY.maxRetriesLabel,
      }),
    ).toHaveValue(1);
  });
});
