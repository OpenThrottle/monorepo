import { createMock } from '@golevelup/ts-vitest';
import type { PubSubEngine } from '@openthrottle/nestjs-graphql';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  AgentSetupResult,
  RunAgentSetupOptions,
} from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentDiscoveryService } from '../agent-discovery/agent-discovery.service';
import { AgentSetupService } from './agent-setup.service';
import { AGENT_SETUP_CHUNK_FIELD } from './agent-setup.types';

const { runAgentSetupMock } = vi.hoisted(() => ({
  runAgentSetupMock: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@openthrottle/openthrottle-agentic-utils')
  >()),
  runAgentSetup: runAgentSetupMock,
}));

function build(): {
  invalidate: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>;
  service: AgentSetupService;
} {
  const invalidate = vi.fn();
  const publish = vi.fn().mockResolvedValue(undefined);
  const agentDiscovery = createMock<AgentDiscoveryService>({ invalidate });
  const logger = createMock<LoggerService>();
  const pubSub = createMock<PubSubEngine>({ publish });
  return {
    invalidate,
    publish,
    service: new AgentSetupService(agentDiscovery, logger, pubSub),
  };
}

describe('AgentSetupService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('streams chunks, emits a terminal chunk, and invalidates discovery on success', async () => {
    runAgentSetupMock.mockImplementation(
      async (options: RunAgentSetupOptions): Promise<AgentSetupResult> => {
        options.onChunk?.({ data: 'installing...', stream: 'stdout' });
        options.onChunk?.({ data: 'a note', stream: 'stderr' });
        return {
          backend: options.backend,
          durationMs: 5,
          exitCode: 0,
          mode: options.mode,
          ok: true,
        };
      },
    );

    const { invalidate, publish, service } = build();
    const runId = service.start({ backend: 'claude', mode: 'install' });
    expect(runId).toEqual(expect.any(String));

    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));

    const payloads = publish.mock.calls.map(
      (call) => call[1][AGENT_SETUP_CHUNK_FIELD],
    );
    expect(payloads.map((p) => `${p.stream}:${p.data}:${p.done}`)).toEqual([
      'stdout:installing...:false',
      'stderr:a note:false',
      'stdout::true',
    ]);
    expect(payloads.at(-1)).toMatchObject({
      done: true,
      error: null,
      exitCode: 0,
    });
  });

  it('emits a terminal error chunk and does NOT invalidate on failure', async () => {
    runAgentSetupMock.mockResolvedValue({
      backend: 'grok',
      durationMs: 1,
      exitCode: 7,
      mode: 'install',
      ok: false,
      reason: 'non-zero-exit',
    } satisfies AgentSetupResult);

    const { invalidate, publish, service } = build();
    service.start({ backend: 'grok', mode: 'install' });

    await vi.waitFor(() => expect(publish).toHaveBeenCalled());
    const terminal = publish.mock.calls.at(-1)?.[1][AGENT_SETUP_CHUNK_FIELD];
    expect(terminal).toMatchObject({
      done: true,
      error: 'non-zero-exit',
      exitCode: 7,
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
