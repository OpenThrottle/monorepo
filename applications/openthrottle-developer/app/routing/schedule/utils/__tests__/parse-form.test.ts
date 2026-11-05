import { describe, expect, test } from 'vitest';

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { SCHEDULE_REPOSITORY_NONE_VALUE } from '~/routing/schedule/data/data.repositories';

import { missingScheduleTiming, parseScheduleForm } from '../parse-form';

const formOf = (entries: Record<string, string>): FormData => {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.set(key, value);
  }
  return form;
};

describe('parseScheduleForm', () => {
  test('shapes trimmed string fields and coerces enabled/timeout', () => {
    const parsed = parseScheduleForm(
      formOf({
        cronPattern: '  0 9 * * * ',
        driverId: 'ralph',
        enabled: 'true',
        name: 'Nightly',
        timeoutMs: '5000',
        timezone: 'UTC',
      }),
    );

    expect(parsed).toMatchObject({
      cronPattern: '0 9 * * *',
      driverId: 'ralph',
      enabled: true,
      name: 'Nightly',
      timeoutMs: 5000,
      timezone: 'UTC',
    });
  });

  test('omits blank/whitespace-only fields so update stays a partial patch', () => {
    const parsed = parseScheduleForm(formOf({ name: '   ', prompt: '' }));

    expect(parsed.name).toBeUndefined();
    expect(parsed.prompt).toBeUndefined();
  });

  test('treats a non-"true" enabled value as false', () => {
    expect(parseScheduleForm(formOf({ enabled: 'false' })).enabled).toBe(false);
    expect(parseScheduleForm(new FormData()).enabled).toBe(false);
  });

  test('drops a non-finite timeout instead of forwarding NaN', () => {
    expect(
      parseScheduleForm(formOf({ timeoutMs: 'not-a-number' })).timeoutMs,
    ).toBeUndefined();
  });

  test('maps the workspace-root sentinel to null so no checkout is targeted', () => {
    const form = new FormData();
    form.set('repositoryCheckoutId', SCHEDULE_REPOSITORY_NONE_VALUE);

    expect(parseScheduleForm(form).repositoryCheckoutId).toBeNull();
  });

  test('passes a picked checkout id through unchanged', () => {
    const form = new FormData();
    form.set('repositoryCheckoutId', 'checkout-1');

    expect(parseScheduleForm(form).repositoryCheckoutId).toBe('checkout-1');
  });

  test('nulls the checkout id when the field is absent, so an update can clear it', () => {
    expect(parseScheduleForm(new FormData()).repositoryCheckoutId).toBeNull();
  });

  test('keeps parsing the legacy cwd field alongside the picker', () => {
    const form = new FormData();
    form.set('cwd', '  /legacy/path  ');
    form.set('repositoryCheckoutId', 'checkout-1');

    const parsed = parseScheduleForm(form);
    expect(parsed.cwd).toBe('/legacy/path');
    expect(parsed.repositoryCheckoutId).toBe('checkout-1');
  });

  describe('misfire fields', () => {
    test('passes the policy through and converts the grace period to ms', () => {
      const parsed = parseScheduleForm(
        formOf({
          misfirePolicy: 'catch_up_once',
          misfireThresholdMinutes: '15',
        }),
      );

      expect(parsed.misfirePolicy).toBe('catch_up_once');
      expect(parsed.misfireThresholdMs).toBe(15 * 60_000);
    });

    test('leaves both unset when blank or not a number', () => {
      const parsed = parseScheduleForm(
        formOf({ misfirePolicy: ' ', misfireThresholdMinutes: 'soon' }),
      );

      expect(parsed.misfirePolicy).toBeUndefined();
      expect(parsed.misfireThresholdMs).toBeUndefined();
    });
  });

  describe('schedule kind fields', () => {
    test('converts the interval minutes to ms and passes the kind through', () => {
      const parsed = parseScheduleForm(
        formOf({ intervalMinutes: '45', scheduleKind: 'interval' }),
      );

      expect(parsed.scheduleKind).toBe('interval');
      expect(parsed.intervalMs).toBe(45 * 60_000);
    });

    test('passes the run-once time through as typed, trimmed', () => {
      const parsed = parseScheduleForm(
        formOf({ runAt: ' 2026-11-03T09:00:00-08:00 ', scheduleKind: 'once' }),
      );

      expect(parsed.runAt).toBe('2026-11-03T09:00:00-08:00');
    });
  });
});

describe('missingScheduleTiming', () => {
  describe('when no kind is chosen', () => {
    test('requires a cron pattern, as cron is the default', () => {
      expect(missingScheduleTiming({})).toBe(SCHEDULE_COPY.missingCronPattern);
      expect(missingScheduleTiming({ cronPattern: '0 9 * * *' })).toBeNull();
    });
  });

  describe('when the kind is interval', () => {
    test('requires the interval', () => {
      expect(missingScheduleTiming({ scheduleKind: 'interval' })).toBe(
        SCHEDULE_COPY.missingInterval,
      );
      expect(
        missingScheduleTiming({ intervalMs: 60_000, scheduleKind: 'interval' }),
      ).toBeNull();
    });
  });

  describe('when the kind is once', () => {
    test('requires the time, not a cron pattern', () => {
      expect(
        missingScheduleTiming({
          cronPattern: '0 9 * * *',
          scheduleKind: 'once',
        }),
      ).toBe(SCHEDULE_COPY.missingRunAt);
      expect(
        missingScheduleTiming({
          runAt: '2026-11-03T17:00:00Z',
          scheduleKind: 'once',
        }),
      ).toBeNull();
    });
  });
});
