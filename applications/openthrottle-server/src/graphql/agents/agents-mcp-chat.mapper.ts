/**
 * @description Maps MCP developer tool outcomes into {@link AgentsChatTurnResult} for the agents GraphQL surface.
 */

import { AgentsChatTurnResult } from './agents.object';

/**
 * @description MCP tool outcome from {@link McpDeveloperMcpSurface} handlers for agents chat mapping.
 */
export type AgentsMcpToolHandlerResult =
  | {
      readonly content: readonly { readonly text: string }[];
      readonly isError: true;
    }
  | {
      readonly content: readonly { readonly text: string }[];
      readonly structuredContent?: unknown;
    };

/**
 * @description Extracts raw JWT from `Authorization: Bearer <token>` when present.
 */
export const parseBearerJwt = (
  authorization: string | string[] | undefined,
): string | undefined => {
  if (authorization == null) {
    return undefined;
  }

  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  const s = typeof raw === 'string' ? raw.trim() : '';

  if (s === '') {
    return undefined;
  }

  const match = /^Bearer\s+(\S+)/i.exec(s);

  return match?.[1]?.trim();
};

interface AgentsChatTurnMcpMetadata {
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly confidence?: number;
  readonly conversationId?: string | null;
  readonly readOnlyAgentsChat: boolean;
  readonly routeReason?: string;
  readonly tool: string;
}

/**
 * @description Builds a {@link AgentsChatTurnResult} from any MCP tool result (content + optional structured payload).
 */
export const agentsChatTurnFromMcpToolResult = (
  mcpResult: AgentsMcpToolHandlerResult,
  metadata: AgentsChatTurnMcpMetadata,
): AgentsChatTurnResult => {
  const out = new AgentsChatTurnResult();
  const { tool } = metadata;

  out.conversationId = metadata.conversationId ?? null;
  out.readOnlyAgentsChat = metadata.readOnlyAgentsChat;
  out.routingConfidence =
    metadata.confidence === undefined ? null : metadata.confidence;
  out.routingReason = metadata.routeReason ?? null;

  if ('isError' in mcpResult && mcpResult.isError === true) {
    out.assistantText = null;
    out.errorMessage = mcpResult.content[0]?.text ?? `${tool} failed.`;
    out.mcpTool = tool;
    out.structuredPayloadJson = null;
    out.toolMetadataJson = JSON.stringify({
      arguments: metadata.arguments,
      confidence: metadata.confidence,
      isError: true,
      routeReason: metadata.routeReason,
      tool,
    });

    return out;
  }

  const assistantText = mcpResult.content[0]?.text ?? '';
  const structuredContent =
    'structuredContent' in mcpResult ? mcpResult.structuredContent : undefined;

  out.assistantText = assistantText;
  out.errorMessage = null;
  out.mcpTool = tool;
  out.structuredPayloadJson =
    structuredContent === undefined ? null : JSON.stringify(structuredContent);
  out.toolMetadataJson = JSON.stringify({
    arguments: metadata.arguments,
    confidence: metadata.confidence,
    routeReason: metadata.routeReason,
    structuredContent,
    tool,
  });

  return out;
};
