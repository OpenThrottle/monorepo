/**
 * @description Resolver for the streaming transcription surface. The WHOLE
 * surface — subscription AND mutations — is graphql-ws only: audio ingress
 * rides the same socket the subscription uses (graphql-ws supports mutations),
 * so every operation authorizes from the connection identity that onConnect
 * validated and stashed on the context (context.userId). HTTP execution has no
 * connection identity and fails closed. The WhisperLive endpoint is resolved
 * server-side from WHISPER_SERVICE_URL only; no operation here accepts a URL
 * from the client (SSRF stance). Expected failures surface as errorMessage /
 * false results, mirroring the conversation-stream surface.
 */

import { ForbiddenException, Inject } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Int,
  Mutation,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  PUB_SUB,
  transcriptionStreamTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import {
  StartTranscriptionStreamResult,
  TranscriptionStreamChunkObject,
} from './transcription-stream.object';
import { TranscriptionStreamService } from './transcription-stream.service';
import { type TranscriptionStreamChunkPayload } from './transcription-stream.types';

/** Execution context shape for graphql-ws operations (see app.module context). */
interface GraphqlWsExecutionContext {
  readonly userId?: string;
}

// @authz-stance: authenticated-only (Path A — graphql-ws connection identity;
// every operation checks context.userId, which onConnect verified from the
// connection token. @Public() only bypasses the HTTP guard, which cannot see
// ws connections; there is no anonymous path through this resolver.)
@Resolver()
export class TranscriptionStreamResolver {
  constructor(
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
    private readonly transcription: TranscriptionStreamService,
  ) {}

  // 🔌 graphql-ws only: connection auth (onConnect) validated the token and
  // stashed userId on the context; authorize from the connection identity here.
  @Public()
  @Subscription(() => TranscriptionStreamChunkObject, {
    description: `Live transcript snapshots for an owned transcription session (topic transcription:<sessionId>:stream). Snapshot-replace: each chunk carries the full transcript so far; clients keep the highest sortOrder. Requires an authenticated connection that owns the session.`,
  })
  transcriptionStreamChunkAdded(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Context() context: GraphqlWsExecutionContext,
  ): AsyncIterator<TranscriptionStreamChunkPayload> {
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }

    if (!this.transcription.ownsSession(context.userId, sessionId)) {
      throw new ForbiddenException(
        'Transcription session not found for this user',
      );
    }

    return this.pubSub.asyncIterator<TranscriptionStreamChunkPayload>(
      transcriptionStreamTopic(sessionId),
    );
  }

  @Public()
  @Mutation(() => StartTranscriptionStreamResult, {
    description: `Mint a transcription session: the server opens a websocket to the local WhisperLive service (WHISPER_SERVICE_URL — env-only, never client-supplied) and returns the session id to stream audio to. Must be executed over an authenticated graphql-ws connection (the audio mutations ride the same socket). A user's previous active session is closed first. Uses errorMessage for expected failures (unconfigured / unreachable).`,
    name: 'startTranscriptionStream',
  })
  async startTranscriptionStream(
    @Context() context: GraphqlWsExecutionContext,
  ): Promise<StartTranscriptionStreamResult> {
    const result = new StartTranscriptionStreamResult();

    if (!context.userId) {
      result.errorMessage =
        'Transcription requires an authenticated realtime connection.';
      result.sessionId = null;

      return result;
    }

    const started = await this.transcription.start(context.userId);

    result.errorMessage = started.errorMessage;
    result.sessionId = started.sessionId;

    return result;
  }

  @Public()
  @Mutation(() => Boolean, {
    description: `Relay one ~250ms chunk of base64-encoded 16kHz mono Int16 PCM to the session's WhisperLive connection. Executed over the same authenticated graphql-ws socket as the subscription. Returns false (no throw) for unauthenticated, unknown, foreign, or already-stopping sessions.`,
    name: 'sendTranscriptionAudioChunk',
  })
  sendTranscriptionAudioChunk(
    @Args('audioBase64', { type: () => String }) audioBase64: string,
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('sortOrder', {
      description: `Client-side monotonic chunk index (diagnostics; graphql-ws preserves per-socket order).`,
      type: () => Int,
    })
    _sortOrder: number,
    @Context() context: GraphqlWsExecutionContext,
  ): boolean {
    if (!context.userId) {
      return false;
    }

    return this.transcription.sendAudioChunk(
      context.userId,
      sessionId,
      audioBase64,
    );
  }

  @Public()
  @Mutation(() => Boolean, {
    description: `Flush and finalize an owned transcription session: sends END_OF_AUDIO upstream, waits a short flush window for the last revising segments, then emits the terminal done:true snapshot. Returns false (no throw) for unauthenticated, unknown, or foreign sessions.`,
    name: 'stopTranscriptionStream',
  })
  stopTranscriptionStream(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Context() context: GraphqlWsExecutionContext,
  ): boolean {
    if (!context.userId) {
      return false;
    }

    return this.transcription.stop(context.userId, sessionId);
  }
}
