import { AgentConversationMessageAttachment } from '@openthrottle/nestjs-repositories-server';
import { describe, expect, it } from 'vitest';

import {
  groupAttachmentsByMessageId,
  toAgentConversationMessageAttachmentObject,
} from './agent-conversation.mapper.ts';

const buildRow = (
  overrides: Partial<AgentConversationMessageAttachment> = {},
): AgentConversationMessageAttachment => {
  return Object.assign(new AgentConversationMessageAttachment(), {
    byteSize: 2048,
    height: 20,
    id: 'att-1',
    messageId: 'msg-1',
    mimeType: 'image/png',
    originalName: 'shot.png',
    sha256: 'f'.repeat(64),
    userId: 'user-1',
    width: 10,
    ...overrides,
  });
};

describe('toAgentConversationMessageAttachmentObject', () => {
  it('exposes only the public image fields', () => {
    expect(toAgentConversationMessageAttachmentObject(buildRow())).toEqual({
      byteSize: 2048,
      height: 20,
      id: 'att-1',
      mimeType: 'image/png',
      originalName: 'shot.png',
      width: 10,
    });
  });

  it('keeps null dimensions and name', () => {
    const object = toAgentConversationMessageAttachmentObject(
      buildRow({ height: null, originalName: null, width: null }),
    );

    expect(object).toMatchObject({
      height: null,
      originalName: null,
      width: null,
    });
  });
});

describe('groupAttachmentsByMessageId', () => {
  it('is empty for no rows', () => {
    expect(groupAttachmentsByMessageId([]).size).toBe(0);
  });

  it('groups by message and keeps arrival order', () => {
    const grouped = groupAttachmentsByMessageId([
      buildRow({ id: 'a', messageId: 'm1' }),
      buildRow({ id: 'b', messageId: 'm2' }),
      buildRow({ id: 'c', messageId: 'm1' }),
    ]);

    expect(grouped.get('m1')?.map((item) => item.id)).toEqual(['a', 'c']);
    expect(grouped.get('m2')?.map((item) => item.id)).toEqual(['b']);
  });

  it('drops rows that are not linked to a message', () => {
    const grouped = groupAttachmentsByMessageId([
      buildRow({ id: 'a', messageId: null }),
    ]);

    expect(grouped.size).toBe(0);
  });
});
