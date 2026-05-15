import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { SendAgentMessageDocument } from '@openthrottle/openthrottle-developer-codegen';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  callSendAgentMessage,
  handleSendAgentMessageIntent,
} from '../utils.agents-chat';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

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
        errorMessage: null,
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
    expect(result).toEqual({
      assistantText: 'Hello from the agent',
      errorMessage: null,
      toolMetadataJson: '{"tool":"semantic_search"}',
    });
  });

  test('omits conversationId when not provided', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: 'ok',
        errorMessage: null,
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

    expect(result).toEqual({
      assistantText: null,
      errorMessage: null,
      toolMetadataJson: null,
    });
  });

  test('surfaces server turn errors in errorMessage', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: null,
        errorMessage: 'Agent unavailable',
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

    expect(result).toEqual({
      assistantText: null,
      errorMessage: 'Message is required',
      toolMetadataJson: null,
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('calls agentsRunChatTurn and returns ChatTurnResult JSON', async () => {
    mockExecute.mockResolvedValueOnce({
      agentsRunChatTurn: {
        assistantText: 'Done',
        errorMessage: null,
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
    expect(result).toEqual({
      assistantText: 'Done',
      errorMessage: null,
      toolMetadataJson: null,
    });
  });

  test('maps GraphQL failures to errorMessage without throwing', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Unauthorized'));

    const formData = new FormData();
    formData.set('message', 'Hi');

    const result = await handleSendAgentMessageIntent(request, formData);

    expect(result).toEqual({
      assistantText: null,
      errorMessage: 'Unauthorized',
      toolMetadataJson: null,
    });
  });
});
