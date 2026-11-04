import {
  type ChatStartActionResult,
  createConversationStreamAction,
} from '@openthrottle/react-router-chat';

import type { Route } from '@/app/routes/+types/resources.conversation-stream';
import {
  CancelConversationStreamDocument,
  StartConversationStreamDocument,
} from '~/__generated__/graphql';

/**
 * Resource route action backing the agentic chat's streaming turn —
 * `POST /resources/conversation-stream`. Route-independent so BOTH the home
 * route and the globally-mounted header `ChatDialog` post here. The action body
 * is single-sourced in `@openthrottle/react-router-chat`
 * ({@link createConversationStreamAction}); this route only supplies the app's
 * generated Start/Cancel documents.
 */
export const action = (
  args: Route.ActionArgs,
): Promise<ChatStartActionResult | { cancelled: boolean }> =>
  createConversationStreamAction({
    cancelDocument: CancelConversationStreamDocument,
    startDocument: StartConversationStreamDocument,
  })(args);
