import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { createDefaultJobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';

import { PlanWorkflowConfigHooks } from '../PlanWorkflowConfigHooks';

describe('PlanWorkflowConfigHooks', () => {
  test('renders empty state and add hook control', async () => {
    const onChange = vi.fn();
    const { getByTestId, getByText } = render(
      <PlanWorkflowConfigHooks
        heading="08. Job Run Hooks"
        hooks={[]}
        onChange={onChange}
        onSave={vi.fn()}
      />,
    );

    expect(getByTestId('PlanWorkflowConfigHooks')).toBeInTheDocument();
    expect(getByText(/No hooks configured/i)).toBeInTheDocument();

    await userEvent.click(getByTestId('job-run-hooks-add'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'prompt_profile', phase: 'before_run' }),
    ]);
  });

  test('shows save button when onSave is provided', () => {
    const onSave = vi.fn();
    const row = createDefaultJobRunHookDraftRow();
    const { getByTestId } = render(
      <PlanWorkflowConfigHooks
        heading="08. Job Run Hooks"
        hooks={[row]}
        onChange={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(getByTestId('job-run-hooks-save')).toBeInTheDocument();
  });
});
