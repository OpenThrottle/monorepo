/**
 * @description TypeORM entity for the openthrottle `agent_conversation_message_attachments` table:
 * the metadata of one image uploaded for a chat message. A row exists from upload (`messageId`
 * null) and is linked to the persisted user message when the turn is sent; the bytes live on
 * disk, named by `sha256`. Extends `BaseHardDeleteModel` with its own `updatedAt`, since a link
 * updates the row. Matches databases/openthrottle/migrations (209).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

import type { AgentConversationMessage } from '../agent-conversation-messages/agent-conversation-message.entity.ts';
import type { User } from '../users/user.entity.ts';
import type { AgentConversationMessageAttachmentMimeTypesValue } from './agent-conversation-message-attachments.constants.ts';

@Entity('agent_conversation_message_attachments')
export class AgentConversationMessageAttachment extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'message_id', nullable: true, type: 'uuid' })
  messageId!: string | null;

  @Column({ name: 'sha256', type: 'text' })
  sha256!: string;

  @Column({ name: 'mime_type', type: 'text' })
  mimeType!: AgentConversationMessageAttachmentMimeTypesValue;

  @Column({ name: 'byte_size', type: 'integer' })
  byteSize!: number;

  @Column({ name: 'width', nullable: true, type: 'integer' })
  width!: number | null;

  @Column({ name: 'height', nullable: true, type: 'integer' })
  height!: number | null;

  @Column({ name: 'original_name', nullable: true, type: 'text' })
  originalName!: string | null;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne('AgentConversationMessage', {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message?: AgentConversationMessage | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
