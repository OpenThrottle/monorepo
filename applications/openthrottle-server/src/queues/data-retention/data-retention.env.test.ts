import { describe, expect, it } from 'vitest';
import {
  DATA_RETENTION_DEFAULT_CRON_PATTERN,
  resolveDataRetentionConfig,
} from './data-retention.env';

describe('resolveDataRetentionConfig', () => {
  it('defaults to dry-run with the nightly cron and UTC', () => {
    expect(resolveDataRetentionConfig({})).toStrictEqual({
      cronPattern: DATA_RETENTION_DEFAULT_CRON_PATTERN,
      enforce: false,
      tz: undefined,
    });
  });

  it.each([
    ['true', true],
    ['TRUE', true],
    ['  true  ', true],
    ['false', false],
    ['1', false],
    ['yes', false],
    ['on', false],
    ['', false],
    ['ture', false],
  ])('reads DATA_RETENTION_ENFORCE=%j as enforce=%s', (value, expected) => {
    expect(
      resolveDataRetentionConfig({ DATA_RETENTION_ENFORCE: value }).enforce,
    ).toBe(expected);
  });

  it('overrides the cron pattern and timezone', () => {
    expect(
      resolveDataRetentionConfig({
        DATA_RETENTION_CRON: '0 0 5 * * *',
        DATA_RETENTION_TZ: 'America/New_York',
      }),
    ).toMatchObject({
      cronPattern: '0 0 5 * * *',
      tz: 'America/New_York',
    });
  });

  it('falls back to the default cron when the override is blank', () => {
    expect(
      resolveDataRetentionConfig({
        DATA_RETENTION_CRON: '   ',
        DATA_RETENTION_TZ: '  ',
      }),
    ).toStrictEqual({
      cronPattern: DATA_RETENTION_DEFAULT_CRON_PATTERN,
      enforce: false,
      tz: undefined,
    });
  });
});
