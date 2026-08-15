/**
 * @description In-memory transcription session relay. Each session owns one
 * websocket to the WhisperLive service (WHISPER_SERVICE_URL — env-only, never
 * client-supplied): base64 Int16 PCM from mutations is decoded to Float32 and
 * relayed upstream; WhisperLive segment messages are folded into a full-text
 * snapshot and published to `transcription:<sessionId>:stream`.
 *
 * Guardrails mirror ConversationStreamService's in-memory stance: ownership
 * checked on every call, ~15s idle reap when no audio arrives, ~5min hard cap,
 * max 1 active session per user (a new start closes the previous), and a
 * terminal done:true chunk on every exit path so clients never hang. No DB
 * rows; transcripts are never persisted server-side.
 *
 * WhisperLive protocol notes (verified against v0.9.0):
 * - END_OF_AUDIO must be sent as a BINARY frame (a text frame crashes the session).
 * - There is no terminal "all segments completed" message after END_OF_AUDIO —
 *   this relay synthesizes the terminal chunk itself after a short flush window.
 */

import { randomUUID } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import {
  PUB_SUB,
  transcriptionStreamTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { isRecord } from '@openthrottle/nodejs-utils';
import {
  TRANSCRIPTION_STREAM_CHUNK_FIELD,
  type TranscriptionStreamChunkPayload,
} from './transcription-stream.types';

/** Reap a session when no audio chunk has arrived for this long. */
const IDLE_REAP_MS = 15_000;
/** Absolute session lifetime cap. */
const HARD_CAP_MS = 5 * 60_000;
/**
 * Flush after END_OF_AUDIO: finalize once WhisperLive has been quiet for this
 * long. CPU inference can lag realtime by several seconds, so a fixed short
 * window truncates the transcript — wait for the segment stream to go quiet.
 */
const STOP_FLUSH_QUIET_MS = 2_000;
/** Absolute cap on the post-stop flush wait. */
const STOP_FLUSH_MAX_MS = 15_000;
/** Poll cadence while waiting for the flush quiet period. */
const STOP_FLUSH_POLL_MS = 250;
/** How long to wait for the socket to open + SERVER_READY before failing start. */
const CONNECT_TIMEOUT_MS = 15_000;

/** WhisperLive end-of-utterance marker — MUST go out as a binary frame. */
const END_OF_AUDIO = new TextEncoder().encode('END_OF_AUDIO');

/** One WhisperLive segment; the non-completed tail revises on later messages. */
interface WhisperSegment {
  readonly completed?: boolean;
  readonly end: string;
  readonly start: string;
  readonly text: string;
}

interface TranscriptionSession {
  /** Text of segments WhisperLive marked completed (stable, append-only). */
  completedText: string;
  finalized: boolean;
  readonly hardCapTimer: NodeJS.Timeout;
  readonly id: string;
  idleTimer: NodeJS.Timeout | null;
  /** End timestamp (s) of the last folded completed segment (dedupe guard). */
  lastCompletedEnd: number;
  /** Wall-clock ms of the last upstream WhisperLive message (flush quiet gate). */
  lastUpstreamMessageAt: number;
  /** Float32 PCM queued while the socket is still connecting. */
  readonly pendingAudio: Float32Array[];
  ready: boolean;
  socket: WebSocket | null;
  sortOrder: number;
  stopping: boolean;
  /** Current revising tail (non-completed segments); replaced wholesale. */
  tailText: string;
  readonly userId: string;
}

@Injectable()
export class TranscriptionStreamService {
  private readonly sessions = new Map<string, TranscriptionSession>();
  private readonly sessionIdByUser = new Map<string, string>();

  constructor(
    private readonly logger: LoggerService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  /** Whether the session exists and belongs to the user (subscription gate). */
  ownsSession(userId: string, sessionId: string): boolean {
    return this.sessions.get(sessionId)?.userId === userId;
  }

  /**
   * Mint a session and connect to WhisperLive. Resolves with the session id
   * once the service is ready, or an error message (no throw) when
   * transcription is unconfigured or unreachable. A user's previous active
   * session is finalized first (max 1 active session per user).
   */
  async start(
    userId: string,
  ): Promise<{ errorMessage: string | null; sessionId: string | null }> {
    const serviceUrl = process.env.WHISPER_SERVICE_URL?.trim();
    if (serviceUrl === undefined || serviceUrl === '') {
      return {
        errorMessage:
          'Voice transcription is not configured (WHISPER_SERVICE_URL is unset).',
        sessionId: null,
      };
    }

    const previousSessionId = this.sessionIdByUser.get(userId);
    if (previousSessionId !== undefined) {
      const previous = this.sessions.get(previousSessionId);
      if (previous) {
        this.finalize(previous, 'Replaced by a new transcription session.');
      }
    }

    const sessionId = randomUUID();
    const session: TranscriptionSession = {
      completedText: '',
      finalized: false,
      hardCapTimer: setTimeout(() => {
        const current = this.sessions.get(sessionId);
        if (current) {
          this.finalize(current, 'Transcription session hit the 5 minute cap.');
        }
      }, HARD_CAP_MS),
      id: sessionId,
      idleTimer: null,
      lastCompletedEnd: Number.NEGATIVE_INFINITY,
      lastUpstreamMessageAt: Date.now(),
      pendingAudio: [],
      ready: false,
      socket: null,
      sortOrder: 0,
      stopping: false,
      tailText: '',
      userId,
    };
    session.hardCapTimer.unref?.();
    this.sessions.set(sessionId, session);
    this.sessionIdByUser.set(userId, sessionId);
    this.resetIdleTimer(session);

    try {
      session.socket = await this.connectToWhisper(session, serviceUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `transcription-stream: WhisperLive connect failed: ${message}`,
        TranscriptionStreamService.name,
      );
      this.finalize(session, null, { silent: true });

      return {
        errorMessage: `Transcription service is unreachable: ${message}`,
        sessionId: null,
      };
    }

    return { errorMessage: null, sessionId };
  }

  /**
   * Decode a base64 Int16 PCM chunk and relay it to WhisperLive as Float32.
   * Returns false (no throw) for unknown/foreign/finalized sessions.
   */
  sendAudioChunk(
    userId: string,
    sessionId: string,
    audioBase64: string,
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId || session.stopping) {
      return false;
    }

    let pcm: Float32Array;
    try {
      pcm = decodeInt16Base64ToFloat32(audioBase64);
    } catch (error: unknown) {
      this.logger.warn(
        `transcription-stream: dropping undecodable audio chunk for session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        TranscriptionStreamService.name,
      );

      return false;
    }

    this.resetIdleTimer(session);

    if (session.ready && session.socket !== null) {
      session.socket.send(pcm);
    } else {
      session.pendingAudio.push(pcm);
    }

    return true;
  }

  /**
   * Flush and finalize a session: sends END_OF_AUDIO, waits a short window for
   * late segments, then publishes the terminal done chunk. Returns false (no
   * throw) for unknown/foreign sessions.
   */
  stop(userId: string, sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return false;
    }
    if (session.stopping) {
      return true;
    }

    session.stopping = true;
    if (session.idleTimer !== null) {
      clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }

    if (session.ready && session.socket !== null) {
      try {
        session.socket.send(END_OF_AUDIO);
      } catch (error: unknown) {
        this.logger.warn(
          `transcription-stream: END_OF_AUDIO send failed for session ${sessionId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          TranscriptionStreamService.name,
        );
      }
    }

    // WhisperLive never signals "all segments completed" — synthesize the
    // terminal chunk once its segment stream has gone quiet (CPU inference can
    // lag realtime by seconds, so a fixed short window truncates the tail).
    const flushStartedAt = Date.now();
    session.lastUpstreamMessageAt = flushStartedAt;
    const flushTimer = setInterval(() => {
      const current = this.sessions.get(sessionId);
      if (!current) {
        clearInterval(flushTimer);

        return;
      }
      const quietForMs = Date.now() - current.lastUpstreamMessageAt;
      const flushingForMs = Date.now() - flushStartedAt;
      if (
        quietForMs >= STOP_FLUSH_QUIET_MS ||
        flushingForMs >= STOP_FLUSH_MAX_MS
      ) {
        clearInterval(flushTimer);
        this.finalize(current, null);
      }
    }, STOP_FLUSH_POLL_MS);
    flushTimer.unref?.();

    return true;
  }

  /** Open the websocket, send the config handshake, and await SERVER_READY. */
  private connectToWhisper(
    session: TranscriptionSession,
    serviceUrl: string,
  ): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(serviceUrl);
      socket.binaryType = 'arraybuffer';

      const connectTimer = setTimeout(() => {
        socket.close();
        reject(new Error('timed out waiting for SERVER_READY'));
      }, CONNECT_TIMEOUT_MS);
      connectTimer.unref?.();

      socket.addEventListener('open', () => {
        socket.send(
          JSON.stringify({
            language: 'en',
            model: process.env.WHISPER_MODEL?.trim() || 'base.en',
            task: 'transcribe',
            uid: session.id,
            use_vad: true,
          }),
        );
      });

      socket.addEventListener('message', (event: MessageEvent) => {
        const message = parseWhisperMessage(event.data);
        if (message === null) {
          return;
        }

        if (message['message'] === 'SERVER_READY') {
          clearTimeout(connectTimer);
          session.ready = true;
          for (const pcm of session.pendingAudio.splice(0)) {
            socket.send(pcm);
          }
          resolve(socket);

          return;
        }

        this.onWhisperMessage(session, message);
      });

      socket.addEventListener('error', () => {
        clearTimeout(connectTimer);
        reject(new Error(`websocket error connecting to ${serviceUrl}`));
      });

      socket.addEventListener('close', () => {
        clearTimeout(connectTimer);
        if (!session.ready) {
          reject(new Error('connection closed before SERVER_READY'));

          return;
        }
        // Upstream closed mid-session (not a stop we initiated): finalize so
        // subscribers get their terminal chunk instead of hanging.
        const current = this.sessions.get(session.id);
        if (current && !current.stopping && !current.finalized) {
          this.finalize(
            current,
            'Transcription service closed the connection.',
          );
        }
      });
    });
  }

  /** Fold a WhisperLive message into the session snapshot and publish it. */
  private onWhisperMessage(
    session: TranscriptionSession,
    message: Record<string, unknown>,
  ): void {
    if (session.finalized) {
      return;
    }

    session.lastUpstreamMessageAt = Date.now();

    if (message['message'] === 'DISCONNECT') {
      this.finalize(session, 'Transcription service ended the session.');

      return;
    }

    const segments = message['segments'];
    if (!Array.isArray(segments)) {
      return;
    }

    this.applySegments(session, segments);
    this.publishChunk(session, { done: false, error: null });
  }

  /**
   * Fold segments into the snapshot: completed segments append once (guarded
   * by their end timestamp), non-completed segments form the revising tail.
   */
  private applySegments(
    session: TranscriptionSession,
    segments: ReadonlyArray<WhisperSegment>,
  ): void {
    const tailParts: string[] = [];
    for (const segment of segments) {
      if (segment.completed === true) {
        const end = Number.parseFloat(segment.end);
        if (Number.isFinite(end) && end > session.lastCompletedEnd) {
          session.completedText += segment.text;
          session.lastCompletedEnd = end;
        }
      } else {
        tailParts.push(segment.text);
      }
    }
    session.tailText = tailParts.join('');
  }

  /**
   * Publish the terminal chunk, tear down timers + socket, and drop the
   * session. `errorMessage` marks reap/replace/upstream-failure exits; null is
   * a clean stop. `silent` skips the terminal publish (failed start — nobody
   * can be subscribed to a session id that was never returned).
   */
  private finalize(
    session: TranscriptionSession,
    errorMessage: string | null,
    options?: { silent?: boolean },
  ): void {
    if (session.finalized) {
      return;
    }
    session.finalized = true;
    session.stopping = true;

    clearTimeout(session.hardCapTimer);
    if (session.idleTimer !== null) {
      clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }

    if (options?.silent !== true) {
      this.publishChunk(session, { done: true, error: errorMessage });
    }

    try {
      session.socket?.close();
    } catch {
      // Already closed/failed sockets are fine — the session is gone either way.
    }
    session.socket = null;

    this.sessions.delete(session.id);
    if (this.sessionIdByUser.get(session.userId) === session.id) {
      this.sessionIdByUser.delete(session.userId);
    }
  }

  private resetIdleTimer(session: TranscriptionSession): void {
    if (session.idleTimer !== null) {
      clearTimeout(session.idleTimer);
    }
    session.idleTimer = setTimeout(() => {
      const current = this.sessions.get(session.id);
      if (current && !current.stopping) {
        this.finalize(
          current,
          'Transcription session reaped after 15s without audio.',
        );
      }
    }, IDLE_REAP_MS);
    session.idleTimer.unref?.();
  }

  private publishChunk(
    session: TranscriptionSession,
    fields: { done: boolean; error: string | null },
  ): void {
    const payload: TranscriptionStreamChunkPayload = {
      done: fields.done,
      error: fields.error,
      sessionId: session.id,
      sortOrder: session.sortOrder,
      transcript: session.completedText + session.tailText,
    };
    session.sortOrder += 1;

    void this.pubSub
      .publish(transcriptionStreamTopic(session.id), {
        [TRANSCRIPTION_STREAM_CHUNK_FIELD]: payload,
      })
      .catch((error: unknown) => {
        this.logger.error(
          `transcription-stream publish failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          TranscriptionStreamService.name,
        );
      });
  }
}

/** Decode base64-encoded little-endian Int16 PCM into normalized Float32. */
function decodeInt16Base64ToFloat32(audioBase64: string): Float32Array {
  const bytes = Buffer.from(audioBase64, 'base64');
  if (bytes.byteLength === 0 || bytes.byteLength % 2 !== 0) {
    throw new Error(`invalid Int16 PCM payload (${bytes.byteLength} bytes)`);
  }

  const sampleCount = bytes.byteLength / 2;
  const pcm = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    pcm[index] = bytes.readInt16LE(index * 2) / 32768;
  }

  return pcm;
}

/** Parse a WhisperLive JSON text frame; binary/unparseable frames yield null. */
function parseWhisperMessage(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(data);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
