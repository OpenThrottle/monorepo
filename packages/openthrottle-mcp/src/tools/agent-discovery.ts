/**
 * @description Agent-CLI discovery tool handler + schema: discover_agent_clis. Lists the agentic
 * CLIs (claude, codex, cursor, gemini, grok, opencode, …) detected as available on the server host, with
 * their versions and the models each can run, via the discoverAgentClis GraphQL query only —
 * GraphQL-only boundary, no core import, no Nest bootstrap in this process.
 *
 * Caveat: availability reflects the *server's* host, not this MCP process's host — a CLI installed
 * where the server runs may not be present verbatim where this MCP runs.
 */

import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import { DiscoverAgentClisDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.ts';
import { runTool } from '../utils/tool-result.ts';

type AgentCli = {
  backend: string;
  chatCapable: boolean;
  label: string;
  models: string[];
  version: string | null;
};

type DiscoverAgentClisStructured = {
  agents: AgentCli[];
  scannedAt: string;
  totalCount: number;
};

export const discoverAgentClisToolParameters = z.object({});

export const discoverAgentClisToolDescription = `Discover the agentic CLIs (claude, codex, cursor, gemini, grok, opencode, …) detected as available on the server host, with each CLI's --version and the models it can run, via the discoverAgentClis GraphQL query. No arguments. Returns a cached snapshot (60s TTL). Each agent reports chatCapable — whether it has a wired streaming chat backend (false for plan-run-only drivers). Caveat: availability reflects the server's host, not this MCP process's host.`;

export async function discoverAgentClisToolHandler(
  _args: z.infer<typeof discoverAgentClisToolParameters>,
): Promise<GenericResult<DiscoverAgentClisStructured>> {
  return runTool<DiscoverAgentClisStructured>(
    'discover_agent_clis',
    async () => {
      const result = await executeGraphql(DiscoverAgentClisDocument, {});
      const discovered = result?.discoverAgentClis;
      if (!discovered) {
        return null;
      }

      const agents: AgentCli[] = discovered.agents.map((agent) => ({
        backend: agent.backend,
        chatCapable: agent.chatCapable,
        label: agent.label,
        models: [...agent.models],
        version: agent.version ?? null,
      }));

      const text =
        agents.length === 0
          ? `No agent CLIs found (scanned at ${discovered.scannedAt}).`
          : [
              `Discovered ${discovered.totalCount} agent CLI(s) at ${discovered.scannedAt}:`,
              ...agents.map(
                (agent) =>
                  `  ${agent.label} [${agent.backend}]${agent.chatCapable ? '' : ' (plan-run only)'} ${
                    agent.version ?? '(version unknown)'
                  } — ${agent.models.length} model(s): ${agent.models.join(', ') || '(none)'}`,
              ),
            ].join('\n');

      return {
        structuredContent: {
          agents,
          scannedAt: discovered.scannedAt,
          totalCount: discovered.totalCount,
        },
        text,
      };
    },
  );
}
