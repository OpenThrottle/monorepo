/**
 * @description GraphQL resolver for the agents chat namespace. Runs one turn by routing to the in-process {@link McpDeveloperMcpSurface} tools (OpenThrottle / MCP developer).
 */

import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import {
  McpDeveloperMcpSurface,
  withMcpDeveloperAuthTokenAsync,
} from '@openthrottle/nestjs-openthrottle-mcp';
import { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import {
  isAgentsChatMutationRoutedTool,
  readAgentsChatMutationsEnabledFromConfig,
} from './agents-chat-mutation-policy';
import {
  PERSISTED_CONVERSATION_AUTH_ERROR,
  persistSuccessfulAgentsChatTurn,
  resolveHumanUserForPersist,
  resolvePersistedConversation,
} from './agents-chat-persistence';
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

const buildFailedAgentsChatTurn = (input: {
  readonly conversationId: string | null;
  readonly errorMessage: string;
  readonly readOnlyAgentsChat: boolean;
}): AgentsChatTurnResult => {
  const failed = new AgentsChatTurnResult();

  failed.assistantText = null;
  failed.conversationId = input.conversationId;
  failed.errorMessage = input.errorMessage;
  failed.mcpTool = null;
  failed.readOnlyAgentsChat = input.readOnlyAgentsChat;
  failed.routingConfidence = null;
  failed.routingReason = null;
  failed.structuredPayloadJson = null;
  failed.toolMetadataJson = null;

  return failed;
};

// @authz-stance: authenticated-only (Path A — see docs/openthrottle/resolver-authorization-model-adr.md)
@Resolver()
export class AgentsResolver {
  constructor(
    private readonly agentConversationsService: AgentConversationsService,
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
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => AgentsRunChatTurnInput })
    input: AgentsRunChatTurnInput,
  ): Promise<AgentsChatTurnResult> {
    const message = input.message?.trim() ?? '';
    const readOnlyAgentsChat = !readAgentsChatMutationsEnabledFromConfig(
      this.config,
    );
    const shouldPersist = input.persist === true;
    const conversationEcho = input.conversationId ?? null;

    if (!message) {
      return buildFailedAgentsChatTurn({
        conversationId: conversationEcho,
        errorMessage: 'Message is required.',
        readOnlyAgentsChat,
      });
    }

    if (shouldPersist && resolveHumanUserForPersist(principal) == null) {
      return buildFailedAgentsChatTurn({
        conversationId: conversationEcho,
        errorMessage: PERSISTED_CONVERSATION_AUTH_ERROR,
        readOnlyAgentsChat,
      });
    }

    let persistedConversationId: string | null = null;
    const humanUser = resolveHumanUserForPersist(principal);

    if (shouldPersist && humanUser != null) {
      const resolvedConversation = await resolvePersistedConversation(
        this.agentConversationsService,
        {
          conversationId: input.conversationId,
          message,
          userId: humanUser.sub,
        },
      );

      if (!resolvedConversation.ok) {
        return buildFailedAgentsChatTurn({
          conversationId: conversationEcho,
          errorMessage: resolvedConversation.errorMessage,
          readOnlyAgentsChat,
        });
      }

      persistedConversationId = resolvedConversation.conversationId;
    }

    const activeConversationId = shouldPersist
      ? persistedConversationId
      : conversationEcho;

    const authorization = context.req?.headers?.authorization;
    const bearer = parseBearerJwt(authorization);

    try {
      return await withMcpDeveloperAuthTokenAsync(bearer, async () => {
        let route = this.mcpRouter.route({
          conversationId: activeConversationId ?? undefined,
          message,
        });
        let llmRouterUsed = false;

        if (this.mcpRouterLlm.shouldAttemptLlmRefinement(route)) {
          const refined = await this.mcpRouterLlm.refineRoute({ message });

          if (refined != null) {
            llmRouterUsed = true;
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
          blocked.conversationId = activeConversationId;
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
          conversationId: activeConversationId ?? undefined,
        };

        const turn = agentsChatTurnFromMcpToolResult(mcpResult, {
          arguments: argumentsWithConversation,
          confidence: route.confidence,
          conversationId: activeConversationId,
          readOnlyAgentsChat,
          routeReason: route.reason,
          tool: route.tool,
        });

        if (
          shouldPersist &&
          persistedConversationId != null &&
          humanUser != null &&
          turn.errorMessage == null
        ) {
          await persistSuccessfulAgentsChatTurn({
            agentConversationsService: this.agentConversationsService,
            conversationId: persistedConversationId,
            llmRouterUsed,
            message,
            route,
            routerModelSnapshot: llmRouterUsed
              ? this.mcpRouterLlm.getActiveRouterModelSnapshot()
              : null,
            turn,
            userId: humanUser.sub,
          });

          turn.conversationId = persistedConversationId;
        }

        return turn;
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const failed = buildFailedAgentsChatTurn({
        conversationId: shouldPersist
          ? persistedConversationId
          : conversationEcho,
        errorMessage: msg,
        readOnlyAgentsChat,
      });

      if (msg.includes('Auth token required')) {
        failed.errorMessage = `OpenThrottle tools need a Bearer token on this request or OPENTHROTTLE_MCP_AUTH_TOKEN in the server environment.`;

        return failed;
      }

      return failed;
    }
  }
}
