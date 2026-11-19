import { describe, expect, it } from 'vitest';

import { OPENTHROTTLE_ENTITIES } from './data-source.constants.ts';
import { getOpenThrottleTypeOrmOptions } from './data-source.utils.ts';

const POSTGRES_URL = 'postgresql://user:secret@localhost:5432/openthrottle';

describe('getOpenThrottleTypeOrmOptions', () => {
  it('registers every openthrottle entity on a postgres DataSource', () => {
    const options = getOpenThrottleTypeOrmOptions({ POSTGRES_URL });

    expect(options.type).toBe('postgres');
    expect(options).toHaveProperty('url', POSTGRES_URL);
    expect(options.entities).toEqual([...OPENTHROTTLE_ENTITIES]);
  });

  describe('when POSTGRES_SLOW_QUERY_MS is a positive integer', () => {
    it('sets maxQueryExecutionTime to it', () => {
      const options = getOpenThrottleTypeOrmOptions({
        POSTGRES_SLOW_QUERY_MS: '250',
        POSTGRES_URL,
      });

      expect(options.maxQueryExecutionTime).toBe(250);
    });
  });

  describe('when POSTGRES_SLOW_QUERY_MS is unset, blank or invalid', () => {
    it.each([undefined, '', '  ', '0', '-5', '1.5', 'slow'])(
      'leaves maxQueryExecutionTime unset for %j',
      (raw) => {
        const options = getOpenThrottleTypeOrmOptions({
          POSTGRES_SLOW_QUERY_MS: raw,
          POSTGRES_URL,
        });

        expect(options).not.toHaveProperty('maxQueryExecutionTime');
      },
    );
  });

  describe('when no connection is configured', () => {
    it('throws rather than defaulting to a database', () => {
      expect(() => {
        return getOpenThrottleTypeOrmOptions({});
      }).toThrow(/Postgres environment variables are not set/);
    });
  });
});

describe('OPENTHROTTLE_ENTITIES', () => {
  it('lists each entity once', () => {
    expect(new Set(OPENTHROTTLE_ENTITIES).size).toBe(
      OPENTHROTTLE_ENTITIES.length,
    );
  });
});
