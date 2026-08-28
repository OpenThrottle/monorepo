import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  HOOK_LIST_COPY,
  PLAN_LIFECYCLE_HOOKS_COPY,
} from '~/routing/plans/data/data.copy';
import { PlanLifecycleHooksSection } from '../PlanLifecycleHooksSection';
import type { PlanLifecycleHooksSectionProps } from '../PlanLifecycleHooksSection';

describe('PlanLifecycleHooksSection Component', () => {
  let component: RenderResult;
  let props: PlanLifecycleHooksSectionProps;

  beforeEach(() => {
    props = {
      afterHooks: [],
      beforeHooks: [],
      planId: 'plan-1',
    };

    const RoutesStub = createRoutesStub([
      {
        Component: () => <PlanLifecycleHooksSection {...props} />,
        action: () => null,
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  });

  test('renders both before and after hook groups when there are no hooks', () => {
    expect(component.getByText(HOOK_LIST_COPY.beforeTitle)).toBeInTheDocument();
    expect(component.getByText(HOOK_LIST_COPY.afterTitle)).toBeInTheDocument();
    expect(component.getByText(HOOK_LIST_COPY.emptyBefore)).toBeInTheDocument();
    expect(component.getByText(HOOK_LIST_COPY.emptyAfter)).toBeInTheDocument();
  });

  test('opens the add-hook dialog for the requested role', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: HOOK_LIST_COPY.addBefore }),
    );

    expect(
      component.getByText(PLAN_LIFECYCLE_HOOKS_COPY.addDialogTitle),
    ).toBeInTheDocument();
  });

  test('submitting a skill hook from the dialog closes it', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: HOOK_LIST_COPY.addAfter }),
    );
    await user.type(
      component.getByLabelText(PLAN_LIFECYCLE_HOOKS_COPY.skillSlugLabel),
      'github-commit',
    );
    await user.click(
      component.getByRole('button', {
        name: PLAN_LIFECYCLE_HOOKS_COPY.submit,
      }),
    );

    expect(
      component.queryByText(PLAN_LIFECYCLE_HOOKS_COPY.addDialogTitle),
    ).toBeNull();
  });
});
