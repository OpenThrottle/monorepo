import { describe, it, expect } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '../events';

describe('events', () => {
  describe('NOTIFICATION_EVENT_NAMES', () => {
    it('should be an object', () => {
      expect(NOTIFICATION_EVENT_NAMES).toBeInstanceOf(Object);
    });
  });
});
