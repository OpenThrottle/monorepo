import { parseFormData } from '@openthrottle/react-router-graphql';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_REPOSITORY_NONE_VALUE } from '~/routing/schedule/data/data.repositories';

import { ScheduleFormSchema } from '../ScheduleFormSchema';

const required = {
  driverId: 'ralph',
  name: 'Nightly',
  prompt: 'Audit dependencies',
};

const formOf = (entries: Record<string, string>): FormData => {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.set(key, value);
  }
  return form;
};

const parse = (entries: Record<string, string>) => {
  const result = parseFormData(
    formOf({ ...required, ...entries }),
    ScheduleFormSchema,
  );
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
};

describe('ScheduleFormSchema', () => {
  test('shapes trimmed string fields and coerces enabled/timeout', () => {
    expect(
      parse({
        cronPattern: '  0 9 * * * ',
        enabled: 'true',
        timeoutMs: '5000',
        timezone: 'UTC',
      }),
    ).toMatchObject({
      cronPattern: '0 9 * * *',
      driverId: 'ralph',
      enabled: true,
      name: 'Nightly',
      timeoutMs: 5000,
      timezone: 'UTC',
    });
  });

  test('omits blank optional fields so update stays a partial patch', () => {
    const parsed = parse({ cwd: '   ', timezone: '' });

    expect(parsed.cwd).toBeUndefined();
    expect(parsed.timezone).toBeUndefined();
  });

  test('treats a missing or non-"true" enabled value as false', () => {
    expect(parse({ enabled: 'false' }).enabled).toBe(false);
    expect(parse({}).enabled).toBe(false);
  });

  test('drops a non-finite timeout instead of forwarding NaN', () => {
    expect(parse({ timeoutMs: 'not-a-number' }).timeoutMs).toBeUndefined();
  });

  describe('repository checkout', () => {
    test('maps the workspace-root sentinel to null so no checkout is targeted', () => {
      expect(
        parse({ repositoryCheckoutId: SCHEDULE_REPOSITORY_NONE_VALUE })
          .repositoryCheckoutId,
      ).toBeNull();
    });

    test('nulls the checkout id when the field is absent, so an update can clear it', () => {
      expect(parse({}).repositoryCheckoutId).toBeNull();
    });

    test('passes a picked checkout id through alongside the legacy cwd field', () => {
      const parsed = parse({
        cwd: '  /legacy/path  ',
        repositoryCheckoutId: 'checkout-1',
      });

      expect(parsed.cwd).toBe('/legacy/path');
      expect(parsed.repositoryCheckoutId).toBe('checkout-1');
    });
  });

  describe('minute fields', () => {
    test('converts the interval and misfire grace period to ms', () => {
      const parsed = parse({
        intervalMinutes: '45',
        misfirePolicy: 'catch_up_once',
        misfireThresholdMinutes: '15',
        scheduleKind: 'interval',
      });

      expect(parsed.intervalMs).toBe(45 * 60_000);
      expect(parsed.misfirePolicy).toBe('catch_up_once');
      expect(parsed.misfireThresholdMs).toBe(15 * 60_000);
    });

    test('leaves them unset when not a number', () => {
      const parsed = parse({
        intervalMinutes: 'often',
        misfireThresholdMinutes: 'soon',
      });

      expect(parsed.intervalMs).toBeUndefined();
      expect(parsed.misfireThresholdMs).toBeUndefined();
    });
  });

  describe('when a required field is blank', () => {
    test.each(['driverId', 'name', 'prompt'])(
      'fails with a field error for %s',
      (field) => {
        const result = parseFormData(
          formOf({ ...required, [field]: '  ' }),
          ScheduleFormSchema,
        );

        expect(result.success).toBe(false);
        expect(!result.success && result.fieldErrors[field]).toEqual(
          expect.any(String),
        );
      },
    );
  });
});
