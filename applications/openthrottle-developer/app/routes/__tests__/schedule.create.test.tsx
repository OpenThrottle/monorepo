import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component, { action } from '../schedule.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { createActionArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/schedule.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule.create',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/schedule.create.tsx', () => {
  test('renders the schedule create form', () => {
    const RouteComponent = () => (
      <Component
        actionData={undefined}
        loaderData={{}}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([
      { Component: RouteComponent, path: '/' },
    ]);

    const view = render(<RoutesStub />);

    expect(view.getByTestId('ScheduleForm')).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'Create event' }),
    ).toBeInTheDocument();
  });

  test('action redirects to the schedule list for a valid submission', async () => {
    const body = new FormData();
    body.set('title', 'Launch');
    body.set('startsAt', '2026-06-20T10:00');

    const response = await action(
      createActionArgs<Route.ActionArgs>({
        body,
        url: 'http://localhost/schedule/create',
      }),
    );

    if (!(response instanceof Response)) {
      throw new Error('expected the action to return a redirect Response');
    }

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/schedule');
  });

  test('action returns an error when the title is missing', async () => {
    const body = new FormData();
    body.set('startsAt', '2026-06-20T10:00');

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body,
        url: 'http://localhost/schedule/create',
      }),
    );

    expect(result).toEqual({ error: 'Title is required.' });
  });
});
