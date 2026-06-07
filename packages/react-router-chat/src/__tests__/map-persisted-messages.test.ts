import { buildAgentsChatAssistantFooter } from '../agents-chat-footer';
import {
  mapPersistedAgentConversationMessages,
  type PersistedAgentConversationMessage,
} from '../map-persisted-messages';

describe('mapPersistedAgentConversationMessages', () => {
  const baseMessage = (
    overrides: Partial<PersistedAgentConversationMessage> = {},
  ): PersistedAgentConversationMessage => ({
    content: 'Hello',
    createdAt: '2026-06-07T00:00:00.000Z',
    id: 'msg-1',
    role: 'user',
    routingConfidence: null,
    routingReason: null,
    toolMetadataJson: null,
    ...overrides,
  });

  test('maps user and assistant rows', () => {
    const messages = mapPersistedAgentConversationMessages([
      baseMessage({ content: 'Question', role: 'user' }),
      baseMessage({
        content: 'Answer',
        id: 'msg-2',
        role: 'assistant',
        routingConfidence: 0.9,
        routingReason: 'semantic_search_heuristic',
        toolMetadataJson: JSON.stringify({ tool: 'semantic_search' }),
      }),
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ body: 'Question', role: 'user' });
    expect(messages[1]).toMatchObject({ body: 'Answer', role: 'assistant' });
    expect(messages[1]?.footer).toBe(
      buildAgentsChatAssistantFooter({
        assistantText: 'Answer',
        conversationId: null,
        errorMessage: null,
        mcpTool: 'semantic_search',
        readOnlyAgentsChat: true,
        routingConfidence: 0.9,
        routingReason: 'semantic_search_heuristic',
        structuredPayloadJson: null,
        toolMetadataJson: JSON.stringify({ tool: 'semantic_search' }),
      }),
    );
  });

  test('skips unsupported roles such as tool', () => {
    const messages = mapPersistedAgentConversationMessages([
      baseMessage({ role: 'tool' }),
    ]);

    expect(messages).toHaveLength(0);
  });
});
