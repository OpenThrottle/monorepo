import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_RUNNER_COPY } from '~/routing/plans/data/data.copy';

import type { PlanRunOtLoopFieldsProps } from '../PlanRunOtLoopFields';
import { PlanRunOtLoopFields } from '../PlanRunOtLoopFields';

describe('PlanRunOtLoopFields Component', () => {
  let component: RenderResult;
  let props: PlanRunOtLoopFieldsProps;

  const renderFields = (): void => {
    component = render(<PlanRunOtLoopFields {...props} />);
  };

  beforeEach(() => {
    props = {
      maxRetriesError: undefined,
      maxRetriesText: '',
      onMaxRetriesChange: vi.fn(),
      onValidationChange: vi.fn(),
      validationText: '',
    };
  });

  test('labels the validation list as an override and explains the empty case', () => {
    renderFields();

    const field = component.getByRole('textbox', {
      name: PLAN_RUN_RUNNER_COPY.validationLabel,
    });

    expect(field).toHaveAccessibleDescription(
      PLAN_RUN_RUNNER_COPY.validationHint,
    );
    expect(
      component.getByText(PLAN_RUN_RUNNER_COPY.otLoopHelp),
    ).toBeInTheDocument();
  });

  test('typing validation commands reports the raw text', async () => {
    const user = userEvent.setup();
    renderFields();

    await user.type(
      component.getByRole('textbox', {
        name: PLAN_RUN_RUNNER_COPY.validationLabel,
      }),
      'a',
    );

    expect(props.onValidationChange).toHaveBeenCalledWith('a');
  });

  test('typing a retry count reports the raw text', async () => {
    const user = userEvent.setup();
    renderFields();

    await user.type(
      component.getByRole('spinbutton', {
        name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
      }),
      '3',
    );

    expect(props.onMaxRetriesChange).toHaveBeenCalledWith('3');
  });

  test('flags an invalid retry count', () => {
    props = {
      ...props,
      maxRetriesError: PLAN_RUN_RUNNER_COPY.maxRetriesInvalid(5),
      maxRetriesText: '9',
    };
    renderFields();

    const field = component.getByRole('spinbutton', {
      name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
    });

    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription(
      PLAN_RUN_RUNNER_COPY.maxRetriesInvalid(5),
    );
  });
});
