import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import { PlanWorkflowConfigHookRowSelects } from '../PlanWorkflowConfigHookRowSelects';
import type { PlanWorkflowConfigHookRowSelectsProps } from '../PlanWorkflowConfigHookRowSelects';

const row: JobRunHookDraftRow = {
  draftId: 'draft-1',
  kind: 'skill',
  phase: 'before_run',
  skillPath: '.agents/skills/validate-plan/SKILL.md',
};

describe('PlanWorkflowConfigHookRowSelects Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigHookRowSelectsProps;

  beforeEach(() => {
    props = {
      kindValue: 'skill',
      onFailureChange: vi.fn(),
      onFailureValue: 'default',
      onKindChange: vi.fn(),
      onPhaseChange: vi.fn(),
      onTimeoutChange: vi.fn(),
      row,
    };

    component = render(<PlanWorkflowConfigHookRowSelects {...props} />);
  });

  test('renders the phase, kind, on-failure, and timeout fields', () => {
    expect(component.getByLabelText('Phase')).toBeInTheDocument();
    expect(component.getByLabelText('Kind')).toBeInTheDocument();
    expect(component.getByLabelText('On failure')).toBeInTheDocument();
    expect(component.getByLabelText('Timeout (s)')).toBeInTheDocument();
  });

  test('labels the default on-failure option with the phase-derived behavior', () => {
    expect(
      component.getByText('Default (block)', { exact: false }),
    ).toBeInTheDocument();
  });

  test('shows an em-dash-free empty timeout value when timeoutSeconds is unset', () => {
    expect(component.getByLabelText('Timeout (s)')).toHaveValue(null);
  });

  test('renders the configured timeout value', () => {
    component.unmount();
    component = render(
      <PlanWorkflowConfigHookRowSelects
        {...props}
        row={{ ...row, timeoutSeconds: 120 }}
      />,
    );

    expect(component.getByLabelText('Timeout (s)')).toHaveValue(120);
  });

  test('invokes onTimeoutChange when the timeout input changes', async () => {
    const user = userEvent.setup();

    await user.type(component.getByLabelText('Timeout (s)'), '5');

    expect(props.onTimeoutChange).toHaveBeenCalled();
  });
});
