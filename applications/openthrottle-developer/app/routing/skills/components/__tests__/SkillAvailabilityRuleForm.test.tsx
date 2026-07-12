import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { SkillAvailabilityRuleForm } from '../SkillAvailabilityRuleForm';
import type { SkillAvailabilityRuleFormProps } from '../SkillAvailabilityRuleForm';

const VOCABULARY = ['github', 'terraform'] as const;

const renderForm = (
  props: SkillAvailabilityRuleFormProps,
  actionResult: unknown = { ok: true },
): { calls: { count: number }; component: RenderResult } => {
  const calls = { count: 0 };
  const Stub = createRoutesStub([
    {
      Component: () => (
        <TooltipProvider>
          <SkillAvailabilityRuleForm {...props} />
        </TooltipProvider>
      ),
      action: async ({ request }) => {
        await request.formData();
        calls.count += 1;
        return actionResult;
      },
      path: '/skills/availability',
    },
  ]);
  const component = render(<Stub initialEntries={['/skills/availability']} />);
  return { calls, component };
};

describe('SkillAvailabilityRuleForm Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the environment qualifier and tag/slug editors', () => {
    const { component } = renderForm({
      mode: 'add',
      vocabulary: [...VOCABULARY],
    });

    expect(
      component.getByTestId('SkillAvailabilityRuleForm'),
    ).toBeInTheDocument();
    expect(component.getByText('All environments')).toBeInTheDocument();
    expect(component.getByText('Slug allow')).toBeInTheDocument();
    expect(component.getByText('Tag allow')).toBeInTheDocument();
  });

  test('rejects a non-kebab-case slug client-side without submitting', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderForm({
      mode: 'add',
      vocabulary: [...VOCABULARY],
    });

    await user.type(component.getByLabelText('Slug allow'), 'Not_Kebab Case!');
    await user.click(component.getByRole('button', { name: /^Add rule$/i }));

    expect(component.getByText(/must be kebab-case/i)).toBeInTheDocument();
    expect(calls.count).toBe(0);
  });

  test('blocks an empty rule (no tag or slug) client-side', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderForm({
      mode: 'add',
      vocabulary: [...VOCABULARY],
    });

    await user.click(component.getByRole('button', { name: /^Add rule$/i }));

    expect(
      component.getByText(/empty rule is not allowed/i),
    ).toBeInTheDocument();
    expect(calls.count).toBe(0);
  });

  test('surfaces a server tag-validation error listing the offenders', async () => {
    const user = userEvent.setup();
    const { component } = renderForm(
      { mode: 'add', vocabulary: [...VOCABULARY] },
      { error: 'Unknown tags not in your vocabulary: foobar, widget.' },
    );

    await user.type(component.getByLabelText('Slug allow'), 'git-commit');
    await user.click(component.getByRole('button', { name: /^Add rule$/i }));

    await waitFor(() => {
      expect(
        component.getByText(
          /Unknown tags not in your vocabulary: foobar, widget\./i,
        ),
      ).toBeInTheDocument();
    });
  });
});
