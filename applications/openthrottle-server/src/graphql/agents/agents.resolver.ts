/**
 * @description GraphQL resolver for the agents chat namespace. Runs one turn by delegating to the in-process MCP developer semantic_search tool (OpenThrottle knowledge base).
 */

import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import {
  McpDeveloperMcpSurface,
  withMcpDeveloperAuthTokenAsync,
} from '@openthrottle/nestjs-mcp-developer';
import {
  agentsChatTurnFromSemanticSearchMcp,
  parseBearerJwt,
} from './agents-mcp-chat.mapper';
import { AgentsRunChatTurnInput } from './agents.input';
import { AgentsChatTurnResult } from './agents.object';

interface AgentsGqlContext {
  readonly req?: { headers?: Record<string, string | string[] | undefined> };
}

@Resolver()
export class AgentsResolver {
  constructor(private readonly mcpSurface: McpDeveloperMcpSurface) {}

  /**
   * @description Runs one agents chat turn: validates input, forwards the user message to MCP `semantic_search`, and returns assistant-facing text plus optional tool metadata JSON.
   */
  @Mutation(() => AgentsChatTurnResult, {
    description: `Agents namespace: run one chat turn against the server-side agents path (OpenThrottle / MCP developer). Returns assistant text and optional tool metadata JSON; uses errorMessage instead of throws for expected validation failures.`,
    name: 'agentsRunChatTurn',
  })
  async agentsRunChatTurn(
    @Context() context: AgentsGqlContext,
    @Args('input', { type: () => AgentsRunChatTurnInput })
    input: AgentsRunChatTurnInput,
  ): Promise<AgentsChatTurnResult> {
    const message = input.message?.trim() ?? '';

    if (!message) {
      const failed = new AgentsChatTurnResult();

      failed.assistantText = null;
      failed.errorMessage = 'Message is required.';
      failed.toolMetadataJson = null;

      return failed;
    }

    const authorization = context.req?.headers?.authorization;
    const bearer = parseBearerJwt(authorization);

    try {
      return await withMcpDeveloperAuthTokenAsync(bearer, async () => {
        const mcpResult = await this.mcpSurface.semanticSearch({
          query: message,
        });

        return agentsChatTurnFromSemanticSearchMcp(mcpResult, {
          arguments: {
            conversationId: input.conversationId ?? undefined,
            query: message,
          },
        });
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const failed = new AgentsChatTurnResult();

      failed.assistantText = null;
      failed.toolMetadataJson = null;

      if (msg.includes('Auth token required')) {
        failed.errorMessage =
          'OpenThrottle tools need a Bearer token on this request or MCP_DEVELOPER_AUTH_TOKEN in the server environment.';

        return failed;
      }

      failed.errorMessage = msg;

      return failed;
    }
  }
}
