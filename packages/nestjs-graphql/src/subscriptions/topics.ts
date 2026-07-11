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
 * @public
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
 * @public
 */
export function globalTopic(entity: string, facet: string): string {
  return `${entity}:${facet}`;
}

/**
 * Topic carrying appended output chunks for a single plan: `plan:<planId>:output`.
 *
 * @public
 */
export function planOutputTopic(planId: string): string {
  return instanceTopic('plan', planId, 'output');
}

/**
 * Lifecycle notifications for a single plan (status/task changes): `plan:<planId>:lifecycle`.
 *
 * @public
 */
export function planLifecycleTopic(planId: string): string {
  return instanceTopic('plan', planId, 'lifecycle');
}

/**
 * Token deltas streamed for a single agent conversation: `conversation:<conversationId>:stream`.
 *
 * @public
 */
export function conversationStreamTopic(conversationId: string): string {
  return instanceTopic('conversation', conversationId, 'stream');
}

/**
 * Live transcript snapshots for a single transcription session:
 * `transcription:<sessionId>:stream`.
 *
 * @public
 */
export function transcriptionStreamTopic(sessionId: string): string {
  return instanceTopic('transcription', sessionId, 'stream');
}

/**
 * A user's personal notification feed: `user:<userId>:notifications`.
 *
 * @public
 */
export function userNotificationsTopic(userId: string): string {
  return instanceTopic('user', userId, 'notifications');
}

/**
 * Global notification firehose (every notification event): `notifications:all`.
 *
 * @public
 */
export function notificationsFirehoseTopic(): string {
  return globalTopic('notifications', 'all');
}

/**
 * Global system alerts: `system:alert`.
 *
 * @public
 */
export function systemAlertTopic(): string {
  return globalTopic('system', 'alert');
}
