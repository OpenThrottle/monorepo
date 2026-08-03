import { beforeEach, describe, expect, test } from 'vitest';
import {
  getOrCreateRolloutAnonymousId,
  ROLLOUT_ANONYMOUS_ID_STORAGE_KEY,
} from '../rollout-anonymous-id';

describe('getOrCreateRolloutAnonymousId', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('when no id is stored', () => {
    test('creates and persists a UUID', () => {
      const id = getOrCreateRolloutAnonymousId();
      expect(id).toEqual(expect.any(String));
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(
        window.localStorage.getItem(ROLLOUT_ANONYMOUS_ID_STORAGE_KEY),
      ).toBe(id);
    });
  });

  describe('when an id is already stored', () => {
    test('returns the existing value', () => {
      window.localStorage.setItem(
        ROLLOUT_ANONYMOUS_ID_STORAGE_KEY,
        '11111111-1111-4111-8111-111111111111',
      );
      expect(getOrCreateRolloutAnonymousId()).toBe(
        '11111111-1111-4111-8111-111111111111',
      );
    });
  });
});
