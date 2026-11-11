import { describe, expect, it } from 'vitest';

import type { PostgresProfilingEnabledSettings } from '../postgres-profiling.types.ts';
import { resolveExplainOptions } from './explain-runner.utils.ts';

const analyzeSettings: PostgresProfilingEnabledSettings = {
  analyze: true,
  dedupeWindowSeconds: 300,
  enabled: true,
  invalidTargets: [],
  minDurationMs: 0,
  output: { mode: 'logger' },
  targets: [],
};
const plainSettings: PostgresProfilingEnabledSettings = {
  ...analyzeSettings,
  analyze: false,
};

const ANALYZE_OPTIONS = ['ANALYZE', 'BUFFERS', 'SUMMARY', 'FORMAT JSON'];
const PLAIN_OPTIONS = ['FORMAT JSON', 'SUMMARY'];

describe('resolveExplainOptions', () => {
  describe('when the env enables analyze', () => {
    it.each([
      'SELECT * FROM users WHERE id = $1',
      'select 1',
      '  (SELECT 1)',
      '\nSELECT u.id FROM users u ORDER BY u.id LIMIT 5',
    ])('analyzes the plain SELECT %j', (query) => {
      expect(resolveExplainOptions(analyzeSettings, {}, query)).toEqual(
        ANALYZE_OPTIONS,
      );
    });

    it.each([
      'SELECT * FROM users FOR UPDATE',
      'select * from users for update',
      'SELECT * FROM users FOR  NO KEY UPDATE',
      'SELECT * FROM users\nFOR\tSHARE',
      'SELECT * FROM users FOR KEY SHARE',
      'SELECT * FROM users FOR UPDATE SKIP LOCKED',
    ])('keeps plain EXPLAIN for the locking read %j', (query) => {
      expect(resolveExplainOptions(analyzeSettings, {}, query)).toEqual(
        PLAIN_OPTIONS,
      );
    });

    it.each([
      'WITH moved AS (DELETE FROM users RETURNING *) SELECT * FROM moved',
      'with a as (select 1) select * from a',
      'INSERT INTO users (id) VALUES (1)',
      'UPDATE users SET a = 1',
      'DELETE FROM users',
      'MERGE INTO users USING t ON true WHEN MATCHED THEN DO NOTHING',
      'VALUES (1)',
      'SELECT * INTO backup_users FROM users',
    ])('keeps plain EXPLAIN for %j', (query) => {
      expect(resolveExplainOptions(analyzeSettings, {}, query)).toEqual(
        PLAIN_OPTIONS,
      );
    });

    it('does not treat an identifier that merely contains a keyword as a locking clause', () => {
      expect(
        resolveExplainOptions(
          analyzeSettings,
          {},
          'SELECT before_update, for_share FROM users',
        ),
      ).toEqual(ANALYZE_OPTIONS);
    });
  });

  describe('when the env leaves analyze off', () => {
    it.each(['SELECT 1', 'DELETE FROM users'])('never analyzes %j', (query) => {
      expect(resolveExplainOptions(plainSettings, {}, query)).toEqual(
        PLAIN_OPTIONS,
      );
    });
  });

  describe('when the method opts out with analyze: false', () => {
    it('keeps plain EXPLAIN for a plain SELECT even though the env enables analyze', () => {
      expect(
        resolveExplainOptions(analyzeSettings, { analyze: false }, 'SELECT 1'),
      ).toEqual(PLAIN_OPTIONS);
    });

    it('cannot turn analyze on when the env leaves it off', () => {
      expect(
        resolveExplainOptions(plainSettings, { analyze: false }, 'SELECT 1'),
      ).toEqual(PLAIN_OPTIONS);
    });
  });
});
