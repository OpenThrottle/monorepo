import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { HOOK_LIST_COPY } from '~/routing/plans/data/data.copy';
import { HookTaskList } from '../HookTaskList';
import type { HookTaskListItem } from '../HookTaskList';

const skillHook: HookTaskListItem = {
  hookScope: 'each',
  hookSource: 'skill',
  id: 'hook-1',
  skillSlug: 'validate-plan',
  title: 'after: /validate-plan',
};

const templateHook: HookTaskListItem = {
  hookScope: 'once',
  hookSource: 'template',
  id: 'hook-2',
  skillSlug: null,
  title: 'seed fixtures',
};

describe('HookTaskList', () => {
  test('renders the role title, hook badge, and empty label when there are no hooks', () => {
    const component = render(
      <HookTaskList hooks={[]} onDetach={vi.fn()} role="before" />,
    );

    expect(component.getByText(HOOK_LIST_COPY.beforeTitle)).toBeTruthy();
    expect(component.getByText(HOOK_LIST_COPY.hookBadge)).toBeTruthy();
    expect(component.getByText(HOOK_LIST_COPY.emptyBefore)).toBeTruthy();
  });

  test('renders a skill hook with its slug and scope badges', () => {
    const component = render(
      <HookTaskList hooks={[skillHook]} onDetach={vi.fn()} role="after" />,
    );

    expect(component.getByText('after: /validate-plan')).toBeTruthy();
    expect(component.getByText('/validate-plan')).toBeTruthy();
    expect(component.getByText('each')).toBeTruthy();
  });

  test('does not render a slug badge for a template hook', () => {
    const component = render(
      <HookTaskList hooks={[templateHook]} onDetach={vi.fn()} role="before" />,
    );

    expect(component.getByText('seed fixtures')).toBeTruthy();
    expect(component.queryByText('/validate-plan')).toBeNull();
    expect(component.getByText('once')).toBeTruthy();
  });

  test('invokes onDetach with the hook id when remove is clicked', async () => {
    const onDetach = vi.fn();
    const component = render(
      <HookTaskList hooks={[skillHook]} onDetach={onDetach} role="after" />,
    );

    await userEvent.click(
      component.getByRole('button', {
        name: `${HOOK_LIST_COPY.detach}: after: /validate-plan`,
      }),
    );

    expect(onDetach).toHaveBeenCalledWith('hook-1');
  });

  test('invokes onAdd when the add control is clicked', async () => {
    const onAdd = vi.fn();
    const component = render(
      <HookTaskList
        hooks={[]}
        onAdd={onAdd}
        onDetach={vi.fn()}
        role="before"
      />,
    );

    await userEvent.click(
      component.getByRole('button', { name: HOOK_LIST_COPY.addBefore }),
    );

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('omits the add control when onAdd is not provided', () => {
    const component = render(
      <HookTaskList hooks={[]} onDetach={vi.fn()} role="before" />,
    );

    expect(
      component.queryByRole('button', { name: HOOK_LIST_COPY.addBefore }),
    ).toBeNull();
  });
});
