import { describe, expect, test } from 'vitest';
import { parseScheduleForm } from '../parse-form';

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
});
