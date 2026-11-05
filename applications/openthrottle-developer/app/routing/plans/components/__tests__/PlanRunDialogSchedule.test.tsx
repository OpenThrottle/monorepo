import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanRunDialogScheduleProps } from '../PlanRunDialogSchedule';
import { PlanRunDialogSchedule } from '../PlanRunDialogSchedule';

describe('PlanRunDialogSchedule Component', () => {
  let props: PlanRunDialogScheduleProps;

  const renderSchedule = (): RenderResult => {
    return render(<PlanRunDialogSchedule {...props} />);
  };

  beforeEach(() => {
    props = {
      date: new Date(2026, 10, 3),
      error: null,
      onDateChange: vi.fn(),
      onTimeChange: vi.fn(),
      summary: 'fires 1:00 PM PST, in about 1 hour',
      time: '13:00',
      timeZone: 'America/Los_Angeles',
    };
  });

  test('labels the pickers as local time in the named zone', () => {
    const component = renderSchedule();

    expect(
      component.getByTestId('PlanRunDialogSchedule-zone'),
    ).toHaveTextContent('Local time (America/Los_Angeles)');
    expect(component.getByLabelText('Time')).toHaveValue('13:00');
  });

  test('echoes the summary and reports no error when the instant is fine', () => {
    const component = renderSchedule();

    expect(
      component.getByTestId('PlanRunDialogSchedule-summary'),
    ).toHaveTextContent('fires 1:00 PM PST, in about 1 hour');
    expect(component.queryByTestId('PlanRunDialogSchedule-error')).toBeNull();
  });

  test('shows the range error and no summary when the instant is rejected', () => {
    props = {
      ...props,
      error: 'That time has already passed.',
      summary: undefined,
    };
    const component = renderSchedule();

    expect(component.getByRole('alert')).toHaveTextContent('already passed');
    expect(component.queryByTestId('PlanRunDialogSchedule-summary')).toBeNull();
  });

  test('reports a changed time', async () => {
    const user = userEvent.setup();
    const Controlled = (): React.ReactElement => {
      const [time, setTime] = React.useState('13:00');

      return (
        <PlanRunDialogSchedule
          {...props}
          onTimeChange={(next) => {
            props.onTimeChange(next);
            setTime(next);
          }}
          time={time}
        />
      );
    };
    const component = render(<Controlled />);

    await user.clear(component.getByLabelText('Time'));
    await user.type(component.getByLabelText('Time'), '15:00');

    expect(props.onTimeChange).toHaveBeenLastCalledWith('15:00');
  });
});
