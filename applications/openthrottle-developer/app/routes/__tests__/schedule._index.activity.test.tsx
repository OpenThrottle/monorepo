/**
 * @description /schedule index specs for the in-flight activity surface: the stats row, the activity
 * panel, and the branches that must stay free of both — the genuinely-new user and a search that
 * matched nothing. The list/onboarding rendering itself is covered in schedule._index.test.tsx.
 */

import * as React from 'react';
import { describe, expect, test } from 'vitest';
import ScheduleIndex from '../schedule._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  scheduleInFlightRunFixture,
  scheduleJobFixture,
  scheduleLoaderDataFixture,
} from '~/testing/schedule-fixtures';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import type { Route } from '@/app/routes/+types/schedule._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule._index',
    loaderData: scheduleLoaderDataFixture(),
    params: {},
    pathname: '/',
  },
];

describe('routes/schedule._index.tsx activity surface', () => {
  test('renders the stats row and the activity panel above a populated list', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={scheduleLoaderDataFixture({
          inFlightRuns: [scheduleInFlightRunFixture()],
          jobs: [scheduleJobFixture()],
        })}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByTestId('ScheduleStats')).toBeInTheDocument();
    expect(component.getByTestId('ScheduleActiveRuns')).toBeInTheDocument();
    expect(component.getByTestId('ScheduleTable')).toBeInTheDocument();
  });

  test('omits the activity panel — but keeps the stats row — when nothing is in flight', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={scheduleLoaderDataFixture({
          jobs: [scheduleJobFixture()],
        })}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByTestId('ScheduleStats')).toBeInTheDocument();
    expect(
      component.queryByTestId('ScheduleActiveRuns'),
    ).not.toBeInTheDocument();
  });

  test('shows a new user neither the stats row nor the activity panel', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={scheduleLoaderDataFixture({
          inFlightRuns: [scheduleInFlightRunFixture()],
        })}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.queryByTestId('ScheduleStats')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ScheduleActiveRuns'),
    ).not.toBeInTheDocument();
  });

  test('shows a zero-result search only the no-results line', () => {
    const component = renderRoutesStub(
      <ScheduleIndex
        actionData={undefined}
        loaderData={scheduleLoaderDataFixture({
          inFlightRuns: [scheduleInFlightRunFixture()],
          search: 'nothing-matches',
        })}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByText(SCHEDULE_COPY.noSearchResults),
    ).toBeInTheDocument();
    expect(component.queryByTestId('ScheduleStats')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ScheduleActiveRuns'),
    ).not.toBeInTheDocument();
  });
});
