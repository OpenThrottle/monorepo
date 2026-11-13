/**
 * The ACP (Agent Client Protocol) conversation backend: one long-lived agent
 * process per conversation session, driven over JSON-RPC stdio with the
 * official `@agentclientprotocol/sdk`, instead of one headless CLI process per
 * turn. Behind the `OPENTHROTTLE_CHAT_ACP_BACKENDS` flag (see `routing.ts`).
 *
 * Lifecycle of a live session:
 * 1. First turn: spawn, `initialize`, `authenticate` when the spec names a
 *    method the agent advertises, then `session/load` the run's session id if
 *    the agent supports it, else `session/new`. A new id is surfaced as a
 *    `session` chunk so the server persists it for the next turn.
 * 2. Every turn: put the session in the spec's mode for the run's permission
 *    posture, apply the model through the agent's `model` config option,
 *    send `session/prompt`, stream `session/update`s until the prompt settles.
 *    Abort sends `session/cancel` — the process and session stay usable.
 * 3. Between turns the process idles in a pool; it is disposed after
 *    {@link ACP_IDLE_TTL_MS_ENV}, when the pool overflows, or when it dies.
 *    A later turn whose process is gone resumes via `session/load`.
 *
 * Replay: `session/load` re-sends the whole history as `session/update`s
 * BEFORE it responds. Updates are routed to a turn only while one is running,
 * so a replay is dropped rather than double-published.
 */

import { randomUUID } from 'node:crypto';

import {
  client,
  type ClientConnection,
  methods,
  PROTOCOL_VERSION,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionConfigOption,
  type SessionModeState,
  type SessionUpdate,
} from '@agentclientprotocol/sdk';
import { isRecord } from '@openthrottle/nodejs-utils';

import { withFileMentions } from '../file-mentions.ts';
import { CONVERSATION_KEEPALIVE_CHUNK } from '../keepalive.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import type { AcpAgentSpec } from './agent-specs.ts';
import { AsyncQueue } from './AsyncQueue.ts';
import { acpTerminalChunk, createAcpUpdateMapper } from './events.ts';
import { type AcpLauncher, spawnAcpAgent } from './launcher.ts';
import { awaitAcpPermission } from './permission-broker.ts';
import { decideAcpPermission, isManagedMcpTool } from './permissions.ts';
import { toAcpMcpServers } from './toAcpMcpServers.ts';

/**
 * Env var: milliseconds an idle live session is kept before its process is
 * disposed. Defaults to 15 minutes.
 *
 * @public
 */
export const ACP_IDLE_TTL_MS_ENV = 'OPENTHROTTLE_ACP_IDLE_TTL_MS';

/**
 * Env var: maximum live sessions per ACP backend; the least recently used idle
 * one is disposed past it. Defaults to 8.
 *
 * @public
 */
export const ACP_MAX_LIVE_SESSIONS_ENV = 'OPENTHROTTLE_ACP_MAX_LIVE_SESSIONS';

const DEFAULT_IDLE_TTL_MS = 15 * 60 * 1000;

const DEFAULT_MAX_LIVE_SESSIONS = 8;

/** Keepalive cadence while a turn waits on a human permission decision. */
const PERMISSION_KEEPALIVE_MS = 10_000;

/** How long a cancelled turn may take to settle before its process is killed. */
const CANCEL_GRACE_MS = 5000;

/** A permission request arriving outside a turn is refused. */
const REFUSE_OUTSIDE_TURN: RequestPermissionResponse = {
  outcome: { outcome: 'cancelled' },
};

/**
 * Where a live session's inbound traffic goes. Re-pointed at each turn; between
 * turns updates are dropped (this is what discards a `session/load` replay) and
 * permission requests are refused.
 */
interface TurnRoutes {
  onPermission: (
    request: RequestPermissionRequest,
  ) => RequestPermissionResponse | Promise<RequestPermissionResponse>;
  onUpdate: ((update: SessionUpdate) => void) | null;
}

/** One agent process bound to one ACP session. */
interface LiveAcpSession {
  configOptions: readonly SessionConfigOption[];
  readonly connection: ClientConnection;
  readonly dispose: () => void;
  idleTimer: NodeJS.Timeout | null;
  readonly key: string;
  lastUsedAt: number;
  /** The agent's legacy `modes` state, used when it has no `mode` config option. */
  modes: SessionModeState | null;
  readonly routes: TurnRoutes;
  readonly sessionId: string;
  readonly stderrTail: () => string;
  turn: Promise<void>;
}

/** A live session plus how it was obtained for this turn. */
interface AcquiredSession {
  /** True when `session/new` minted it (no prior context in the agent). */
  readonly fresh: boolean;
  readonly live: LiveAcpSession;
  readonly ok: true;
}

/** Why no session could be opened (spawn, initialize, auth or session/new failed). */
interface AcquireFailure {
  readonly message: string;
  readonly ok: false;
}

type AcquireResult = AcquireFailure | AcquiredSession;

/**
 * Options for {@link createAcpConversationBackend}.
 *
 * @public
 */
export interface AcpConversationBackendOptions {
  /** Starts the agent; defaults to spawning the spec's CLI. */
  readonly launch: AcpLauncher | undefined;
}

function positiveIntOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** `cwd` + session id, so a session is never reused from another checkout. */
function poolKey(cwd: string, sessionId: string): string {
  return `${cwd}\u0000${sessionId}`;
}

/** A readable message for a failed JSON-RPC call, with the agent's details. */
function describeAcpError(error: unknown, stderrTail: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const data = isRecord(error) ? error['data'] : undefined;
  const hasDetails = isRecord(data) && typeof data['details'] === 'string';
  const details = hasDetails ? `: ${String(data['details'])}` : '';
  const stderr = stderrTail === '' ? '' : ` (stderr: ${stderrTail})`;

  return `ACP agent error: ${message}${details}${stderr}`;
}

function terminalError(message: string): ConversationStreamChunk {
  return {
    delta: '',
    done: true,
    error: message,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
  };
}

/**
 * The prompt text for a turn. A session the agent already holds gets only the
 * new message; a freshly minted one also gets the persona. Prior turns reach a
 * fresh session through the server's budgeted handoff preamble, which is
 * already part of the latest user message.
 */
function composePrompt(run: ConversationBackendRun, fresh: boolean): string {
  let latest = '';
  for (const message of run.messages) {
    if (message.role === 'user') {
      latest = message.content;
    }
  }

  const body = withFileMentions(latest, run.fileMentions);
  const systemPrompt = run.systemPrompt?.trim();
  if (fresh && systemPrompt !== undefined && systemPrompt !== '') {
    return `${systemPrompt}\n\n${body}`;
  }

  return body;
}

/** Select options of an ACP select config, flattening groups. */
function selectValues(
  option: SessionConfigOption,
): ReadonlyArray<{ readonly name: string; readonly value: string }> {
  if (option.type !== 'select') {
    return [];
  }

  const values: Array<{ readonly name: string; readonly value: string }> = [];
  for (const entry of option.options) {
    if ('group' in entry) {
      values.push(...entry.options);
    } else {
      values.push(entry);
    }
  }

  return values;
}

/**
 * The agent's value for an OT model id: an exact value, a value whose base
 * (before cursor's `[param=…]` suffix) matches, or a display name.
 */
function matchModelValue(
  option: SessionConfigOption,
  model: string,
): string | undefined {
  const values = selectValues(option);
  const match =
    values.find((candidate) => candidate.value === model) ??
    values.find((candidate) => candidate.value.split('[')[0] === model) ??
    values.find((candidate) => candidate.name === model);

  return match?.value;
}

/**
 * Create an ACP conversation backend for one agent spec. Each backend owns its
 * own pool of live sessions.
 *
 * @public
 */
export function createAcpConversationBackend(
  spec: AcpAgentSpec,
  options: AcpConversationBackendOptions = { launch: undefined },
): ConversationBackend {
  const launch = options.launch ?? spawnAcpAgent;
  const pool = new Map<string, LiveAcpSession>();

  const drop = (live: LiveAcpSession): void => {
    if (live.idleTimer !== null) {
      clearTimeout(live.idleTimer);
      live.idleTimer = null;
    }
    if (pool.get(live.key) === live) {
      pool.delete(live.key);
    }
    live.dispose();
  };

  const scheduleIdle = (live: LiveAcpSession): void => {
    live.lastUsedAt = Date.now();
    live.idleTimer = setTimeout(
      () => {
        drop(live);
      },
      positiveIntOr(process.env[ACP_IDLE_TTL_MS_ENV], DEFAULT_IDLE_TTL_MS),
    );
    live.idleTimer.unref();
  };

  /** Dispose least-recently-used idle sessions until there is room for one more. */
  const makeRoom = (): void => {
    const max = positiveIntOr(
      process.env[ACP_MAX_LIVE_SESSIONS_ENV],
      DEFAULT_MAX_LIVE_SESSIONS,
    );
    const idle = [...pool.values()]
      .filter((live) => live.idleTimer !== null)
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt);
    while (pool.size >= max) {
      const oldest = idle.shift();
      if (oldest === undefined) {
        return;
      }
      drop(oldest);
    }
  };

  /** Start a process and open (load or create) its session. */
  const open = async (
    run: ConversationBackendRun,
    cwd: string,
  ): Promise<AcquireResult> => {
    const agentProcess = launch(spec, run);
    const routes: TurnRoutes = {
      onPermission: () => REFUSE_OUTSIDE_TURN,
      onUpdate: null,
    };
    const app = client({ name: 'openthrottle' })
      .onNotification(methods.client.session.update, ({ params }) => {
        routes.onUpdate?.(params.update);
      })
      .onRequest(methods.client.session.requestPermission, ({ params }) => {
        return routes.onPermission(params);
      });

    try {
      const connection = agentProcess.connect(app);
      const agent = connection.agent;
      const initialized = await agent.request(methods.agent.initialize, {
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
        },
        protocolVersion: PROTOCOL_VERSION,
      });

      const authMethodId = spec.authMethodId(process.env);
      const advertised = (initialized.authMethods ?? []).some(
        (method) => method.id === authMethodId,
      );
      if (authMethodId !== undefined && advertised) {
        await agent.request(methods.agent.authenticate, {
          methodId: authMethodId,
        });
      }

      const mcpServers = toAcpMcpServers(run);
      const requested = run.sessionId ?? '';
      let sessionId: string | undefined;
      let configOptions: readonly SessionConfigOption[] = [];
      let modes: SessionModeState | null = null;

      if (
        requested !== '' &&
        initialized.agentCapabilities?.loadSession === true
      ) {
        try {
          const loaded = await agent.request(methods.agent.session.load, {
            cwd,
            mcpServers,
            sessionId: requested,
          });
          sessionId = requested;
          configOptions = loaded.configOptions ?? [];
          modes = loaded.modes ?? null;
        } catch {
          // Unknown or expired id (or a cursor create-chat id the ACP server
          // does not recognize): fall through and mint a new session.
        }
      }

      const fresh = sessionId === undefined;
      if (sessionId === undefined) {
        const created = await agent.request(methods.agent.session.new, {
          cwd,
          mcpServers,
        });
        sessionId = created.sessionId;
        configOptions = created.configOptions ?? [];
        modes = created.modes ?? null;
      }

      const live: LiveAcpSession = {
        configOptions,
        connection,
        dispose: agentProcess.dispose,
        idleTimer: null,
        key: poolKey(cwd, sessionId),
        lastUsedAt: Date.now(),
        modes,
        routes,
        sessionId,
        stderrTail: agentProcess.stderrTail,
        turn: Promise.resolve(),
      };

      return { fresh, live, ok: true };
    } catch (error) {
      const message = describeAcpError(error, agentProcess.stderrTail());
      agentProcess.dispose();
      return { message, ok: false };
    }
  };

  /** Reuse the pooled session for the run, or open one. */
  const acquire = async (
    run: ConversationBackendRun,
    cwd: string,
  ): Promise<AcquireResult> => {
    const requested = run.sessionId ?? '';
    const pooled =
      requested === '' ? undefined : pool.get(poolKey(cwd, requested));

    if (pooled !== undefined && !pooled.connection.signal.aborted) {
      if (pooled.idleTimer !== null) {
        clearTimeout(pooled.idleTimer);
        pooled.idleTimer = null;
      }
      return { fresh: false, live: pooled, ok: true };
    }

    if (pooled !== undefined) {
      drop(pooled);
    }

    makeRoom();
    const acquired = await open(run, cwd);
    if (acquired.ok) {
      pool.set(acquired.live.key, acquired.live);
    }

    return acquired;
  };

  /** Point the session at the run's model through its `model` config option. */
  const applyModel = async (
    live: LiveAcpSession,
    model: string,
  ): Promise<void> => {
    const wanted = model.trim();
    if (wanted === '' || wanted === 'auto') {
      return;
    }

    const option = live.configOptions.find(
      (candidate) => candidate.category === 'model',
    );
    const value =
      option === undefined ? undefined : matchModelValue(option, wanted);
    if (
      option === undefined ||
      value === undefined ||
      value === option.currentValue
    ) {
      return;
    }

    const updated = await live.connection.agent.request(
      methods.agent.session.setConfigOption,
      { configId: option.id, sessionId: live.sessionId, value },
    );
    live.configOptions = updated.configOptions;
  };

  /**
   * Put the session in the spec's mode for the run's permission posture,
   * through the agent's `mode` config option, else `session/set_mode` when
   * the agent only advertises legacy `modes`. A mode the agent does not
   * offer is left alone.
   */
  const applyMode = async (
    live: LiveAcpSession,
    run: ConversationBackendRun,
  ): Promise<void> => {
    const wanted = spec.sessionMode(run.permissionMode);
    if (wanted === undefined) {
      return;
    }

    const option = live.configOptions.find(
      (candidate) => candidate.category === 'mode',
    );
    if (option !== undefined) {
      const offered = selectValues(option).some(
        (candidate) => candidate.value === wanted,
      );
      if (!offered || option.currentValue === wanted) {
        return;
      }
      const updated = await live.connection.agent.request(
        methods.agent.session.setConfigOption,
        { configId: option.id, sessionId: live.sessionId, value: wanted },
      );
      live.configOptions = updated.configOptions;
      return;
    }

    const modes = live.modes;
    const offered =
      modes?.availableModes.some((mode) => mode.id === wanted) ?? false;
    if (modes === null || !offered || modes.currentModeId === wanted) {
      return;
    }
    await live.connection.agent.request(methods.agent.session.setMode, {
      modeId: wanted,
      sessionId: live.sessionId,
    });
    live.modes = { ...modes, currentModeId: wanted };
  };

  async function* runTurn(
    run: ConversationBackendRun,
    acquired: AcquiredSession,
  ): AsyncGenerator<ConversationStreamChunk> {
    const { fresh, live } = acquired;
    const agent = live.connection.agent;
    const queue = new AsyncQueue<ConversationStreamChunk>();
    const mapUpdate = createAcpUpdateMapper();
    const managedServerNames = Object.keys(run.mcpServers ?? {});
    let killTimer: NodeJS.Timeout | null = null;

    live.routes.onUpdate = (update: SessionUpdate): void => {
      const chunks = mapUpdate(update);
      if (chunks.length === 0) {
        queue.push(CONVERSATION_KEEPALIVE_CHUNK);
      }
      for (const chunk of chunks) {
        queue.push(chunk);
      }
    };
    const askHuman = async (
      request: RequestPermissionRequest,
    ): Promise<RequestPermissionResponse> => {
      const requestId = randomUUID();
      queue.push({
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.permissionRequest,
        metadata: {
          options: request.options.map((option) => {
            return {
              kind: option.kind,
              name: option.name,
              optionId: option.optionId,
            };
          }),
          requestId,
          toolCall: {
            kind: request.toolCall.kind ?? 'other',
            title: request.toolCall.title ?? '',
            toolCallId: request.toolCall.toolCallId,
          },
        },
      });
      // The idle backstop would kill a turn that is merely waiting on a human.
      const keepalive = setInterval(() => {
        queue.push(CONVERSATION_KEEPALIVE_CHUNK);
      }, PERMISSION_KEEPALIVE_MS);
      keepalive.unref();
      try {
        const response = await awaitAcpPermission(requestId, run.signal);
        const { outcome } = response;
        queue.push({
          delta: '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.permissionRequest,
          metadata: {
            requestId,
            resolution: {
              optionId:
                outcome.outcome === 'selected' ? outcome.optionId : null,
              outcome: outcome.outcome,
            },
          },
        });
        return response;
      } finally {
        clearInterval(keepalive);
      }
    };
    live.routes.onPermission = (request: RequestPermissionRequest) => {
      const supervised =
        run.permissionMode === CONVERSATION_PERMISSION_MODES.supervised;
      if (
        supervised &&
        !isManagedMcpTool(request.toolCall.title, managedServerNames)
      ) {
        return askHuman(request);
      }
      return decideAcpPermission(
        request,
        run.permissionMode,
        managedServerNames,
      );
    };

    const notifyCancel = async (): Promise<void> => {
      try {
        await agent.notify(methods.agent.session.cancel, {
          sessionId: live.sessionId,
        });
      } catch {
        // The connection is already gone; the kill timer below still ends the turn.
      }
    };
    const onAbort = (): void => {
      void notifyCancel();
      // An agent that ignores session/cancel must not hold the turn open.
      killTimer = setTimeout(() => {
        queue.push(terminalError('cancelled'));
        queue.end();
        drop(live);
      }, CANCEL_GRACE_MS);
      killTimer.unref();
    };
    run.signal?.addEventListener('abort', onAbort, { once: true });

    const prompting = (async (): Promise<void> => {
      try {
        await applyMode(live, run);
        await applyModel(live, run.model);
        const response = await agent.request(methods.agent.session.prompt, {
          prompt: [{ text: composePrompt(run, fresh), type: 'text' }],
          sessionId: live.sessionId,
        });
        queue.push(acpTerminalChunk(response));
      } catch (error) {
        queue.push(terminalError(describeAcpError(error, live.stderrTail())));
        drop(live);
      } finally {
        queue.end();
      }
    })();

    try {
      if (run.signal?.aborted === true) {
        onAbort();
      }
      if (live.sessionId !== run.sessionId) {
        yield {
          delta: '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId: live.sessionId },
        };
      }
      yield* queue;
    } finally {
      run.signal?.removeEventListener('abort', onAbort);
      if (killTimer !== null) {
        clearTimeout(killTimer);
      }
      live.routes.onUpdate = null;
      live.routes.onPermission = () => REFUSE_OUTSIDE_TURN;
      await prompting;
      if (pool.get(live.key) === live) {
        scheduleIdle(live);
      }
    }
  }

  async function* streamAcp(
    run: ConversationBackendRun,
  ): AsyncGenerator<ConversationStreamChunk> {
    const cwd = run.cwd;
    if (cwd === undefined || cwd === '') {
      throw new Error(`The ${spec.id} ACP backend requires a cwd.`);
    }

    const acquired = await acquire(run, cwd);
    if (!acquired.ok) {
      yield terminalError(acquired.message);
      return;
    }

    // One turn at a time per session; a second turn waits for the first.
    const previous = acquired.live.turn;
    let release = (): void => {
      return undefined;
    };
    acquired.live.turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await previous;
      yield* runTurn(run, acquired);
    } finally {
      release();
    }
  }

  return {
    stream: (run: ConversationBackendRun) => {
      return streamAcp(run);
    },
  };
}
