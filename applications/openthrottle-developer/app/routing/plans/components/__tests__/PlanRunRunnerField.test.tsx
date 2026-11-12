import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_RUNNER_COPY } from '~/routing/plans/data/data.copy';

import type { PlanRunRunnerFieldProps } from '../PlanRunRunnerField';
import { PlanRunRunnerField } from '../PlanRunRunnerField';

describe('PlanRunRunnerField Component', () => {
  let component: RenderResult;
  let props: PlanRunRunnerFieldProps;

  const renderField = (): void => {
    component = render(<PlanRunRunnerField {...props} />);
  };

  beforeEach(() => {
    props = { onRunnerChange: vi.fn(), runner: 'ralph' };
  });

  test('offers both runners and marks the current one checked', () => {
    renderField();

    const group = component.getByRole('radiogroup', {
      name: PLAN_RUN_RUNNER_COPY.groupLabel,
    });
    const ralph = component.getByRole('radio', {
      name: PLAN_RUN_RUNNER_COPY.ralphLabel,
    });
    const otLoop = component.getByRole('radio', {
      name: PLAN_RUN_RUNNER_COPY.otLoopLabel,
    });

    expect(group).toBeInTheDocument();
    expect(ralph).toBeChecked();
    expect(otLoop).not.toBeChecked();
  });

  test('choosing OT Loop reports it', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(
      component.getByRole('radio', { name: PLAN_RUN_RUNNER_COPY.otLoopLabel }),
    );

    expect(props.onRunnerChange).toHaveBeenCalledWith('ot-loop');
  });

  test('re-clicking the current runner does not deselect it', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(
      component.getByRole('radio', { name: PLAN_RUN_RUNNER_COPY.ralphLabel }),
    );

    expect(props.onRunnerChange).not.toHaveBeenCalled();
  });
});
