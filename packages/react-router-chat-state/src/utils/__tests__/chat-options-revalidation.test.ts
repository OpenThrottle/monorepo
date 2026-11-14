import {
  AGENT_CONVERSATIONS_ACTION,
  CONVERSATION_STREAM_ACTION,
} from '@openthrottle/react-router-chat';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { describe, expect, test } from 'vitest';

import {
  isChatConversationAction,
  shouldRevalidateChatOptions,
} from '../chat-options-revalidation';

const url = new URL('http://localhost/');

const args = (
  overrides: Partial<ShouldRevalidateFunctionArgs>,
): ShouldRevalidateFunctionArgs => {
  return {
    currentParams: {},
    currentUrl: url,
    defaultShouldRevalidate: true,
    nextParams: {},
    nextUrl: url,
    ...overrides,
  };
};

describe('isChatConversationAction', () => {
  test('matches the chat-turn and conversation-list actions', () => {
    expect(isChatConversationAction(CONVERSATION_STREAM_ACTION)).toBe(true);
    expect(isChatConversationAction(AGENT_CONVERSATIONS_ACTION)).toBe(true);
  });

  test('ignores the query string', () => {
    expect(isChatConversationAction(`${AGENT_CONVERSATIONS_ACTION}?x=1`)).toBe(
      true,
    );
  });

  test('rejects other actions and a missing action', () => {
    expect(isChatConversationAction('/settings/repositories')).toBe(false);
    expect(isChatConversationAction(undefined)).toBe(false);
  });
});

describe('shouldRevalidateChatOptions', () => {
  describe('when a chat-conversation action is submitted', () => {
    test('skips the chat-turn POST', () => {
      expect(
        shouldRevalidateChatOptions(
          args({ formAction: CONVERSATION_STREAM_ACTION, formMethod: 'POST' }),
        ),
      ).toBe(false);
    });

    test('skips the conversation-list POST', () => {
      expect(
        shouldRevalidateChatOptions(
          args({ formAction: AGENT_CONVERSATIONS_ACTION, formMethod: 'POST' }),
        ),
      ).toBe(false);
    });
  });

  describe('when any other action is submitted', () => {
    test('keeps the default so composer-affecting edits revalidate', () => {
      expect(
        shouldRevalidateChatOptions(
          args({ formAction: '/settings/repositories', formMethod: 'POST' }),
        ),
      ).toBe(true);
      expect(
        shouldRevalidateChatOptions(
          args({
            defaultShouldRevalidate: false,
            formAction: '/personas',
            formMethod: 'POST',
          }),
        ),
      ).toBe(false);
    });
  });

  describe('when nothing is submitted', () => {
    test('keeps the default (an explicit revalidate still reloads)', () => {
      expect(
        shouldRevalidateChatOptions(
          args({ formAction: CONVERSATION_STREAM_ACTION }),
        ),
      ).toBe(true);
    });
  });
});
