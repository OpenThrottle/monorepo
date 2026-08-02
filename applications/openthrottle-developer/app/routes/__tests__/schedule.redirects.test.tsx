import { describe, expect, test } from 'vitest';
import { loader as scheduleIndexLoader } from '../schedule._index';
import { loader as scheduleCalendarLoader } from '../schedule.calendar';
import { loader as scheduleCreateLoader } from '../schedule.create';
import { loader as scheduleEventLoader } from '../schedule.$eventId';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import type { Route as ScheduleIndexRoute } from '@/app/routes/+types/schedule._index';
import type { Route as ScheduleCalendarRoute } from '@/app/routes/+types/schedule.calendar';
import type { Route as ScheduleCreateRoute } from '@/app/routes/+types/schedule.create';
import type { Route as ScheduleEventRoute } from '@/app/routes/+types/schedule.$eventId';

const expectRedirect = async (
  response: Response | unknown,
  location: string,
): Promise<void> => {
  if (!(response instanceof Response)) {
    throw new Error('expected a redirect Response');
  }

  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe(location);
};

describe('legacy /schedule/* redirects', () => {
  test('/schedule → /calendar/list', async () => {
    const response = await scheduleIndexLoader(
      createLoaderArgs<ScheduleIndexRoute.LoaderArgs>({
        url: 'http://localhost/schedule',
      }),
    );
    await expectRedirect(response, '/calendar/list');
  });

  test('/schedule/calendar → /calendar', async () => {
    const response = await scheduleCalendarLoader(
      createLoaderArgs<ScheduleCalendarRoute.LoaderArgs>({
        url: 'http://localhost/schedule/calendar',
      }),
    );
    await expectRedirect(response, '/calendar');
  });

  test('/schedule/create → /calendar/create', async () => {
    const response = await scheduleCreateLoader(
      createLoaderArgs<ScheduleCreateRoute.LoaderArgs>({
        url: 'http://localhost/schedule/create',
      }),
    );
    await expectRedirect(response, '/calendar/create');
  });

  test('/schedule/:eventId → /calendar/:eventId', async () => {
    const response = await scheduleEventLoader(
      createLoaderArgs<ScheduleEventRoute.LoaderArgs>({
        params: { eventId: 'evt-001' },
        url: 'http://localhost/schedule/evt-001',
      }),
    );
    await expectRedirect(response, '/calendar/evt-001');
  });
});
