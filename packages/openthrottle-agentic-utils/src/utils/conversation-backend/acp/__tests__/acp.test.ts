/**
 * End-to-end tests for the ACP conversation backend against an in-process fake
 * ACP agent: the real SDK on both sides, no child process.
 */

import {
  methods,
  type PermissionOption,
  type PromptResponse,
  type SessionConfigOption,
} from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';

import type {
  ConversationBackendRun,
  ConversationStreamChunk,
} from '../../types.ts';
import { createAcpConversationBackend } from '../acp.ts';
import { resolveAcpPermission } from '../permissions.ts';
import {
  createFakeLauncher,
  FAKE_SPEC,
  type FakeTurn,
  modelOption,
} from './fake-agent.ts';

const END_TURN: PromptResponse = { stopReason: 'end_turn' };

const run = (
  extra: Partial<ConversationBackendRun>,
): ConversationBackendRun => {
  return {
    cwd: '/work',
    messages: [{ content: 'hello', role: 'user' }],
    model: 'auto',
    ...extra,
  };
};

const collect = async (
  stream: AsyncIterable<ConversationStreamChunk>,
): Promise<ConversationStreamChunk[]> => {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
};

const visible = (
  chunks: readonly ConversationStreamChunk[],
): ConversationStreamChunk[] => {
  return chunks.filter((chunk) => chunk.kind !== 'keepalive');
};

const say = async (turn: FakeTurn, text: string): Promise<void> => {
  await turn.client.notify(methods.client.session.update, {
    sessionId: turn.sessionId,
    update: {
      content: { text, type: 'text' },
      sessionUpdate: 'agent_message_chunk',
    },
  });
};

const reply = (text: string): ((turn: FakeTurn) => Promise<PromptResponse>) => {
  return async (turn) => {
    await say(turn, text);
    return END_TURN;
  };
};

describe('createAcpConversationBackend', () => {
  describe('first turn', () => {
    it('mints a session, reports its id, and streams text to a clean finish', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('hi there'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      const chunks = visible(await collect(backend.stream(run({}))));

      expect(chunks[0]).toMatchObject({
        kind: 'session',
        metadata: { sessionId: 'minted-1' },
      });
      expect(chunks[1]).toMatchObject({ delta: 'hi there', kind: 'text' });
      expect(chunks.at(-1)).toMatchObject({ done: true, error: null });
      expect(fake.log.news).toEqual([{ cwd: '/work', mcpServerNames: [] }]);
    });

    it('gives a fresh session the persona but not prior turns', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: undefined,
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      await collect(
        backend.stream(
          run({
            messages: [
              { content: 'earlier', role: 'user' },
              { content: 'answer', role: 'assistant' },
              { content: 'now', role: 'user' },
            ],
            systemPrompt: 'Be terse.',
          }),
        ),
      );

      expect(fake.log.prompts[0]).toContain('Be terse.');
      expect(fake.log.prompts[0]).not.toContain('earlier');
      expect(fake.log.prompts[0]).toContain('now');
    });

    it('authenticates only with a method the agent advertises', async () => {
      const advertised = createFakeLauncher({
        authMethods: ['fake-login'],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const silent = createFakeLauncher({
        authMethods: ['something-else'],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });

      await collect(
        createAcpConversationBackend(FAKE_SPEC, {
          launch: advertised.launch,
        }).stream(run({})),
      );
      await collect(
        createAcpConversationBackend(FAKE_SPEC, {
          launch: silent.launch,
        }).stream(run({})),
      );

      expect(advertised.log.authenticated).toEqual(['fake-login']);
      expect(silent.log.authenticated).toEqual([]);
    });

    it('passes the managed MCP servers to session/new', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      await collect(
        backend.stream(
          run({
            mcpServers: { openthrottle: { args: [], command: 'ot-mcp' } },
          }),
        ),
      );

      expect(fake.log.news[0]?.mcpServerNames).toEqual(['openthrottle']);
    });
  });

  describe('later turns', () => {
    it('reuse the live process and send only the new message', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });
      await collect(backend.stream(run({})));

      const second = visible(
        await collect(
          backend.stream(
            run({
              fileMentions: ['src/a.ts'],
              messages: [
                { content: 'hello', role: 'user' },
                { content: 'ok', role: 'assistant' },
                { content: 'next', role: 'user' },
              ],
              sessionId: 'minted-1',
            }),
          ),
        ),
      );

      expect(fake.launches()).toBe(1);
      expect(second.some((chunk) => chunk.kind === 'session')).toBe(false);
      expect(fake.log.prompts[1]).toContain('next');
      expect(fake.log.prompts[1]).toContain('src/a.ts');
      expect(fake.log.prompts[1]).not.toContain('hello');
    });

    it('resume a session the process lost via session/load, dropping the replay', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: ['persisted-7'],
        modes: undefined,
        onPrompt: reply('resumed'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      const chunks = visible(
        await collect(backend.stream(run({ sessionId: 'persisted-7' }))),
      );

      expect(fake.log.loads).toEqual(['persisted-7']);
      expect(fake.log.news).toEqual([]);
      expect(chunks.map((chunk) => chunk.delta).join('')).toBe('resumed');
      expect(chunks.some((chunk) => chunk.kind === 'session')).toBe(false);
    });

    it('mint a new session when session/load rejects the id', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      const chunks = visible(
        await collect(backend.stream(run({ sessionId: 'unknown' }))),
      );

      expect(fake.log.loads).toEqual(['unknown']);
      expect(chunks[0]).toMatchObject({
        kind: 'session',
        metadata: { sessionId: 'minted-1' },
      });
    });
  });

  describe('model selection', () => {
    it('sets the model config option to the matching agent value', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [
          modelOption('default[]', ['default[]', 'gpt-5.5[fast=true]']),
        ],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      await collect(backend.stream(run({ model: 'gpt-5.5' })));
      await collect(
        backend.stream(run({ model: 'gpt-5.5', sessionId: 'minted-1' })),
      );

      expect(fake.log.configSets).toEqual([
        { configId: 'model', value: 'gpt-5.5[fast=true]' },
      ]);
    });

    it('leaves the model alone for auto', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [modelOption('default[]', ['default[]', 'gpt-5.5'])],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });

      await collect(
        createAcpConversationBackend(FAKE_SPEC, { launch: fake.launch }).stream(
          run({}),
        ),
      );

      expect(fake.log.configSets).toEqual([]);
    });
  });

  describe('session mode', () => {
    const MODE_SPEC = {
      ...FAKE_SPEC,
      sessionMode: (mode: ConversationBackendRun['permissionMode']) => {
        return mode === 'supervised' ? 'ask-first' : 'auto-edit';
      },
    };
    const ASK_FIRST = { name: 'Ask first', value: 'ask-first' };
    const AUTO_EDIT = { name: 'Auto edit', value: 'auto-edit' };
    const modeOption = (
      values: ReadonlyArray<{ readonly name: string; readonly value: string }>,
    ): SessionConfigOption => {
      return {
        category: 'mode',
        currentValue: 'auto-edit',
        id: 'mode',
        name: 'Mode',
        options: [...values],
        type: 'select',
      };
    };

    it('sets the mode config option for the posture, once per change', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [modeOption([ASK_FIRST, AUTO_EDIT])],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(MODE_SPEC, {
        launch: fake.launch,
      });

      await collect(backend.stream(run({ permissionMode: 'supervised' })));
      await collect(
        backend.stream(
          run({ permissionMode: 'supervised', sessionId: 'minted-1' }),
        ),
      );
      await collect(
        backend.stream(
          run({ permissionMode: 'autoAcceptEdits', sessionId: 'minted-1' }),
        ),
      );

      expect(fake.log.configSets).toEqual([
        { configId: 'mode', value: 'ask-first' },
        { configId: 'mode', value: 'auto-edit' },
      ]);
      expect(fake.log.modeSets).toEqual([]);
    });

    it('falls back to session/set_mode when the agent only advertises modes', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: {
          availableModes: [
            { id: 'ask-first', name: 'Ask first' },
            { id: 'auto-edit', name: 'Auto edit' },
          ],
          currentModeId: 'auto-edit',
        },
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(MODE_SPEC, {
        launch: fake.launch,
      });

      await collect(backend.stream(run({ permissionMode: 'supervised' })));
      await collect(
        backend.stream(
          run({ permissionMode: 'supervised', sessionId: 'minted-1' }),
        ),
      );

      expect(fake.log.modeSets).toEqual(['ask-first']);
    });

    it('leaves a mode the agent does not offer alone', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [modeOption([AUTO_EDIT])],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });

      await collect(
        createAcpConversationBackend(MODE_SPEC, { launch: fake.launch }).stream(
          run({ permissionMode: 'supervised' }),
        ),
      );

      expect(fake.log.configSets).toEqual([]);
    });

    it('leaves the mode alone when the spec maps none', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [modeOption([ASK_FIRST, AUTO_EDIT])],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });

      await collect(
        createAcpConversationBackend(FAKE_SPEC, { launch: fake.launch }).stream(
          run({ permissionMode: 'supervised' }),
        ),
      );

      expect(fake.log.configSets).toEqual([]);
    });
  });

  describe('permission requests', () => {
    const askTwice = async (turn: FakeTurn): Promise<PromptResponse> => {
      const options: PermissionOption[] = [
        { kind: 'allow_once', name: 'Allow', optionId: 'yes' },
        { kind: 'reject_once', name: 'Reject', optionId: 'no' },
      ];
      const mcp = await turn.client.request(
        methods.client.session.requestPermission,
        {
          options,
          sessionId: turn.sessionId,
          toolCall: {
            kind: 'other',
            title: 'openthrottle-get_plan: get_plan',
            toolCallId: 't1',
          },
        },
      );
      const shell = await turn.client.request(
        methods.client.session.requestPermission,
        {
          options,
          sessionId: turn.sessionId,
          toolCall: {
            kind: 'execute',
            title: 'rm -rf build',
            toolCallId: 't2',
          },
        },
      );
      await say(
        turn,
        `${JSON.stringify(mcp.outcome)}|${JSON.stringify(shell.outcome)}`,
      );
      return END_TURN;
    };

    it('allows managed MCP tools and refuses the rest by default', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: askTwice,
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      const chunks = await collect(
        backend.stream(
          run({ mcpServers: { openthrottle: { command: 'ot-mcp' } } }),
        ),
      );
      const text = chunks.map((chunk) => chunk.delta).join('');

      expect(text).toBe(
        '{"optionId":"yes","outcome":"selected"}|{"optionId":"no","outcome":"selected"}',
      );
    });

    it('allows everything under fullAccess', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: askTwice,
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      const chunks = await collect(
        backend.stream(run({ permissionMode: 'fullAccess' })),
      );

      expect(chunks.map((chunk) => chunk.delta).join('')).not.toContain('"no"');
    });
    describe('supervised', () => {
      const askShell = async (turn: FakeTurn): Promise<PromptResponse> => {
        const response = await turn.client.request(
          methods.client.session.requestPermission,
          {
            options: [
              { kind: 'allow_once', name: 'Allow', optionId: 'yes' },
              { kind: 'reject_once', name: 'Reject', optionId: 'no' },
            ],
            sessionId: turn.sessionId,
            toolCall: {
              kind: 'execute',
              title: 'rm -rf build',
              toolCallId: 't2',
            },
          },
        );
        await say(turn, JSON.stringify(response.outcome));
        return END_TURN;
      };

      const supervisedBackend = (): ReturnType<
        typeof createAcpConversationBackend
      > => {
        const fake = createFakeLauncher({
          authMethods: [],
          configOptions: [],
          loadable: [],
          modes: undefined,
          onPrompt: askShell,
        });
        return createAcpConversationBackend(FAKE_SPEC, { launch: fake.launch });
      };

      it('surfaces the request, waits for a human, and relays the chosen option', async () => {
        const chunks: ConversationStreamChunk[] = [];
        for await (const chunk of supervisedBackend().stream(
          run({ permissionMode: 'supervised' }),
        )) {
          chunks.push(chunk);
          const requestId = chunk.metadata?.['requestId'];
          if (
            chunk.kind === 'permission_request' &&
            typeof requestId === 'string' &&
            chunk.metadata?.['resolution'] === undefined
          ) {
            expect(resolveAcpPermission(requestId, 'yes')).toBe(true);
          }
        }
        const requests = chunks.filter((chunk) => {
          return chunk.kind === 'permission_request';
        });

        expect(requests).toHaveLength(2);
        expect(requests[0]?.metadata).toMatchObject({
          options: [
            { kind: 'allow_once', name: 'Allow', optionId: 'yes' },
            { kind: 'reject_once', name: 'Reject', optionId: 'no' },
          ],
          toolCall: {
            kind: 'execute',
            title: 'rm -rf build',
            toolCallId: 't2',
          },
        });
        expect(requests[1]?.metadata).toMatchObject({
          resolution: { optionId: 'yes', outcome: 'selected' },
        });
        expect(chunks.map((chunk) => chunk.delta).join('')).toBe(
          '{"optionId":"yes","outcome":"selected"}',
        );
      });

      describe('persistent options', () => {
        // cursor offers allow_always, which writes the command into the host's
        // ~/.cursor/cli-config.json allowlist — a durable change outside OT.
        const askWithAlways = async (
          turn: FakeTurn,
        ): Promise<PromptResponse> => {
          const response = await turn.client.request(
            methods.client.session.requestPermission,
            {
              options: [
                { kind: 'allow_once', name: 'Allow once', optionId: 'once' },
                {
                  kind: 'allow_always',
                  name: 'Allow always',
                  optionId: 'always',
                },
                { kind: 'reject_once', name: 'Reject', optionId: 'no' },
              ],
              sessionId: turn.sessionId,
              toolCall: { kind: 'execute', title: 'whoami', toolCallId: 't3' },
            },
          );
          await say(turn, JSON.stringify(response.outcome));
          return END_TURN;
        };

        const streamAnswering = async (
          optionId: string,
        ): Promise<ConversationStreamChunk[]> => {
          const fake = createFakeLauncher({
            authMethods: [],
            configOptions: [],
            loadable: [],
            modes: undefined,
            onPrompt: askWithAlways,
          });
          const backend = createAcpConversationBackend(FAKE_SPEC, {
            launch: fake.launch,
          });
          const chunks: ConversationStreamChunk[] = [];
          for await (const chunk of backend.stream(
            run({ permissionMode: 'supervised' }),
          )) {
            chunks.push(chunk);
            const requestId = chunk.metadata?.['requestId'];
            if (
              chunk.kind === 'permission_request' &&
              typeof requestId === 'string' &&
              chunk.metadata?.['resolution'] === undefined
            ) {
              resolveAcpPermission(requestId, optionId);
            }
          }
          return chunks;
        };

        it('does not offer allow_always on the card', async () => {
          const chunks = await streamAnswering('once');
          const request = chunks.find((chunk) => {
            return chunk.kind === 'permission_request';
          });

          expect(request?.metadata?.['options']).toEqual([
            { kind: 'allow_once', name: 'Allow once', optionId: 'once' },
            { kind: 'reject_once', name: 'Reject', optionId: 'no' },
          ]);
          expect(chunks.map((chunk) => chunk.delta).join('')).toBe(
            '{"optionId":"once","outcome":"selected"}',
          );
        });

        it('cancels instead of relaying an allow_always id the card never showed', async () => {
          const chunks = await streamAnswering('always');

          expect(chunks.map((chunk) => chunk.delta).join('')).toBe(
            '{"outcome":"cancelled"}',
          );
          const resolution = chunks.find((chunk) => {
            return chunk.metadata?.['resolution'] !== undefined;
          });
          expect(resolution?.metadata).toMatchObject({
            resolution: { optionId: null, outcome: 'cancelled' },
          });
        });
      });

      it('settles a pending request as cancelled when the turn aborts', async () => {
        const controller = new AbortController();
        const chunks: ConversationStreamChunk[] = [];
        for await (const chunk of supervisedBackend().stream(
          run({ permissionMode: 'supervised', signal: controller.signal }),
        )) {
          chunks.push(chunk);
          if (chunk.kind === 'permission_request') {
            controller.abort();
          }
        }
        const resolution = chunks.find((chunk) => {
          return chunk.metadata?.['resolution'] !== undefined;
        });

        expect(resolution?.metadata).toMatchObject({
          resolution: { optionId: null, outcome: 'cancelled' },
        });
      });
    });
  });

  describe('cancel', () => {
    it('sends session/cancel, ends the turn as cancelled, and keeps the process', async () => {
      let promptCount = 0;
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: async (turn) => {
          promptCount += 1;
          if (promptCount > 1) {
            await say(turn, 'still here');
            return END_TURN;
          }
          await say(turn, 'partial');
          await turn.cancelled;
          return { stopReason: 'cancelled' };
        },
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });
      const controller = new AbortController();

      const chunks: ConversationStreamChunk[] = [];
      for await (const chunk of backend.stream(
        run({ signal: controller.signal }),
      )) {
        chunks.push(chunk);
        if (chunk.delta === 'partial') {
          controller.abort();
        }
      }
      const next = await collect(
        backend.stream(run({ sessionId: 'minted-1' })),
      );

      expect(fake.log.cancels).toEqual(['minted-1']);
      expect(chunks.at(-1)).toMatchObject({ done: true, error: 'cancelled' });
      expect(next.map((chunk) => chunk.delta).join('')).toBe('still here');
      expect(fake.launches()).toBe(1);
    });
  });

  describe('failures', () => {
    it('ends with an error chunk when the agent rejects the prompt', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: () => {
          return Promise.reject(new Error('model unavailable'));
        },
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      const chunks = await collect(backend.stream(run({})));

      expect(chunks.at(-1)?.done).toBe(true);
      expect(chunks.at(-1)?.error).toMatch(/^ACP agent error/);
    });

    it('requires a cwd', async () => {
      const fake = createFakeLauncher({
        authMethods: [],
        configOptions: [],
        loadable: [],
        modes: undefined,
        onPrompt: reply('ok'),
      });
      const backend = createAcpConversationBackend(FAKE_SPEC, {
        launch: fake.launch,
      });

      await expect(collect(backend.stream(run({ cwd: '' })))).rejects.toThrow(
        /requires a cwd/,
      );
    });
  });
});
