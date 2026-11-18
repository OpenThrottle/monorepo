/**
 * @description Retention policy for soft-deleted `agent_conversations` and, by
 * cascade, their `agent_conversation_messages`.
 *
 * Deleting a conversation in the product only flips `status` to `'deleted'`
 * (`AgentConversationsService.softDeleteConversation`): the row and every
 * message stay, so a delete is reversible. Nothing ever hard-deleted them, so
 * the audited database held 144 deleted conversations next to 62 active ones.
 *
 * Purges a conversation once it has been `'deleted'` for 30 days. `updated_at`
 * is an `@UpdateDateColumn`, so the soft delete itself stamps it and the window
 * is measured from the delete, not from the conversation's last message. A
 * conversation restored inside the window leaves `'deleted'` and is never
 * touched. `active` and `archived` conversations are out of scope at any age.
 *
 * Dependents: messages declare `ON DELETE CASCADE` and go with the conversation.
 * `agent_token_usage` and `work_sessions` reference it `ON DELETE SET NULL`, so
 * usage reporting and the work ledger keep their rows and lose only the link.
 */

import type { DataSource } from 'typeorm';

import type { RetentionPolicy } from '../data-retention.types.ts';

/** Days a soft-deleted conversation stays restorable before it is purged. */
const DELETED_RETENTION_DAYS = 30;

const EXPIRED_CONVERSATION_IDS = `
  SELECT id
    FROM agent_conversations
   WHERE status = 'deleted'
     AND updated_at < now() - make_interval(days => $1)
`;

export const agentConversationsPolicy: RetentionPolicy = {
  countExpired: async (dataSource: DataSource): Promise<number> => {
    const rows: Array<{ count: string }> = await dataSource.query(
      `SELECT count(*)::text AS count FROM (${EXPIRED_CONVERSATION_IDS}) expired`,
      [DELETED_RETENTION_DAYS],
    );

    return Number(rows[0]?.count ?? 0);
  },

  deleteBatch: async (
    dataSource: DataSource,
    limit: number,
  ): Promise<number> => {
    const rows: Array<{ id: string }> = await dataSource.query(
      `DELETE FROM agent_conversations
        WHERE id IN (SELECT id FROM (${EXPIRED_CONVERSATION_IDS} LIMIT $2) batch)
        RETURNING id`,
      [DELETED_RETENTION_DAYS, limit],
    );

    return rows.length;
  },

  description: `delete conversations (cascading to their messages) ${DELETED_RETENTION_DAYS} days after they were soft-deleted; never touch active or archived ones`,

  name: 'agent-conversations',

  table: 'agent_conversations',
};
