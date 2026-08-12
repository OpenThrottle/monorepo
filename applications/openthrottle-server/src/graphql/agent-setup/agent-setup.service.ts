/**
 * @description Runs an agent-CLI install/update fire-and-forget, publishing each stdout/stderr chunk
 * to the per-run PubSub topic `agent-setup:<runId>:stream` and a terminal chunk on completion. On a
 * successful run it invalidates the agent-discovery cache so a subsequent discoverAgentClis reflects
 * the newly installed/updated binary. Mirrors the conversation-stream replay-buffer pattern so a
 * subscriber attaching after the mutation returned (the client only learns runId once) misses
 * nothing. Single-process only (in-memory PubSub + buffer), which is fine — this is a
 * local-developer-machine feature.
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  PUB_SUB,
  agentSetupStreamTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  runAgentSetup,
  type AgentSetupMode,
  type AgentSetupResult,
} from '@openthrottle/openthrottle-agentic-utils';
import { AgentDiscoveryService } from '../agent-discovery/agent-discovery.service';
import {
  AGENT_SETUP_CHUNK_FIELD,
  type AgentSetupStreamChunkEnvelope,
  type AgentSetupStreamChunkPayload,
} from './agent-setup.types';

/** How long a finished run's chunk buffer is retained after its terminal chunk, for late subscribers. */
const BUFFER_GRACE_MS = 30_000;

/** Hard cap on buffered chunks per run; bounds memory (the live stream is unaffected). */
const BUFFER_MAX_CHUNKS = 5_000;

/** Inputs for one install/update run. */
export interface StartAgentSetupRun {
  /** Backend (driver id) — already validated by the resolver against the registry. */
  readonly backend: string;
  /** Install a missing CLI or update an existing one. */
  readonly mode: AgentSetupMode;
}

@Injectable()
export class AgentSetupService {
  private readonly buffers = new Map<string, AgentSetupStreamChunkPayload[]>();
  private readonly evictionTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly agentDiscovery: AgentDiscoveryService,
    private readonly logger: LoggerService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  /**
   * Allocate a runId, kick off the install/update fire-and-forget, and return the id immediately so
   * the caller can subscribe. Errors are never thrown out of the async run — they terminate the
   * stream with a `done` chunk carrying the failure reason.
   */
  start(run: StartAgentSetupRun): string {
    const runId = randomUUID();
    this.buffers.set(runId, []);
    void this.run(runId, run);
    return runId;
  }

  /**
   * Subscribe to a run's stream, replaying any buffered chunks before switching to live output. The
   * live iterator is attached BEFORE the buffer is snapshotted so no chunk slips through the gap.
   */
  subscribe(runId: string): AsyncGenerator<AgentSetupStreamChunkEnvelope> {
    const live = this.pubSub.asyncIterator<AgentSetupStreamChunkEnvelope>(
      agentSetupStreamTopic(runId),
    );
    const buffered = [...(this.buffers.get(runId) ?? [])];
    return this.replayThenLive(buffered, live);
  }

  private async *replayThenLive(
    buffered: ReadonlyArray<AgentSetupStreamChunkPayload>,
    live: AsyncIterator<AgentSetupStreamChunkEnvelope>,
  ): AsyncGenerator<AgentSetupStreamChunkEnvelope> {
    for (const chunk of buffered) {
      yield { [AGENT_SETUP_CHUNK_FIELD]: chunk };
    }
    const liveIterable: AsyncIterable<AgentSetupStreamChunkEnvelope> = {
      [Symbol.asyncIterator]: () => live,
    };
    yield* liveIterable;
  }

  private async run(runId: string, run: StartAgentSetupRun): Promise<void> {
    let sortOrder = 0;

    const result: AgentSetupResult = await runAgentSetup({
      backend: run.backend,
      mode: run.mode,
      onChunk: (chunk) => {
        this.publish(runId, {
          data: chunk.data,
          done: false,
          error: null,
          exitCode: null,
          id: randomUUID(),
          runId,
          sortOrder: sortOrder++,
          stream: chunk.stream,
        });
      },
    });

    if (result.ok) {
      // Reflect the new/updated binary on the next discovery scan.
      this.agentDiscovery.invalidate();
      this.logger.debug(
        `🛠️ agent-setup: ${run.mode} ${run.backend} succeeded (run ${runId})`,
      );
    } else {
      this.logger.warn(
        `🛠️ agent-setup: ${run.mode} ${run.backend} failed (${result.reason}) (run ${runId})`,
      );
    }

    this.publish(runId, {
      data: '',
      done: true,
      error: result.ok ? null : (result.reason ?? 'unknown'),
      exitCode: result.exitCode,
      id: randomUUID(),
      runId,
      sortOrder: sortOrder++,
      stream: 'stdout',
    });

    this.scheduleEviction(runId);
  }

  private publish(runId: string, payload: AgentSetupStreamChunkPayload): void {
    const buffer = this.buffers.get(runId);
    if (buffer !== undefined) {
      buffer.push(payload);
      if (buffer.length > BUFFER_MAX_CHUNKS) {
        buffer.shift();
      }
    }
    void this.pubSub.publish(agentSetupStreamTopic(runId), {
      [AGENT_SETUP_CHUNK_FIELD]: payload,
    });
  }

  private scheduleEviction(runId: string): void {
    const existing = this.evictionTimers.get(runId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.buffers.delete(runId);
      this.evictionTimers.delete(runId);
    }, BUFFER_GRACE_MS);
    // Do not keep the process alive solely for buffer eviction.
    timer.unref?.();
    this.evictionTimers.set(runId, timer);
  }
}
