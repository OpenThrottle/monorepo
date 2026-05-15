/**
 * @description Maps MCP developer tool outcomes into {@link AgentsChatTurnResult} for the agents GraphQL surface.
 */

import { AgentsChatTurnResult } from './agents.object';

interface McpTextResult {
  readonly content: readonly { readonly text: string }[];
  readonly isError?: boolean;
}

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

const SEMANTIC_SEARCH_TOOL = 'semantic_search';

/**
 * @description Builds a {@link AgentsChatTurnResult} from a semantic_search MCP tool result (content + optional structured payload).
 */
export const agentsChatTurnFromSemanticSearchMcp = (
  mcpResult: McpTextResult & { readonly structuredContent?: unknown },
  metadata: {
    readonly arguments: {
      readonly conversationId?: string | null;
      readonly limit?: number;
      readonly query: string;
    };
  },
): AgentsChatTurnResult => {
  const out = new AgentsChatTurnResult();

  if (mcpResult.isError === true) {
    out.assistantText = null;
    out.errorMessage =
      mcpResult.content[0]?.text ?? `${SEMANTIC_SEARCH_TOOL} failed.`;
    out.toolMetadataJson = JSON.stringify({
      arguments: metadata.arguments,
      isError: true,
      tool: SEMANTIC_SEARCH_TOOL,
    });

    return out;
  }

  const assistantText = mcpResult.content[0]?.text ?? '';

  out.assistantText = assistantText;
  out.errorMessage = null;
  out.toolMetadataJson = JSON.stringify({
    arguments: metadata.arguments,
    structuredContent: mcpResult.structuredContent,
    tool: SEMANTIC_SEARCH_TOOL,
  });

  return out;
};
