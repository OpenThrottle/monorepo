/**
 * An in-process ACP agent for tests. The SDK connects a client app directly to
 * an `AgentApp`, so the real backend runs end-to-end — initialize, auth,
 * session/new|load, set_config_option, prompt, updates, permission requests,
 * cancel — with no child process.
 */

import {
  agent,
  type AgentContext,
  type ClientConnection,
  methods,
  type PromptResponse,
  type SessionConfigOption,
  type SessionModeState,
} from '@agentclientprotocol/sdk';

import type { AcpAgentSpec } from '../agent-specs.ts';
import type { AcpLauncher } from '../launcher.ts';

/** Everything the fake saw, for assertions. */
export interface FakeAgentLog {
  readonly authenticated: string[];
  readonly cancels: string[];
  readonly configSets: Array<{ configId: string; value: string }>;
  readonly loads: string[];
  readonly modeSets: string[];
  readonly news: Array<{ cwd: string; mcpServerNames: string[] }>;
  readonly prompts: string[];
}

/** The scripted behavior of one fake agent. */
export interface FakeAgentScript {
  readonly authMethods: readonly string[];
  readonly configOptions: SessionConfigOption[];
  /** Session ids `session/load` accepts; undefined disables loadSession. */
  readonly loadable: readonly string[] | undefined;
  /** Legacy `modes` returned by session/new|load; undefined advertises none. */
  readonly modes: SessionModeState | undefined;
  readonly onPrompt: (turn: FakeTurn) => Promise<PromptResponse>;
}

/** What a scripted prompt handler can do. */
export interface FakeTurn {
  /** Resolves when the client sends session/cancel for this session. */
  readonly cancelled: Promise<void>;
  readonly client: AgentContext;
  readonly sessionId: string;
  readonly text: string;
}

/** A launcher backed by a fresh fake agent per launch, plus its shared log. */
export interface FakeLauncher {
  readonly launch: AcpLauncher;
  readonly launches: () => number;
  readonly log: FakeAgentLog;
}

/** A spec for tests; the launcher never reads its binary fields. */
export const FAKE_SPEC: AcpAgentSpec = {
  args: ['acp'],
  asksBeforeEdits: true,
  authMethodId: () => {
    return 'fake-login';
  },
  binEnv: 'OPENTHROTTLE_FAKE_ACP_BIN',
  defaultBin: 'fake-acp',
  env: (host) => {
    return host;
  },
  id: 'fake',
  processGroup: false,
  sessionMode: () => {
    return undefined;
  },
};

/** A select config option named `model` with the given values. */
export function modelOption(
  currentValue: string,
  values: readonly string[],
): SessionConfigOption {
  return {
    category: 'model',
    currentValue,
    id: 'model',
    name: 'Model',
    options: values.map((value) => ({ name: value, value })),
    type: 'select',
  };
}

/**
 * Build a launcher whose every launch is a new fake agent process sharing one
 * log, so a test can observe process reuse and resume across launches.
 */
export function createFakeLauncher(script: FakeAgentScript): FakeLauncher {
  const log: FakeAgentLog = {
    authenticated: [],
    cancels: [],
    configSets: [],
    loads: [],
    modeSets: [],
    news: [],
    prompts: [],
  };
  let launches = 0;
  let nextSession = 0;

  const launch: AcpLauncher = () => {
    launches += 1;
    const cancelWaiters = new Map<string, () => void>();
    let options = [...script.configOptions];

    const app = agent({ name: 'fake-agent' })
      .onRequest(methods.agent.initialize, () => {
        return {
          agentCapabilities: { loadSession: script.loadable !== undefined },
          authMethods: script.authMethods.map((id) => ({ id, name: id })),
          protocolVersion: 1,
        };
      })
      .onRequest(methods.agent.authenticate, ({ params }) => {
        log.authenticated.push(params.methodId);
        return {};
      })
      .onRequest(methods.agent.session.new, ({ params }) => {
        nextSession += 1;
        log.news.push({
          cwd: params.cwd,
          mcpServerNames: params.mcpServers.map((server) => server.name),
        });
        return {
          configOptions: options,
          modes: script.modes ?? null,
          sessionId: `minted-${nextSession}`,
        };
      })
      .onRequest(methods.agent.session.load, async ({ client, params }) => {
        log.loads.push(params.sessionId);
        if (!(script.loadable ?? []).includes(params.sessionId)) {
          throw new Error('Session not found');
        }
        // Replay arrives before the response, as cursor-agent does.
        await client.notify(methods.client.session.update, {
          sessionId: params.sessionId,
          update: {
            content: { text: 'REPLAYED HISTORY', type: 'text' },
            sessionUpdate: 'agent_message_chunk',
          },
        });
        return { configOptions: options, modes: script.modes ?? null };
      })
      .onRequest(methods.agent.session.setMode, ({ params }) => {
        log.modeSets.push(params.modeId);
        return {};
      })
      .onRequest(methods.agent.session.setConfigOption, ({ params }) => {
        const value = 'value' in params ? String(params.value) : '';
        log.configSets.push({ configId: params.configId, value });
        options = options.map((option) => {
          return option.id === params.configId && option.type === 'select'
            ? { ...option, currentValue: value }
            : option;
        });
        return { configOptions: options };
      })
      .onRequest(methods.agent.session.prompt, async ({ client, params }) => {
        const [block] = params.prompt;
        const text = block?.type === 'text' ? block.text : '';
        log.prompts.push(text);
        const cancelled = new Promise<void>((resolve) => {
          cancelWaiters.set(params.sessionId, resolve);
        });
        return script.onPrompt({
          cancelled,
          client,
          sessionId: params.sessionId,
          text,
        });
      })
      .onNotification(methods.agent.session.cancel, ({ params }) => {
        log.cancels.push(params.sessionId);
        cancelWaiters.get(params.sessionId)?.();
      });

    let connection: ClientConnection | undefined;
    return {
      connect: (clientApp) => {
        connection = clientApp.connect(app);
        return connection;
      },
      dispose: () => {
        connection?.close();
      },
      stderrTail: () => {
        return '';
      },
    };
  };

  return {
    launch,
    launches: () => {
      return launches;
    },
    log,
  };
}
