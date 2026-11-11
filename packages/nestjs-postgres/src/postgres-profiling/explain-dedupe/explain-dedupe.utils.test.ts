import { beforeEach, describe, expect, it } from 'vitest';

import { POSTGRES_PROFILING_DEDUPE_MAX_ENTRIES } from '../postgres-profiling.constants.ts';
import {
  buildPostgresProfilingDedupeKey,
  resetPostgresProfilingDedupe,
  shouldExplainPostgresStatement,
} from './explain-dedupe.utils.ts';

const WINDOW_MS = 1000;

describe('postgres explain dedupe store', () => {
  beforeEach(() => {
    resetPostgresProfilingDedupe();
  });

  describe('#buildPostgresProfilingDedupeKey', () => {
    it('joins class, method and SQL', () => {
      expect(
        buildPostgresProfilingDedupeKey(
          'UserRepository',
          'findById',
          'SELECT 1',
        ),
      ).toBe('UserRepository.findById\nSELECT 1');
    });

    it('differs when only the SQL differs', () => {
      expect(buildPostgresProfilingDedupeKey('A', 'm', 'SELECT 1')).not.toBe(
        buildPostgresProfilingDedupeKey('A', 'm', 'SELECT 2'),
      );
    });
  });

  describe('#shouldExplainPostgresStatement', () => {
    it('allows a key it has not seen', () => {
      expect(shouldExplainPostgresStatement('a', 0, WINDOW_MS)).toBe(true);
    });

    it('rejects the same key inside the window', () => {
      shouldExplainPostgresStatement('a', 0, WINDOW_MS);

      expect(
        shouldExplainPostgresStatement('a', WINDOW_MS - 1, WINDOW_MS),
      ).toBe(false);
    });

    it('allows the same key once the window has elapsed', () => {
      shouldExplainPostgresStatement('a', 0, WINDOW_MS);

      expect(shouldExplainPostgresStatement('a', WINDOW_MS, WINDOW_MS)).toBe(
        true,
      );
    });

    it('restarts the window from the latest explain', () => {
      shouldExplainPostgresStatement('a', 0, WINDOW_MS);
      shouldExplainPostgresStatement('a', WINDOW_MS, WINDOW_MS);

      expect(
        shouldExplainPostgresStatement('a', WINDOW_MS * 2 - 1, WINDOW_MS),
      ).toBe(false);
    });

    it('does not extend the window when it rejects', () => {
      shouldExplainPostgresStatement('a', 0, WINDOW_MS);
      shouldExplainPostgresStatement('a', WINDOW_MS - 1, WINDOW_MS);

      expect(shouldExplainPostgresStatement('a', WINDOW_MS, WINDOW_MS)).toBe(
        true,
      );
    });

    it('tracks keys independently', () => {
      shouldExplainPostgresStatement('a', 0, WINDOW_MS);

      expect(shouldExplainPostgresStatement('b', 1, WINDOW_MS)).toBe(true);
    });

    describe('when the window is 0', () => {
      it('always allows and records nothing', () => {
        expect(shouldExplainPostgresStatement('a', 0, 0)).toBe(true);
        expect(shouldExplainPostgresStatement('a', 0, 0)).toBe(true);
        expect(shouldExplainPostgresStatement('a', 1, WINDOW_MS)).toBe(true);
      });
    });

    describe('when the store is full', () => {
      const fill = (): void => {
        for (
          let index = 0;
          index < POSTGRES_PROFILING_DEDUPE_MAX_ENTRIES;
          index++
        ) {
          shouldExplainPostgresStatement(`key-${index}`, 0, WINDOW_MS);
        }
      };

      it('evicts the oldest key and keeps the rest', () => {
        fill();
        shouldExplainPostgresStatement('newest', 0, WINDOW_MS);

        expect(shouldExplainPostgresStatement('key-0', 1, WINDOW_MS)).toBe(
          true,
        );
        expect(shouldExplainPostgresStatement('key-2', 1, WINDOW_MS)).toBe(
          false,
        );
      });

      it('treats a re-explained key as newest', () => {
        fill();
        shouldExplainPostgresStatement('key-0', WINDOW_MS, WINDOW_MS);
        shouldExplainPostgresStatement('newest', WINDOW_MS, WINDOW_MS);

        expect(
          shouldExplainPostgresStatement('key-0', WINDOW_MS + 1, WINDOW_MS),
        ).toBe(false);
        expect(
          shouldExplainPostgresStatement('key-1', WINDOW_MS + 1, WINDOW_MS),
        ).toBe(true);
      });
    });
  });
});
