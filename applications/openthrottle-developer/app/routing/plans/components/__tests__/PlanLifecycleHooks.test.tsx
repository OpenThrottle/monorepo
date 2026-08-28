import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { HOOK_LIST_COPY } from '~/routing/plans/data/data.copy';
import { PlanLifecycleHooks } from '../PlanLifecycleHooks';
import type { PlanLifecycleHook } from '../PlanLifecycleHooks';

const beforeHook: PlanLifecycleHook = {
  hookScope: 'once',
  hookSource: 'skill',
  id: 'before-1',
  skillSlug: 'seed-db',
  title: 'before: /seed-db',
};

const afterHook: PlanLifecycleHook = {
  hookScope: 'each',
  hookSource: 'skill',
  id: 'after-1',
  skillSlug: 'github-commit',
  title: 'after: /github-commit',
};

describe('PlanLifecycleHooks', () => {
  test('renders both before and after groups with their hooks', () => {
    const component = render(
      <PlanLifecycleHooks
        afterHooks={[afterHook]}
        beforeHooks={[beforeHook]}
        onDetach={vi.fn()}
        onRequestAdd={vi.fn()}
      />,
    );

    expect(component.getByText(HOOK_LIST_COPY.beforeTitle)).toBeTruthy();
    expect(component.getByText(HOOK_LIST_COPY.afterTitle)).toBeTruthy();
    expect(component.getByText('before: /seed-db')).toBeTruthy();
    expect(component.getByText('after: /github-commit')).toBeTruthy();
  });

  test('renders an optional heading', () => {
    const component = render(
      <PlanLifecycleHooks
        afterHooks={[]}
        beforeHooks={[]}
        heading="Lifecycle hooks"
        onDetach={vi.fn()}
        onRequestAdd={vi.fn()}
      />,
    );

    expect(component.getByText('Lifecycle hooks')).toBeTruthy();
  });

  test('calls onRequestAdd with the group role', async () => {
    const onRequestAdd = vi.fn();
    const component = render(
      <PlanLifecycleHooks
        afterHooks={[]}
        beforeHooks={[]}
        onDetach={vi.fn()}
        onRequestAdd={onRequestAdd}
      />,
    );

    await userEvent.click(
      component.getByRole('button', { name: HOOK_LIST_COPY.addBefore }),
    );
    expect(onRequestAdd).toHaveBeenCalledWith('before');

    await userEvent.click(
      component.getByRole('button', { name: HOOK_LIST_COPY.addAfter }),
    );
    expect(onRequestAdd).toHaveBeenCalledWith('after');
  });

  test('calls onDetach with the hook id', async () => {
    const onDetach = vi.fn();
    const component = render(
      <PlanLifecycleHooks
        afterHooks={[]}
        beforeHooks={[beforeHook]}
        onDetach={onDetach}
        onRequestAdd={vi.fn()}
      />,
    );

    await userEvent.click(
      component.getByRole('button', {
        name: `${HOOK_LIST_COPY.detach}: before: /seed-db`,
      }),
    );
    expect(onDetach).toHaveBeenCalledWith('before-1');
  });
});
