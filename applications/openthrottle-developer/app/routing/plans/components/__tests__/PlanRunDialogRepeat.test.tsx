import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_REPEAT_COPY } from '~/routing/plans/data/data.copy';

import type { PlanRunDialogRepeatProps } from '../PlanRunDialogRepeat';
import { PlanRunDialogRepeat } from '../PlanRunDialogRepeat';

const COPY = PLAN_RUN_REPEAT_COPY;

describe('PlanRunDialogRepeat Component', () => {
  let props: PlanRunDialogRepeatProps;

  beforeEach(() => {
    props = {
      repeat: {
        cronError: undefined,
        customCron: '',
        disabledReason: undefined,
        onCustomCronChange: vi.fn(),
        onRepeatChange: vi.fn(),
        repeat: 'none',
        summary: undefined,
      },
    };
  });

  test('picking an option reports it', async () => {
    const user = userEvent.setup();
    const component = render(<PlanRunDialogRepeat {...props} />);

    await user.click(component.getByRole('combobox', { name: COPY.label }));
    await user.click(
      await component.findByRole('option', {
        name: COPY.optionLabels.weekdays,
      }),
    );

    expect(props.repeat.onRepeatChange).toHaveBeenCalledWith('weekdays');
  });

  test('shows the cron field only for Custom and reports typing', async () => {
    const user = userEvent.setup();
    const component = render(<PlanRunDialogRepeat {...props} />);

    expect(
      component.queryByRole('textbox', { name: COPY.customCronLabel }),
    ).not.toBeInTheDocument();

    component.rerender(
      <PlanRunDialogRepeat repeat={{ ...props.repeat, repeat: 'custom' }} />,
    );
    await user.type(
      component.getByRole('textbox', { name: COPY.customCronLabel }),
      '5',
    );

    expect(props.repeat.onCustomCronChange).toHaveBeenCalledWith('5');
  });

  test('flags an invalid cron on the field', () => {
    const component = render(
      <PlanRunDialogRepeat
        repeat={{
          ...props.repeat,
          cronError: COPY.customCronInvalid,
          repeat: 'custom',
        }}
      />,
    );

    expect(
      component.getByRole('textbox', { name: COPY.customCronLabel }),
    ).toBeInvalid();
    expect(component.getByText(COPY.customCronInvalid)).toBeInTheDocument();
  });

  test('echoes the readable rule', () => {
    const component = render(
      <PlanRunDialogRepeat
        repeat={{ ...props.repeat, repeat: 'daily', summary: 'Repeats at 9' }}
      />,
    );

    expect(
      component.getByTestId('PlanRunDialogRepeat-summary'),
    ).toHaveTextContent('Repeats at 9');
  });

  test('disables the select and names the existing rule', () => {
    const component = render(
      <PlanRunDialogRepeat
        repeat={{ ...props.repeat, disabledReason: 'Already repeats weekly' }}
      />,
    );

    expect(
      component.getByRole('combobox', { name: COPY.label }),
    ).toBeDisabled();
    expect(
      component.getByTestId('PlanRunDialogRepeat-disabled-reason'),
    ).toHaveTextContent('Already repeats weekly');
  });
});
