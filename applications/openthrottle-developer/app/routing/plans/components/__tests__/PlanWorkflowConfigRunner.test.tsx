import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  workflowOtLoopAtom,
  workflowRunnerAtom,
} from '~/routing/plans/data/data.atom-plan';
import { PLAN_RUN_RUNNER_COPY } from '~/routing/plans/data/data.copy';

import { PlanWorkflowConfigRunner } from '../PlanWorkflowConfigRunner';

describe('PlanWorkflowConfigRunner Component', () => {
  let component: RenderResult;
  let store: ReturnType<typeof createStore>;

  const renderSection = (): void => {
    component = render(
      <Provider store={store}>
        <PlanWorkflowConfigRunner heading="Runner" />
      </Provider>,
    );
  };

  beforeEach(() => {
    store = createStore();
  });

  test('shows only the runner choice for Ralph', () => {
    renderSection();

    expect(
      component.getByRole('radio', { name: PLAN_RUN_RUNNER_COPY.ralphLabel }),
    ).toBeChecked();
    expect(
      component.queryByRole('textbox', {
        name: PLAN_RUN_RUNNER_COPY.validationLabel,
      }),
    ).not.toBeInTheDocument();
  });

  test('choosing OT Loop writes the runner and reveals the OT Loop fields', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(
      component.getByRole('radio', { name: PLAN_RUN_RUNNER_COPY.otLoopLabel }),
    );

    expect(store.get(workflowRunnerAtom)).toBe('ot-loop');
    expect(
      component.getByRole('textbox', {
        name: PLAN_RUN_RUNNER_COPY.validationLabel,
      }),
    ).toBeInTheDocument();
  });

  test('stores validation commands trimmed, one per line, and retries as a number', async () => {
    const user = userEvent.setup();
    store.set(workflowRunnerAtom, 'ot-loop');
    renderSection();

    await user.type(
      component.getByRole('textbox', {
        name: PLAN_RUN_RUNNER_COPY.validationLabel,
      }),
      '  pnpm test {Enter}{Enter}pnpm lint',
    );
    await user.type(
      component.getByRole('spinbutton', {
        name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
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
    store.set(workflowRunnerAtom, 'ot-loop');
    store.set(workflowOtLoopAtom, { maxRetries: 2 });
    renderSection();

    const retries = component.getByRole('spinbutton', {
      name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
    });
    await user.type(retries, '9');

    expect(retries).toBeInvalid();
    expect(store.get(workflowOtLoopAtom)).toEqual({ maxRetries: 2 });
  });

  test('hydrates the fields from the stored otLoop block', () => {
    store.set(workflowRunnerAtom, 'ot-loop');
    store.set(workflowOtLoopAtom, {
      maxRetries: 1,
      validationCommands: ['a', 'b'],
    });
    renderSection();

    expect(
      component.getByRole('textbox', {
        name: PLAN_RUN_RUNNER_COPY.validationLabel,
      }),
    ).toHaveValue('a\nb');
    expect(
      component.getByRole('spinbutton', {
        name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
      }),
    ).toHaveValue(1);
  });
});
