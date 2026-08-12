/**
 * @description Live stdout/stderr stream for an agent-CLI install/update run. Subscribes to
 * agentSetupChunkAdded(runId) over graphql-ws, keying chunks by id (the server buffers + replays, so
 * a late subscriber misses nothing) and ordering by sortOrder. Exposes a terminal `done` flag +
 * `error` so the caller can stop the spinner and revalidate the loader. SSR-safe: with no browser ws
 * client (or no runId) it returns the empty initial state and opens no subscription.
 */
import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';
import {
  AgentSetupChunkAddedDocument,
  type AgentSetupChunkAddedSubscription,
} from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type Chunk = AgentSetupChunkAddedSubscription['agentSetupChunkAdded'];

export interface AgentSetupStreamState {
  readonly chunks: readonly Chunk[];
  readonly done: boolean;
  readonly error: string | null;
}

/** Subscribe to a run's output. `runId` null/empty ⇒ inert (no subscription, empty state). */
export function useAgentSetupStream(
  runId: string | null,
): AgentSetupStreamState {
  // Hooks
  const [byId, setById] = React.useState<ReadonlyMap<string, Chunk>>(
    () => new Map(),
  );

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const onData = (data: AgentSetupChunkAddedSubscription) => {
    const chunk = data.agentSetupChunkAdded;

    setById((previous) => {
      if (previous.has(chunk.id)) return previous;

      const next = new Map(previous);
      next.set(chunk.id, chunk);

      return next;
    });
  };

  // Life Cycle
  React.useEffect(() => {
    // A new run starts with a clean slate.
    setById(new Map());
  }, [runId]);

  useSubscription(
    client,
    AgentSetupChunkAddedDocument,
    { runId: runId ?? '' },
    { onData },
    Boolean(runId),
  );

  // 🔌 Short Circuit
  return React.useMemo(() => {
    const chunks = Array.from(byId.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const terminal = chunks.find((chunk) => chunk.done);

    return {
      chunks,
      done: terminal !== undefined,
      error: terminal?.error ?? null,
    };
  }, [byId]);
}
