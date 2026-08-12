import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleTable } from './ScheduleTable';
import type { ScheduleTableProps } from './ScheduleTable';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';

const job = (
  overrides: Partial<ScheduledJobCardFragment> = {},
): ScheduledJobCardFragment => ({
  __typename: 'ScheduledAgentJobObject',
  cronPattern: '0 9 * * *',
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  model: 'opus',
  name: 'Nightly digest',
  nextRunAt: '2026-08-13T09:00:00.000Z',
  timezone: 'UTC',
  updatedAt: '2026-08-12T00:00:00.000Z',
  ...overrides,
});

describe('ScheduleTable Component', () => {
  let component: RenderResult;
  let props: ScheduleTableProps;

  beforeEach(() => {
    props = { jobs: [job()] };
  });

  const renderTable = (): RenderResult => {
    const Component = () => <ScheduleTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders the table with a link to the job detail page', () => {
    component = renderTable();

    expect(component.getByTestId('ScheduleTable')).toBeInTheDocument();
    const link = component.getByRole('link', { name: 'Nightly digest' });
    expect(link).toHaveAttribute('href', '/schedule/job-1');
  });

  test('renders the driver id and model', () => {
    component = renderTable();

    expect(component.getByText('claude · opus')).toBeInTheDocument();
  });

  test('renders the cron pattern and timezone', () => {
    component = renderTable();

    expect(component.getByText('0 9 * * * (UTC)')).toBeInTheDocument();
  });

  test('renders an Enabled badge when the job is enabled', () => {
    component = renderTable();

    expect(component.getByText('Enabled')).toBeInTheDocument();
  });

  test('renders a Disabled badge when the job is disabled', () => {
    props = { jobs: [job({ enabled: false })] };
    component = renderTable();

    expect(component.getByText('Disabled')).toBeInTheDocument();
  });

  test('formats the next run time, or an em dash when absent', () => {
    props = { jobs: [job({ nextRunAt: null })] };
    component = renderTable();

    expect(component.getByText('—')).toBeInTheDocument();
  });
});
