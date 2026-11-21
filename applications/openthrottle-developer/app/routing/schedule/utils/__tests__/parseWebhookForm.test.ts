import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';

import { parseWebhookForm } from '../parseWebhookForm';

const formOf = (entries: [string, string][]): FormData => {
  const form = new FormData();
  for (const [key, value] of entries) {
    form.append(key, value);
  }
  return form;
};

describe('parseWebhookForm', () => {
  test('reads the numbers, converts the coalesce window to ms and the checkbox to a boolean', () => {
    const parsed = parseWebhookForm(
      formOf([
        ['signaturePreset', 'github'],
        ['coalesceWindowSeconds', '30'],
        ['rateLimitPerMinute', '10'],
        ['maxInFlight', '2'],
        ['enabled', 'true'],
      ]),
    );

    expect(parsed).toMatchObject({
      input: {
        coalesceWindowMs: 30_000,
        enabled: true,
        maxInFlight: 2,
        rateLimitPerMinute: 10,
        signaturePreset: 'github',
      },
      ok: true,
    });
  });

  test('sends custom header fields only for the custom preset', () => {
    const generic = parseWebhookForm(
      formOf([
        ['signaturePreset', 'generic'],
        ['signatureHeader', 'X-Sig'],
      ]),
    );
    const custom = parseWebhookForm(
      formOf([
        ['signaturePreset', 'custom'],
        ['signatureHeader', 'X-Sig'],
        ['signatureEncoding', 'base64'],
        ['timestampHeader', ''],
      ]),
    );

    expect(generic).toMatchObject({
      input: { signatureHeader: undefined },
      ok: true,
    });
    expect(custom).toMatchObject({
      input: {
        signatureEncoding: 'base64',
        signatureHeader: 'X-Sig',
        timestampHeader: null,
      },
      ok: true,
    });
  });

  test('requires a signature header for custom', () => {
    expect(parseWebhookForm(formOf([['signaturePreset', 'custom']]))).toEqual({
      error: SCHEDULE_WEBHOOK_COPY.signatureHeaderError,
      ok: false,
    });
  });

  test('parses each filter shape and skips blank rows', () => {
    const parsed = parseWebhookForm(
      formOf([
        ['filterPath', 'action'],
        ['filterOp', 'in'],
        ['filterValue', 'opened, reopened ,'],
        ['filterPath', 'pull_request'],
        ['filterOp', 'exists'],
        ['filterValue', ''],
        ['filterPath', 'ref'],
        ['filterOp', 'prefix'],
        ['filterValue', 'refs/heads/'],
        ['filterPath', ''],
        ['filterOp', 'equals'],
        ['filterValue', ''],
      ]),
    );

    expect(parsed).toMatchObject({
      input: {
        filters: [
          { op: 'in', path: 'action', values: ['opened', 'reopened'] },
          { op: 'exists', path: 'pull_request' },
          { op: 'prefix', path: 'ref', value: 'refs/heads/' },
        ],
      },
      ok: true,
    });
  });

  test('rejects an `in` filter with no values and a comparison with no value', () => {
    expect(
      parseWebhookForm(
        formOf([
          ['filterPath', 'a'],
          ['filterOp', 'in'],
          ['filterValue', ' , '],
        ]),
      ),
    ).toEqual({ error: SCHEDULE_WEBHOOK_COPY.filterInError, ok: false });
    expect(
      parseWebhookForm(
        formOf([
          ['filterPath', 'a'],
          ['filterOp', 'equals'],
          ['filterValue', ''],
        ]),
      ),
    ).toEqual({ error: SCHEDULE_WEBHOOK_COPY.filterValueError, ok: false });
  });

  test('rejects more than 16 filters', () => {
    const entries = Array.from({ length: 17 }, (_, i): [string, string][] => [
      ['filterPath', `p${i}`],
      ['filterOp', 'exists'],
      ['filterValue', ''],
    ]).flat();

    expect(parseWebhookForm(formOf(entries))).toEqual({
      error: SCHEDULE_WEBHOOK_COPY.filterCountError,
      ok: false,
    });
  });
});
