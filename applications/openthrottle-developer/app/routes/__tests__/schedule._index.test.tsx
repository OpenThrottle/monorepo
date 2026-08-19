import * as React from 'react';
import { describe, expect, test } from 'vitest';
import ScheduleIndex from '../schedule._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';
import {
  SCHEDULE_COPY,
  SCHEDULE_ONBOARDING,
} from '~/routing/schedule/data/data.copy';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/schedule._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule._index',
    loaderData: { jobs: [], search: '' },
    params: {},
    pathname: '/',
  },
];

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
  name: 'Nightly audit',
  nextRunAt: null,
  timezone: null,
  updatedAt: '2026-07-31T00:00:00.000Z',
  ...overrides,
});

describe('routes/schedule._index.tsx', () => {
  test('renders the table when schedules exist', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={{ jobs: [job()], search: '' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByTestId('ScheduleTable')).toBeInTheDocument();
    expect(component.getByText('Nightly audit')).toBeInTheDocument();
  });

  test('renders the toolbar above the list', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={{ jobs: [job()], search: '' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByTestId('ScheduleToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: SCHEDULE_COPY.newScheduleAction }),
    ).toHaveAttribute('href', '/schedule/create');
  });

  test('renders the toolbar alongside the onboarding pitch', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={{ jobs: [], search: '' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByTestId('ScheduleToolbar')).toBeInTheDocument();
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
  });

  test('renders the onboarding pitch when there are no schedules', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={{ jobs: [], search: '' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.getByTestId('ScheduleIntroduction')).toBeInTheDocument();
    expect(component.queryByTestId('ScheduleTable')).not.toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /create your first schedule/i }),
    ).toHaveAttribute('href', '/schedule/create');
  });

  test('renders the no-results copy when a search matches nothing', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={{ jobs: [], search: 'nothing-matches' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByText(SCHEDULE_COPY.noSearchResults),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(component.queryByTestId('ScheduleTable')).not.toBeInTheDocument();
  });

  test('renders the onboarding trigger in the header when populated', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={{ jobs: [job()], search: '' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
    // Populated list: the pitch is not inline.
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
  });

  test('reveals the onboarding modal over a populated list via ?modal=onboarding', () => {
    const component = renderWithMemoryRouter(
      [
        {
          element: (
            <ScheduleIndex
              actionData={undefined}
              loaderData={{ jobs: [job()], search: '' }}
              matches={matches}
              params={{}}
            />
          ),
          path: '/schedule',
        },
      ],
      { initialEntries: ['/schedule?modal=onboarding'] },
    );

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: SCHEDULE_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', '/schedule/create');
  });
});
