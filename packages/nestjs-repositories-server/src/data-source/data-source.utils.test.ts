import { afterEach, describe, expect, it, vi } from 'vitest';

import { OPENTHROTTLE_ENTITIES } from './data-source.constants.ts';
import { getOpenThrottleTypeOrmOptions } from './data-source.utils.ts';

describe('getOpenThrottleTypeOrmOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers every openthrottle entity on a postgres DataSource', () => {
    const options = getOpenThrottleTypeOrmOptions();

    expect(options.type).toBe('postgres');
    expect(options.entities).toEqual([...OPENTHROTTLE_ENTITIES]);
  });

  describe('when POSTGRES_SLOW_QUERY_MS is a positive integer', () => {
    it('sets maxQueryExecutionTime to it', () => {
      vi.stubEnv('POSTGRES_SLOW_QUERY_MS', '250');

      expect(getOpenThrottleTypeOrmOptions().maxQueryExecutionTime).toBe(250);
    });
  });

  describe('when POSTGRES_SLOW_QUERY_MS is unset, blank or invalid', () => {
    it.each(['', '  ', '0', '-5', '1.5', 'slow'])(
      'leaves maxQueryExecutionTime unset for %j',
      (raw) => {
        vi.stubEnv('POSTGRES_SLOW_QUERY_MS', raw);

        expect(getOpenThrottleTypeOrmOptions()).not.toHaveProperty(
          'maxQueryExecutionTime',
        );
      },
    );
  });
});

describe('OPENTHROTTLE_ENTITIES', () => {
  it('lists each entity once', () => {
    expect(new Set(OPENTHROTTLE_ENTITIES).size).toBe(
      OPENTHROTTLE_ENTITIES.length,
    );
  });
});
