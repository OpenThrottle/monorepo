/**
 * @description GraphQL resolver for the agents chat namespace. Runs one turn by routing to the in-process {@link McpDeveloperMcpSurface} tools (OpenThrottle / MCP developer).
 */

import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import {
  McpDeveloperMcpSurface,
  withMcpDeveloperAuthTokenAsync,
} from '@openthrottle/nestjs-mcp-developer';
import {
  isAgentsChatMutationRoutedTool,
  readAgentsChatMutationsEnabledFromConfig,
} from './agents-chat-mutation-policy';
import {
  agentsChatTurnFromMcpToolResult,
  parseBearerJwt,
} from './agents-mcp-chat.mapper';
import { dispatchAgentsMcpRoutedTool } from './agents-mcp-dispatch';
import { AgentsMcpRouterLlmService } from './agents-mcp-router-llm.service';
import { AgentsMcpRouter } from './agents-mcp-router';
import { AgentsRunChatTurnInput } from './agents.input';
import { AgentsChatTurnResult } from './agents.object';

interface AgentsGqlContext {
  readonly req?: { headers?: Record<string, string | string[] | undefined> };
}

@Resolver()
export class AgentsResolver {
  constructor(
    private readonly config: ConfigService,
    private readonly mcpRouter: AgentsMcpRouter,
    private readonly mcpRouterLlm: AgentsMcpRouterLlmService,
    private readonly mcpSurface: McpDeveloperMcpSurface,
  ) {}

  /**
   * @description Runs one agents chat turn: validates input, routes to an MCP developer tool, dispatches on {@link McpDeveloperMcpSurface}, and returns assistant-facing text plus optional tool metadata JSON.
   */
  @Mutation(() => AgentsChatTurnResult, {
    description: `Agents namespace: run one chat turn against the server-side agents path (OpenThrottle / MCP developer). Returns assistant text, mcpTool, structuredPayloadJson, and toolMetadataJson; uses errorMessage instead of throws for expected validation failures.`,
    name: 'agentsRunChatTurn',
  })
  async agentsRunChatTurn(
    @Context() context: AgentsGqlContext,
    @Args('input', { type: () => AgentsRunChatTurnInput })
    input: AgentsRunChatTurnInput,
  ): Promise<AgentsChatTurnResult> {
    const message = input.message?.trim() ?? '';
    const readOnlyAgentsChat = !readAgentsChatMutationsEnabledFromConfig(
      this.config,
    );
    const conversationEcho = input.conversationId ?? null;

    if (!message) {
      const failed = new AgentsChatTurnResult();

      failed.assistantText = null;
      failed.conversationId = conversationEcho;
      failed.errorMessage = 'Message is required.';
      failed.mcpTool = null;
      failed.readOnlyAgentsChat = readOnlyAgentsChat;
      failed.routingConfidence = null;
      failed.routingReason = null;
      failed.structuredPayloadJson = null;
      failed.toolMetadataJson = null;

      return failed;
    }

    const authorization = context.req?.headers?.authorization;
    const bearer = parseBearerJwt(authorization);

    try {
      return await withMcpDeveloperAuthTokenAsync(bearer, async () => {
        let route = this.mcpRouter.route({
          conversationId: input.conversationId ?? undefined,
          message,
        });

        if (this.mcpRouterLlm.shouldAttemptLlmRefinement(route)) {
          const refined = await this.mcpRouterLlm.refineRoute({ message });

          if (refined != null) {
            route = {
              ...refined,
              reason: `llm_fallback:${refined.reason}`,
            };
          }
        }

        if (
          isAgentsChatMutationRoutedTool(route.tool) &&
          !readAgentsChatMutationsEnabledFromConfig(this.config)
        ) {
          const blocked = new AgentsChatTurnResult();

          blocked.assistantText = null;
          blocked.conversationId = conversationEcho;
          blocked.errorMessage = `This agents chat path is read-only. Enable AGENTS_CHAT_ALLOW_MUTATIONS on the server to allow routed write tools.`;
          blocked.mcpTool = route.tool;
          blocked.readOnlyAgentsChat = true;
          blocked.routingConfidence = route.confidence;
          blocked.routingReason = route.reason;
          blocked.structuredPayloadJson = null;
          blocked.toolMetadataJson = JSON.stringify({
            arguments: route.args,
            confidence: route.confidence,
            readOnlyAgentsChat: true,
            routeReason: route.reason,
            tool: route.tool,
          });

          return blocked;
        }

        const mcpResult = await dispatchAgentsMcpRoutedTool(
          this.mcpSurface,
          route,
        );

        const argumentsWithConversation: Record<string, unknown> = {
          ...route.args,
          conversationId: input.conversationId ?? undefined,
        };

        return agentsChatTurnFromMcpToolResult(mcpResult, {
          arguments: argumentsWithConversation,
          confidence: route.confidence,
          conversationId: conversationEcho,
          readOnlyAgentsChat,
          routeReason: route.reason,
          tool: route.tool,
        });
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const failed = new AgentsChatTurnResult();

      failed.assistantText = null;
      failed.conversationId = conversationEcho;
      failed.mcpTool = null;
      failed.readOnlyAgentsChat = readOnlyAgentsChat;
      failed.routingConfidence = null;
      failed.routingReason = null;
      failed.structuredPayloadJson = null;
      failed.toolMetadataJson = null;

      if (msg.includes('Auth token required')) {
        failed.errorMessage = `OpenThrottle tools need a Bearer token on this request or MCP_DEVELOPER_AUTH_TOKEN in the server environment.`;

        return failed;
      }

      failed.errorMessage = msg;

      return failed;
    }
  }
}
