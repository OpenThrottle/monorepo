import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component, { action } from '../schedule.create';

describe('routes/schedule.create.tsx', () => {
  test('renders the schedule create form', () => {
    const RouteComponent = () => (
      <Component
        actionData={undefined}
        loaderData={{}}
        matches={[] as never}
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

    const request = new Request('http://localhost/schedule/create', {
      body,
      method: 'POST',
    });

    const response = await action({ params: {}, request } as never);

    if (!(response instanceof Response)) {
      throw new Error('expected the action to return a redirect Response');
    }

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/schedule');
  });

  test('action returns an error when the title is missing', async () => {
    const body = new FormData();
    body.set('startsAt', '2026-06-20T10:00');

    const request = new Request('http://localhost/schedule/create', {
      body,
      method: 'POST',
    });

    const result = await action({ params: {}, request } as never);

    expect(result).toEqual({ error: 'Title is required.' });
  });
});
