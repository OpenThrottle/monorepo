import type { PubSubEngine } from '@openthrottle/nestjs-graphql';
import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsSubscriptionResolver } from './notifications-subscription.resolver';

const iterator = { next: vi.fn(), return: vi.fn(), throw: vi.fn() };
const pubSub = createMock<PubSubEngine>({
  asyncIterator: vi.fn().mockReturnValue(iterator),
});

const resolver = new NotificationsSubscriptionResolver(pubSub);

describe('NotificationsSubscriptionResolver', () => {
  describe('notifications (firehose)', () => {
    it('subscribes to the firehose topic when authenticated', () => {
      const result = resolver.notifications({ userId: 'u1' });
      expect(pubSub.asyncIterator).toHaveBeenCalledWith('notifications:all');
      expect(result).toBe(iterator);
    });

    it('throws without an authenticated connection', () => {
      expect(() => resolver.notifications({})).toThrow(
        /authenticated connection/,
      );
    });
  });

  describe('planNotifications', () => {
    it('subscribes to the per-plan lifecycle topic when authenticated', () => {
      resolver.planNotifications('p1', { userId: 'u1' });
      expect(pubSub.asyncIterator).toHaveBeenCalledWith('plan:p1:lifecycle');
    });

    it('throws without an authenticated connection', () => {
      expect(() => resolver.planNotifications('p1', {})).toThrow(
        /authenticated connection/,
      );
    });
  });
});
