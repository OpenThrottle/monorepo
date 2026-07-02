import { describe, expect, it } from 'vitest';
import {
  conversationStreamTopic,
  globalTopic,
  instanceTopic,
  notificationsFirehoseTopic,
  planLifecycleTopic,
  planOutputTopic,
  systemAlertTopic,
  transcriptionStreamTopic,
  userNotificationsTopic,
} from './topics';

describe('instanceTopic', () => {
  it('formats as <entity>:<id>:<facet>', () => {
    expect(instanceTopic('plan', 'abc-123', 'output')).toBe(
      'plan:abc-123:output',
    );
  });
});

describe('globalTopic', () => {
  it('formats as <entity>:<facet>', () => {
    expect(globalTopic('system', 'alert')).toBe('system:alert');
  });
});

describe('named topic builders lock the wire-format convention', () => {
  it('planOutputTopic → plan:<planId>:output', () => {
    expect(planOutputTopic('p1')).toBe('plan:p1:output');
  });

  it('planLifecycleTopic → plan:<planId>:lifecycle', () => {
    expect(planLifecycleTopic('p1')).toBe('plan:p1:lifecycle');
  });

  it('conversationStreamTopic → conversation:<conversationId>:stream', () => {
    expect(conversationStreamTopic('c1')).toBe('conversation:c1:stream');
  });

  it('transcriptionStreamTopic → transcription:<sessionId>:stream', () => {
    expect(transcriptionStreamTopic('s1')).toBe('transcription:s1:stream');
  });

  it('userNotificationsTopic → user:<userId>:notifications', () => {
    expect(userNotificationsTopic('u1')).toBe('user:u1:notifications');
  });

  it('notificationsFirehoseTopic → notifications:all', () => {
    expect(notificationsFirehoseTopic()).toBe('notifications:all');
  });

  it('systemAlertTopic → system:alert', () => {
    expect(systemAlertTopic()).toBe('system:alert');
  });
});
