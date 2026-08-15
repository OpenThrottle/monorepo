import type { Fetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { isFetcherBusy, isFetcherFormPending } from '../fetcher';

const idle = (): Fetcher => ({
  data: undefined,
  formAction: undefined,
  formData: undefined,
  formEncType: undefined,
  formMethod: undefined,
  json: undefined,
  state: 'idle',
  text: undefined,
});

const loading = (formData?: FormData): Fetcher => ({
  data: undefined,
  formAction: undefined,
  formData,
  formEncType: undefined,
  formMethod: undefined,
  json: undefined,
  state: 'loading',
  text: undefined,
});

const submitting = (formData: FormData): Fetcher => ({
  data: undefined,
  formAction: '/skills/example',
  formData,
  formEncType: 'application/x-www-form-urlencoded',
  formMethod: 'POST',
  json: undefined,
  state: 'submitting',
  text: undefined,
});

const formDataWith = (entries: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
};

describe('isFetcherBusy', () => {
  test('is false when idle', () => {
    expect(isFetcherBusy(idle())).toBe(false);
  });

  test('is true when loading', () => {
    expect(isFetcherBusy(loading())).toBe(true);
  });

  test('is true when submitting', () => {
    expect(isFetcherBusy(submitting(formDataWith({ intent: 'save' })))).toBe(
      true,
    );
  });
});

describe('isFetcherFormPending', () => {
  test('is false when idle even if formData is absent', () => {
    expect(isFetcherFormPending(idle(), 'intent')).toBe(false);
  });

  test('is false when busy but the field is absent', () => {
    expect(
      isFetcherFormPending(submitting(formDataWith({ other: 'x' })), 'intent'),
    ).toBe(false);
  });

  test('is false when busy with no formData at all', () => {
    expect(isFetcherFormPending(loading(), 'intent')).toBe(false);
  });

  test('is false when the field value is an empty string', () => {
    expect(
      isFetcherFormPending(submitting(formDataWith({ intent: '' })), 'intent'),
    ).toBe(false);
  });

  test('is true when busy and the field carries a non-empty string', () => {
    expect(
      isFetcherFormPending(
        submitting(formDataWith({ intent: 'renameTag' })),
        'intent',
      ),
    ).toBe(true);
  });
});
