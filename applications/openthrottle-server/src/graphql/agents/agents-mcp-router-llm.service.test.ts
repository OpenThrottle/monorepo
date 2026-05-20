import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AgentsMcpRouterLlmService } from './agents-mcp-router-llm.service';

describe('AgentsMcpRouterLlmService', () => {
  let configGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    configGet = vi.fn();
  });

  const createService = async (): Promise<AgentsMcpRouterLlmService> => {
    const app = await Test.createTestingModule({
      providers: [
        AgentsMcpRouterLlmService,
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    return app.get(AgentsMcpRouterLlmService);
  };

  test('shouldAttemptLlmRefinement is false when feature flag is off', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'AGENTS_MCP_ROUTER_LLM_FALLBACK') {
        return undefined;
      }

      return undefined;
    });

    const svc = await createService();

    expect(
      svc.shouldAttemptLlmRefinement({
        args: { query: 'x' },
        confidence: 0.1,
        reason: 'default_semantic_search',
        tool: 'semantic_search',
      }),
    ).toBe(false);
  });

  test('shouldAttemptLlmRefinement is true when enabled and confidence is below threshold', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'AGENTS_MCP_ROUTER_LLM_FALLBACK') {
        return 'true';
      }

      if (key === 'AGENTS_MCP_ROUTER_LLM_CONFIDENCE_THRESHOLD') {
        return '0.55';
      }

      return undefined;
    });

    const svc = await createService();

    expect(
      svc.shouldAttemptLlmRefinement({
        args: { query: 'x' },
        confidence: 0.38,
        reason: 'default_semantic_search',
        tool: 'semantic_search',
      }),
    ).toBe(true);
  });

  test('shouldAttemptLlmRefinement is false when confidence meets threshold', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'AGENTS_MCP_ROUTER_LLM_FALLBACK') {
        return '1';
      }

      if (key === 'AGENTS_MCP_ROUTER_LLM_CONFIDENCE_THRESHOLD') {
        return '0.55';
      }

      return undefined;
    });

    const svc = await createService();

    expect(
      svc.shouldAttemptLlmRefinement({
        args: {},
        confidence: 0.9,
        reason: 'list_sources_keywords',
        tool: 'list_sources',
      }),
    ).toBe(false);
  });

  test('refineRoute returns null when no chat model is configured', async () => {
    configGet.mockReturnValue(undefined);
    const svc = await createService();

    expect(await svc.refineRoute({ message: 'hello' })).toBeNull();
  });
});
