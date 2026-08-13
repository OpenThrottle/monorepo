import {
  createConversationStreamAction,
  type ChatStartActionResult,
} from '@openthrottle/react-router-chat';
import {
  CancelConversationStreamDocument,
  StartConversationStreamDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.conversation-stream';

/**
 * Resource route action backing the admin header chat's streaming turn —
 * `POST /resources/conversation-stream`. The action body is single-sourced in
 * `@openthrottle/react-router-chat` ({@link createConversationStreamAction});
 * this route only supplies the app's generated Start/Cancel documents.
 */
export const action = (
  args: Route.ActionArgs,
): Promise<ChatStartActionResult | { cancelled: boolean }> =>
  createConversationStreamAction({
    cancelDocument: CancelConversationStreamDocument,
    startDocument: StartConversationStreamDocument,
  })(args);
