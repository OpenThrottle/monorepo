/**
 * @description Topic-name convention for PubSub subscriptions, routed by name:
 * - instance-scoped: `<entity>:<id>:<facet>` (e.g. `plan:<planId>:output`)
 * - global-scoped:   `<entity>:<facet>`      (e.g. `system:alert`)
 *
 * The in-memory PubSub matches exact topic strings (no wildcards), so publishers
 * and subscribers must agree on the literal name — always build them here rather
 * than hand-formatting strings at call sites.
 */

/**
 * Build an instance-scoped topic name: `<entity>:<id>:<facet>`.
 *
 * @publicApi
 */
export function instanceTopic(
  entity: string,
  id: string,
  facet: string,
): string {
  return `${entity}:${id}:${facet}`;
}

/**
 * Build a global-scoped topic name: `<entity>:<facet>`.
 *
 * @publicApi
 */
export function globalTopic(entity: string, facet: string): string {
  return `${entity}:${facet}`;
}

/**
 * Topic carrying appended output chunks for a single plan: `plan:<planId>:output`.
 *
 * @publicApi
 */
export function planOutputTopic(planId: string): string {
  return instanceTopic('plan', planId, 'output');
}

/**
 * Lifecycle notifications for a single plan (status/task changes): `plan:<planId>:lifecycle`.
 *
 * @publicApi
 */
export function planLifecycleTopic(planId: string): string {
  return instanceTopic('plan', planId, 'lifecycle');
}

/**
 * Token deltas streamed for a single agent conversation: `conversation:<conversationId>:stream`.
 *
 * @publicApi
 */
export function conversationStreamTopic(conversationId: string): string {
  return instanceTopic('conversation', conversationId, 'stream');
}

/**
 * A user's personal notification feed: `user:<userId>:notifications`.
 *
 * @publicApi
 */
export function userNotificationsTopic(userId: string): string {
  return instanceTopic('user', userId, 'notifications');
}

/**
 * Global notification firehose (every notification event): `notifications:all`.
 *
 * @publicApi
 */
export function notificationsFirehoseTopic(): string {
  return globalTopic('notifications', 'all');
}

/**
 * Global system alerts: `system:alert`.
 *
 * @publicApi
 */
export function systemAlertTopic(): string {
  return globalTopic('system', 'alert');
}
