/**
 * @description Live transcription stream for the home composer's voice input.
 * Mirrors useConversationStream's structure (graphql-ws subscription + pure
 * reducer) with one deliberate divergence: snapshot-replace, not delta-append.
 * WhisperLive revises the tail segment as more audio arrives, so every chunk
 * carries the FULL transcript so far and the reducer keeps the highest-sortOrder
 * snapshot instead of accumulating deltas.
 *
 * Audio ingress rides the same graphql-ws socket as the subscription
 * (executeWsMutation) — no second realtime transport, and no HTTP overhead per
 * ~250ms chunk. SSR-safe: with no browser ws client, start() reports an error.
 */
import * as React from 'react';
import {
  executeWsMutation,
  useSubscription,
} from '@openthrottle/react-router-graphql';
import type { TranscriptionStreamChunkAddedSubscription } from '~/__generated__/graphql';
import {
  SendTranscriptionAudioChunkDocument,
  StartTranscriptionStreamDocument,
  StopTranscriptionStreamDocument,
  TranscriptionStreamChunkAddedDocument,
} from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type TranscriptionChunk =
  TranscriptionStreamChunkAddedSubscription['transcriptionStreamChunkAdded'];

export interface TranscriptionSnapshot {
  /** True once the terminal chunk arrived (stop, idle reap, or hard cap). */
  readonly done: boolean;
  /** Stream error carried by the terminal chunk (session reaped, upstream loss). */
  readonly error: string | null;
  /** sortOrder of the snapshot currently held (-1 before any chunk). */
  readonly sortOrder: number;
  /** Full transcript so far — replaced wholesale, never appended. */
  readonly transcript: string;
}

export const INITIAL_TRANSCRIPTION_SNAPSHOT: TranscriptionSnapshot = {
  done: false,
  error: null,
  sortOrder: -1,
  transcript: '',
};

/**
 * Pure reducer: keep the highest-sortOrder snapshot (replace, never append).
 * Out-of-order or duplicate chunks are dropped; `done` latches once seen.
 */
export function reduceTranscriptionChunk(
  state: TranscriptionSnapshot,
  chunk: TranscriptionChunk,
): TranscriptionSnapshot {
  if (chunk.sortOrder <= state.sortOrder) {
    return state;
  }

  return {
    done: state.done || chunk.done,
    error: chunk.error ?? state.error,
    sortOrder: chunk.sortOrder,
    transcript: chunk.transcript,
  };
}

export interface UseTranscriptionStreamResult {
  /** Start-mutation or stream error message; null while healthy. */
  readonly error: string | null;
  /** True between a successful start() and the terminal done chunk. */
  readonly isActive: boolean;
  /** Clear the session + snapshot (after the consumer takes the final text). */
  readonly reset: () => void;
  /** Relay one base64 Int16 PCM chunk; resolves false when the session is gone. */
  readonly sendAudioChunk: (audioBase64: string) => Promise<boolean>;
  readonly sessionId: string | null;
  readonly snapshot: TranscriptionSnapshot;
  /** Mint a session (server connects to WhisperLive). errorMessage set on failure. */
  readonly start: () => Promise<{
    errorMessage: string | null;
    sessionId: string | null;
  }>;
  /** Flush + finalize; the terminal snapshot arrives via the subscription. */
  readonly stop: () => Promise<void>;
}

export function useTranscriptionStream(): UseTranscriptionStreamResult {
  // Hooks
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [snapshot, setSnapshot] = React.useState<TranscriptionSnapshot>(
    INITIAL_TRANSCRIPTION_SNAPSHOT,
  );
  const [error, setError] = React.useState<string | null>(null);
  const chunkIndexRef = React.useRef(0);

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const onData = (data: TranscriptionStreamChunkAddedSubscription): void => {
    setSnapshot((previous) =>
      reduceTranscriptionChunk(previous, data.transcriptionStreamChunkAdded),
    );
  };

  const start = React.useCallback(async (): Promise<{
    errorMessage: string | null;
    sessionId: string | null;
  }> => {
    if (client === null) {
      const errorMessage = 'Voice input requires a browser connection.';
      setError(errorMessage);

      return { errorMessage, sessionId: null };
    }

    setError(null);
    setSnapshot(INITIAL_TRANSCRIPTION_SNAPSHOT);
    chunkIndexRef.current = 0;

    try {
      const data = await executeWsMutation(
        client,
        StartTranscriptionStreamDocument,
        {},
      );
      const started = data.startTranscriptionStream;

      if (started.sessionId == null) {
        const errorMessage =
          started.errorMessage ?? 'Could not start transcription.';
        setError(errorMessage);

        return { errorMessage, sessionId: null };
      }

      setSessionId(started.sessionId);

      return { errorMessage: null, sessionId: started.sessionId };
    } catch (startError: unknown) {
      const errorMessage =
        startError instanceof Error ? startError.message : String(startError);
      setError(errorMessage);

      return { errorMessage, sessionId: null };
    }
  }, [client]);

  const sendAudioChunk = React.useCallback(
    async (audioBase64: string): Promise<boolean> => {
      if (client === null || sessionId === null) {
        return false;
      }

      const sortOrder = chunkIndexRef.current;
      chunkIndexRef.current += 1;

      try {
        const data = await executeWsMutation(
          client,
          SendTranscriptionAudioChunkDocument,
          { audioBase64, sessionId, sortOrder },
        );

        return data.sendTranscriptionAudioChunk;
      } catch {
        // A dropped chunk is non-fatal — the stream keeps going; the idle
        // reaper handles a truly dead session with a terminal error chunk.
        return false;
      }
    },
    [client, sessionId],
  );

  const stop = React.useCallback(async (): Promise<void> => {
    if (client === null || sessionId === null) {
      return;
    }

    try {
      await executeWsMutation(client, StopTranscriptionStreamDocument, {
        sessionId,
      });
    } catch (stopError: unknown) {
      setError(
        stopError instanceof Error ? stopError.message : String(stopError),
      );
    }
  }, [client, sessionId]);

  const reset = React.useCallback((): void => {
    setSessionId(null);
    setSnapshot(INITIAL_TRANSCRIPTION_SNAPSHOT);
    setError(null);
    chunkIndexRef.current = 0;
  }, []);

  // Life Cycle
  useSubscription(
    client,
    TranscriptionStreamChunkAddedDocument,
    { sessionId: sessionId ?? '' },
    { onData },
    Boolean(sessionId),
  );

  // 🔌 Short Circuit

  return {
    error: snapshot.error ?? error,
    isActive: sessionId !== null && !snapshot.done,
    reset,
    sendAudioChunk,
    sessionId,
    snapshot,
    start,
    stop,
  };
}
