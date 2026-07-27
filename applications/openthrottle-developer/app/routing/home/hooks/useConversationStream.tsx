/**
 * @description Live conversation stream for the home chat. Mirrors
 * usePlanOutputStream's loader-seed + subscription-delta pattern: history comes
 * from the loader (seedMessages), token deltas arrive via the
 * conversationStreamChunkAdded subscription and accumulate into an assistant
 * message keyed by messageId, dedup'd by chunk sortOrder. SSR-safe: with no
 * browser ws client the hook returns just the seed. When the loader later
 * revalidates and the persisted assistant row (same id) appears in seedMessages,
 * the seed version wins (dedup by id).
 *
 * The pure accumulation (reduceStreamChunk / toThreadMessages / StreamState)
 * lives in `@openthrottle/react-router-chat` so it can be shared; this hook is
 * the thin, app-specific shell that wires the app's graphql-ws client + the
 * generated subscription document to that reducer.
 */
import * as React from 'react';
import type { ChatMessage } from '@openthrottle/react-router-chat';
import {
  INITIAL_STREAM_STATE,
  reduceStreamChunk,
  toThreadMessages,
} from '@openthrottle/react-router-chat';
import type { StreamState } from '@openthrottle/react-router-chat';
import { useSubscription } from '@openthrottle/react-router-graphql';
import type { ConversationStreamChunkAddedSubscription } from '~/__generated__/graphql';
import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export interface UseConversationStreamArgs {
  readonly conversationId: string | null;
  readonly seedMessages: readonly ChatMessage[];
}

export interface UseConversationStreamResult {
  /** messageIds whose stream has reached its terminal `done` chunk. */
  readonly completedIds: ReadonlySet<string>;
  readonly isStreaming: boolean;
  readonly messages: ChatMessage[];
}

export function useConversationStream(
  args: UseConversationStreamArgs,
): UseConversationStreamResult {
  const { conversationId, seedMessages } = args;

  // Hooks
  const [state, setState] = React.useState<StreamState>(INITIAL_STREAM_STATE);

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const onData = (data: ConversationStreamChunkAddedSubscription): void => {
    setState((previous) =>
      reduceStreamChunk(previous, data.conversationStreamChunkAdded),
    );
  };

  // Life Cycle
  React.useEffect(() => {
    setState(INITIAL_STREAM_STATE);

    // 🪝 New conversation → drop any prior accumulation.
  }, [conversationId]);

  useSubscription(
    client,
    ConversationStreamChunkAddedDocument,
    { conversationId: conversationId ?? '' },
    { onData },
    Boolean(conversationId),
  );

  // 🔌 Short Circuit

  const messages = React.useMemo(
    () => toThreadMessages(seedMessages, state.bodies, state.events),
    [seedMessages, state.bodies, state.events],
  );

  return {
    completedIds: state.completedIds,
    isStreaming: state.isStreaming,
    messages,
  };
}
