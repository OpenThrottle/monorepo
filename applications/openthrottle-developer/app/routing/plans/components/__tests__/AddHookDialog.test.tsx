import * as React from 'react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PLAN_LIFECYCLE_HOOKS_COPY } from '~/routing/plans/data/data.copy';
import { AddHookDialog } from '../AddHookDialog';

const copy = PLAN_LIFECYCLE_HOOKS_COPY;

describe('AddHookDialog', () => {
  test('renders source and scope controls for a plan-level hook', () => {
    const { baseElement } = render(
      <AddHookDialog
        isPlanLevel={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        open={true}
        role="before"
      />,
    );
    const scoped = within(baseElement);

    expect(scoped.getByText(copy.addDialogTitle)).toBeTruthy();
    expect(scoped.getByRole('button', { name: copy.sourceSkill })).toBeTruthy();
    expect(scoped.getByRole('button', { name: copy.scopeOnce })).toBeTruthy();
    expect(scoped.getByRole('button', { name: copy.scopeEach })).toBeTruthy();
  });

  test('hides the scope control for a task-level hook', () => {
    const { baseElement } = render(
      <AddHookDialog
        isPlanLevel={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        open={true}
        role="after"
      />,
    );

    expect(
      within(baseElement).queryByRole('button', { name: copy.scopeOnce }),
    ).toBeNull();
  });

  test('submits a skill hook only after a slug is entered', async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <AddHookDialog
        isPlanLevel={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
        role="after"
      />,
    );
    const scoped = within(baseElement);

    const submit = scoped.getByRole('button', { name: copy.submit });
    expect(submit).toHaveProperty('disabled', true);

    await userEvent.type(
      scoped.getByLabelText(copy.skillSlugLabel),
      'validate-plan',
    );
    await userEvent.click(scoped.getByRole('button', { name: copy.scopeEach }));
    await userEvent.click(scoped.getByRole('button', { name: copy.submit }));

    expect(onSubmit).toHaveBeenCalledWith({
      role: 'after',
      scope: 'each',
      skillSlug: 'validate-plan',
      source: 'skill',
    });
  });

  test('submits a template hook with an optional title', async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <AddHookDialog
        isPlanLevel={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
        role="before"
      />,
    );
    const scoped = within(baseElement);

    await userEvent.click(
      scoped.getByRole('button', { name: copy.sourceTemplate }),
    );
    await userEvent.type(
      scoped.getByLabelText(copy.titleLabel),
      'seed fixtures',
    );
    await userEvent.click(scoped.getByRole('button', { name: copy.submit }));

    expect(onSubmit).toHaveBeenCalledWith({
      role: 'before',
      scope: 'once',
      source: 'template',
      title: 'seed fixtures',
    });
  });
});
