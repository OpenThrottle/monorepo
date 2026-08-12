// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { CALENDAR_DEMO_EVENTS } from '~/routing/calendar/data/data.calendar-demo';
import type { Route } from '@/app/routes/+types/calendar._index';
import { loader } from '../calendar._index';

const buildArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/calendar');
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/calendar',
    request,
    url: new URL(request.url),
  };
};

describe('routes/calendar._index loader', () => {
  test('returns the demo calendar events', async () => {
    const result = await loader(buildArgs());

    expect(result).toEqual({ events: CALENDAR_DEMO_EVENTS });
  });
});
