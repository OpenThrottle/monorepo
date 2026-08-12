import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultJobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import { PlanWorkflowConfigHookRow } from './PlanWorkflowConfigHookRow';
import type { PlanWorkflowConfigHookRowProps } from './PlanWorkflowConfigHookRow';

describe('PlanWorkflowConfigHookRow Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigHookRowProps;
  let row: JobRunHookDraftRow;

  beforeEach(() => {
    row = createDefaultJobRunHookDraftRow();
    props = {
      hooks: [row],
      index: 0,
      onChange: vi.fn(),
      row,
    };

    component = render(<PlanWorkflowConfigHookRow {...props} />);
  });

  test('renders the row heading and testid', () => {
    expect(component.getByTestId('job-run-hook-row-0')).toBeInTheDocument();
    expect(component.getByText('Hook 1')).toBeInTheDocument();
  });

  test('disables move up/down when there is only one row', () => {
    expect(
      component.getByRole('button', { name: 'Move hook up within phase' }),
    ).toBeDisabled();
    expect(
      component.getByRole('button', { name: 'Move hook down within phase' }),
    ).toBeDisabled();
  });

  test('calls onChange with the row removed when remove is clicked', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Remove hook' }));

    expect(props.onChange).toHaveBeenCalledWith([]);
  });

  test('enables move down when a second row follows', () => {
    const secondRow = createDefaultJobRunHookDraftRow();
    component.unmount();
    component = render(
      <PlanWorkflowConfigHookRow {...props} hooks={[row, secondRow]} />,
    );

    expect(
      component.getByRole('button', { name: 'Move hook down within phase' }),
    ).not.toBeDisabled();
  });
});
