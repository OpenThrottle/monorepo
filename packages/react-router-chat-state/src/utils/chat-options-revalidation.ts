import {
  AGENT_CONVERSATIONS_ACTION,
  CONVERSATION_STREAM_ACTION,
} from '@openthrottle/react-router-chat';
import type { ShouldRevalidateFunctionArgs } from 'react-router';

/**
 * @description Whether a submission to `formAction` is a chat-conversation
 * action — a chat turn (`/resources/conversation-stream`) or a
 * conversation-list read/edit (`/resources/agent-conversations`). They fire on
 * every message and on every chat mount, and never change models, agent CLIs,
 * repositories or personas, so discovery data stays valid across them. The
 * query string is ignored.
 * @public
 */
export function isChatConversationAction(
  formAction: string | undefined,
): boolean {
  if (formAction === undefined) {
    return false;
  }

  const pathname = formAction.split('?')[0];

  return (
    pathname === CONVERSATION_STREAM_ACTION ||
    pathname === AGENT_CONVERSATIONS_ACTION
  );
}

/**
 * @description `shouldRevalidate` for the `/resources/chat-options` resource
 * route. React Router revalidates every fetcher-loaded route after any action,
 * so without this the header ChatDialog re-requested its discovery options
 * after each chat turn and conversation-list fetch. Chat-conversation actions
 * ({@link isChatConversationAction}) skip it; every other submission — one that
 * may have added a repository or changed a persona — and an explicit
 * `revalidator.revalidate()` keep React Router's default.
 * @public
 */
export function shouldRevalidateChatOptions(
  args: ShouldRevalidateFunctionArgs,
): boolean {
  const { defaultShouldRevalidate, formAction, formMethod } = args;

  if (formMethod !== undefined && isChatConversationAction(formAction)) {
    return false;
  }

  return defaultShouldRevalidate;
}
