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

  test('hydrates structured events for an assistant turn with persisted tool metadata', () => {
    const [message] = mapPersistedAgentConversationMessages([
      baseMessage({
        content: 'the final answer',
        id: 'msg-rich',
        role: 'assistant',
        toolMetadataJson: JSON.stringify({
          events: [
            { delta: 'thinking hard', kind: 'thinking', metadata: null },
            {
              delta: '',
              kind: 'tool_call',
              metadata: { callId: 'c1', toolCall: { readToolCall: {} } },
            },
            {
              delta: '',
              kind: 'tool_result',
              metadata: {
                callId: 'c1',
                toolCall: { readToolCall: { ok: true } },
              },
            },
          ],
        }),
      }),
    ]);

    expect(message?.events).toBeDefined();
    expect(message?.events?.some((e) => e.kind === 'thinking')).toBe(true);
    expect(message?.events?.some((e) => e.kind === 'tool')).toBe(true);
    // body still preserved as a trailing text segment + flat fallback
    expect(message?.events?.some((e) => e.kind === 'text')).toBe(true);
    expect(message?.body).toBe('the final answer');
  });

  test('omits events for a plain assistant turn (flat body fallback)', () => {
    const [message] = mapPersistedAgentConversationMessages([
      baseMessage({
        content: 'just text',
        id: 'msg-plain',
        role: 'assistant',
        toolMetadataJson: JSON.stringify({ tool: 'semantic_search' }),
      }),
    ]);

    expect(message?.events).toBeUndefined();
    expect(message?.body).toBe('just text');
  });
});
