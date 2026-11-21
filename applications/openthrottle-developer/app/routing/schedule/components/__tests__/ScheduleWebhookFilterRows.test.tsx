import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { WEBHOOK_LIMITS } from '~/routing/schedule/data/data.webhook';

import { ScheduleWebhookFilterRows } from '../ScheduleWebhookFilterRows';

const path = (index: number): string => {
  return `${SCHEDULE_WEBHOOK_COPY.filterPathLabel} ${index}`;
};

describe('ScheduleWebhookFilterRows Component', () => {
  test('starts with no rows and adds one on demand', async () => {
    const user = userEvent.setup();
    const component = render(<ScheduleWebhookFilterRows filters={[]} />);

    expect(component.queryByLabelText(path(1))).not.toBeInTheDocument();

    await user.click(
      component.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.filterAdd }),
    );

    expect(component.getByLabelText(path(1))).toHaveAttribute(
      'name',
      'filterPath',
    );
  });

  test('shows saved filters, joining the values of an `in` filter', () => {
    const component = render(
      <ScheduleWebhookFilterRows
        filters={[
          {
            op: 'in',
            path: 'action',
            value: null,
            values: ['opened', 'reopened'],
          },
        ]}
      />,
    );

    expect(component.getByLabelText(path(1))).toHaveValue('action');
    expect(
      component.getByLabelText(`${SCHEDULE_WEBHOOK_COPY.filterValueLabel} 1`),
    ).toHaveValue('opened, reopened');
  });

  test('removes a row', async () => {
    const user = userEvent.setup();
    const component = render(
      <ScheduleWebhookFilterRows
        filters={[{ op: 'equals', path: 'action', value: 'opened' }]}
      />,
    );

    await user.click(
      component.getByRole('button', {
        name: `${SCHEDULE_WEBHOOK_COPY.filterRemove} 1`,
      }),
    );

    expect(component.queryByLabelText(path(1))).not.toBeInTheDocument();
  });

  test('keeps the value column aligned by making exists rows read-only', () => {
    const component = render(
      <ScheduleWebhookFilterRows
        filters={[{ op: 'exists', path: 'pull_request' }]}
      />,
    );
    const value = component.getByLabelText(
      `${SCHEDULE_WEBHOOK_COPY.filterValueLabel} 1`,
    );

    expect(value).toHaveAttribute('name', 'filterValue');
    expect(value).toHaveAttribute('readonly');
  });

  test('stops adding at the filter limit', () => {
    const filters = Array.from(
      { length: WEBHOOK_LIMITS.filtersMax },
      (_, i) => ({
        op: 'equals',
        path: `field${i}`,
        value: 'x',
      }),
    );
    const component = render(<ScheduleWebhookFilterRows filters={filters} />);

    expect(
      component.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.filterAdd }),
    ).toBeDisabled();
  });
});
