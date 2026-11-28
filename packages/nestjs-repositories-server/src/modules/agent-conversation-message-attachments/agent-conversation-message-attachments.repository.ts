import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { DeepPartial } from 'typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';

import { AgentConversationMessageAttachment } from './agent-conversation-message-attachment.entity.ts';
import type { CreateAgentConversationMessageAttachmentInput } from './agent-conversation-message-attachments.types.ts';

/**
 * @description Data access for the openthrottle `agent_conversation_message_attachments` table on
 * the default connection: the `BaseRepository` CRUD plus the upload-time create, the owner-scoped
 * reads, the link to a sent message and the sweep of uploads that were never sent. A delete is a
 * hard delete.
 * @public
 */
@Injectable()
export class AgentConversationMessageAttachmentsRepository extends BaseRepository<
  AgentConversationMessageAttachment,
  CreateAgentConversationMessageAttachmentInput
> {
  protected readonly tableName = 'agent_conversation_message_attachments';

  constructor(
    @InjectRepository(AgentConversationMessageAttachment)
    repository: Repository<AgentConversationMessageAttachment>,
  ) {
    super(repository);
  }

  /**
   * @description An upload always starts unlinked, so `messageId` is never part of the input.
   */
  protected override toEntityInput(
    input: CreateAgentConversationMessageAttachmentInput,
  ): DeepPartial<AgentConversationMessageAttachment> {
    return { ...input, messageId: null };
  }

  /**
   * @description Deletes the unlinked uploads (no message) created before `date` and returns how
   * many rows went. Linked rows are never touched.
   */
  async deleteUnlinkedOlderThan(date: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(date),
      messageId: IsNull(),
    });

    return result.affected ?? 0;
  }

  /**
   * @description One attachment by id, or null when it does not exist or belongs to another user.
   */
  async findOwnedById(
    id: string,
    userId: string,
  ): Promise<AgentConversationMessageAttachment | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  /**
   * @description The attachments among `ids` that the user owns; ids that are missing or owned
   * by someone else are left out. Empty input never queries.
   */
  async findOwnedByIds(
    ids: readonly string[],
    userId: string,
  ): Promise<AgentConversationMessageAttachment[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.repository.find({ where: { id: In([...ids]), userId } });
  }

  /**
   * @description Whether any row still points at this file hash, linked or not; false means the
   * file on disk is safe to delete.
   */
  async isShaReferenced(sha256: string): Promise<boolean> {
    return this.repository.exists({ where: { sha256 } });
  }

  /**
   * @description Links the user's still-unlinked attachments among `ids` to a message and
   * returns how many rows were linked. Rows owned by someone else, or already linked, are left
   * alone, so a caller compares the count with `ids.length`. Empty input never queries.
   */
  async linkToMessage(
    ids: readonly string[],
    messageId: string,
    userId: string,
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.repository.update(
      { id: In([...ids]), messageId: IsNull(), userId },
      { messageId },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Releases the user's attachments linked to `messageId` back to unlinked and
   * returns how many rows were released. Used when a turn that linked only some of its ids has to
   * be abandoned.
   */
  async unlinkFromMessage(messageId: string, userId: string): Promise<number> {
    const result = await this.repository.update(
      { messageId, userId },
      { messageId: null },
    );

    return result.affected ?? 0;
  }

  /**
   * @description The attachments linked to any of the messages, oldest first. Empty input never
   * queries.
   */
  async listByMessageIds(
    messageIds: readonly string[],
  ): Promise<AgentConversationMessageAttachment[]> {
    if (messageIds.length === 0) {
      return [];
    }

    return this.repository.find({
      order: { createdAt: 'ASC', id: 'ASC' },
      where: { messageId: In([...messageIds]) },
    });
  }
}
