import { describe, expect, test } from 'vitest';
import { parseScheduleForm } from '../parse-form';
import { SCHEDULE_REPOSITORY_NONE_VALUE } from '../data.repositories';

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
});
