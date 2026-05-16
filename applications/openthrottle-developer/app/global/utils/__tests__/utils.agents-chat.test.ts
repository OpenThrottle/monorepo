import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { SendAgentMessageDocument } from '@openthrottle/openthrottle-developer-codegen';
import type { ChatTurnResult } from '@openthrottle/react-router-chat';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  callSendAgentMessage,
  handleSendAgentMessageIntent,
} from '../utils.agents-chat';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const baseTurn = (overrides: Partial<ChatTurnResult> = {}): ChatTurnResult => ({
  assistantText: null,
  conversationId: null,
  errorMessage: null,
  mcpTool: null,
  readOnlyAgentsChat: true,
  routingConfidence: null,
  routingReason: null,
  structuredPayloadJson: null,
  toolMetadataJson: null,
  ...overrides,
});

describe('callSendAgentMessage', () => {
  const request = new Request('http://localhost/', {
    headers: { cookie: 'auth_token=test-token' },
  });

  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('calls agentsRunChatTurn with parsed input and maps result fields', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: 'Hello from the agent',
        conversationId: 'conv-1',
        errorMessage: null,
        mcpTool: 'semantic_search',
        readOnlyAgentsChat: true,
        routingConfidence: 0.33,
        routingReason: 'default_semantic_search',
        structuredPayloadJson: '{"hits":[]}',
        toolMetadataJson: '{"tool":"semantic_search"}',
      },
    });

    const result = await callSendAgentMessage(request, {
      conversationId: 'conv-1',
      message: 'What plans are in progress?',
    });

    expect(mockExecute).toHaveBeenCalledWith(
      request,
      SendAgentMessageDocument,
      {
        input: {
          conversationId: 'conv-1',
          message: 'What plans are in progress?',
        },
      },
    );
    expect(result).toEqual(
      baseTurn({
        assistantText: 'Hello from the agent',
        conversationId: 'conv-1',
        mcpTool: 'semantic_search',
        routingConfidence: 0.33,
        routingReason: 'default_semantic_search',
        structuredPayloadJson: '{"hits":[]}',
        toolMetadataJson: '{"tool":"semantic_search"}',
      }),
    );
  });

  test('omits conversationId when not provided', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: 'ok',
        errorMessage: null,
        mcpTool: null,
        readOnlyAgentsChat: true,
        structuredPayloadJson: null,
        toolMetadataJson: null,
      },
    });

    await callSendAgentMessage(request, { message: 'Hi' });

    expect(mockExecute).toHaveBeenCalledWith(
      request,
      SendAgentMessageDocument,
      {
        input: { message: 'Hi' },
      },
    );
  });

  test('normalizes undefined GraphQL fields to null', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {},
    });

    const result = await callSendAgentMessage(request, { message: 'Hi' });

    expect(result).toEqual(baseTurn());
  });

  test('surfaces server turn errors in errorMessage', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: null,
        errorMessage: 'Agent unavailable',
        mcpTool: null,
        readOnlyAgentsChat: true,
        structuredPayloadJson: null,
        toolMetadataJson: null,
      },
    });

    const result = await callSendAgentMessage(request, { message: 'Hi' });

    expect(result.errorMessage).toBe('Agent unavailable');
    expect(result.assistantText).toBeNull();
  });
});

describe('handleSendAgentMessageIntent', () => {
  const request = new Request('http://localhost/', {
    headers: { cookie: 'auth_token=test-token' },
  });

  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns validation error when message is empty', async () => {
    const formData = new FormData();
    formData.set('intent', 'send-agent-message');
    formData.set('message', '   ');

    const result = await handleSendAgentMessageIntent(request, formData);

    expect(result).toEqual(baseTurn({ errorMessage: 'Message is required' }));
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('echoes conversationId on validation failure when provided', async () => {
    const formData = new FormData();
    formData.set('intent', 'send-agent-message');
    formData.set('message', '   ');
    formData.set('conversationId', 'thread-x');

    const result = await handleSendAgentMessageIntent(request, formData);

    expect(result).toEqual(
      baseTurn({
        conversationId: 'thread-x',
        errorMessage: 'Message is required',
      }),
    );
  });

  test('calls agentsRunChatTurn and returns ChatTurnResult JSON', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: 'Done',
        conversationId: 'thread-1',
        errorMessage: null,
        mcpTool: 'list_plans_by_status',
        readOnlyAgentsChat: true,
        routingConfidence: 0.9,
        routingReason: 'list_plans_by_status_heuristic',
        structuredPayloadJson: null,
        toolMetadataJson: null,
      },
    });

    const formData = new FormData();
    formData.set('message', 'List pending plans');
    formData.set('conversationId', 'thread-1');

    const result = await handleSendAgentMessageIntent(request, formData);

    expect(mockExecute).toHaveBeenCalledWith(
      request,
      SendAgentMessageDocument,
      {
        input: {
          conversationId: 'thread-1',
          message: 'List pending plans',
        },
      },
    );
    expect(result).toEqual(
      baseTurn({
        assistantText: 'Done',
        conversationId: 'thread-1',
        mcpTool: 'list_plans_by_status',
        routingConfidence: 0.9,
        routingReason: 'list_plans_by_status_heuristic',
      }),
    );
  });

  test('maps GraphQL failures to errorMessage without throwing', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Unauthorized'));

    const formData = new FormData();
    formData.set('message', 'Hi');

    const result = await handleSendAgentMessageIntent(request, formData);

    expect(result).toEqual(baseTurn({ errorMessage: 'Unauthorized' }));
  });
});
