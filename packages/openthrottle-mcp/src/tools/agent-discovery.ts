/**
 * @description Agent-CLI discovery tool handler + schema: discover_agent_clis. Lists the agentic
 * CLIs (claude, codex, cursor, grok, opencode, …) detected as available on the server host, with
 * their versions and the models each can run, via the discoverAgentClis GraphQL query only —
 * GraphQL-only boundary, no core import, no Nest bootstrap in this process.
 *
 * Caveat: availability reflects the *server's* host, not this MCP process's host — a CLI installed
 * where the server runs may not be present verbatim where this MCP runs.
 */

import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type { DiscoverAgentClisQuery } from '../__generated__/graphql.js';
import { DiscoverAgentClisDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.ts';
import { runTool } from '../utils/tool-result.ts';

type AgentCliAuth = {
  accountEmail: string | null;
  activeCredential: string;
  apiKeyOverridesSubscription: boolean;
  authMethod: string | null;
  loggedIn: boolean;
  organizationName: string | null;
  subscriptionType: string | null;
  warning: string | null;
};

type AgentCliAuthState = {
  detail: string | null;
  status: string;
};

type AgentCliCapabilities = {
  approvals: boolean;
  editApprovals: boolean;
  imageInput: boolean;
  mcpInjection: boolean;
  replaysFullHistory: boolean;
  resume: boolean;
  steering: boolean;
};

type AgentCli = {
  auth: AgentCliAuth | null;
  authState: AgentCliAuthState;
  backend: string;
  capabilities: AgentCliCapabilities;
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

type DiscoveredAgent =
  DiscoverAgentClisQuery['discoverAgentClis']['agents'][number];

function toAgentCliAuth(auth: DiscoveredAgent['auth']): AgentCliAuth | null {
  if (auth === null || auth === undefined) {
    return null;
  }

  return {
    accountEmail: auth.accountEmail ?? null,
    activeCredential: auth.activeCredential,
    apiKeyOverridesSubscription: auth.apiKeyOverridesSubscription,
    authMethod: auth.authMethod ?? null,
    loggedIn: auth.loggedIn,
    organizationName: auth.organizationName ?? null,
    subscriptionType: auth.subscriptionType ?? null,
    warning: auth.warning ?? null,
  };
}

function describeAuth(agent: AgentCli): string[] {
  const { auth } = agent;
  if (auth === null) {
    return [];
  }

  const account = auth.accountEmail ?? '(account unknown)';
  const plan = auth.subscriptionType ?? 'no plan reported';
  const lines = [
    `  ${agent.label} auth: ${account}, ${plan}, active credential: ${auth.activeCredential}`,
  ];
  if (auth.warning !== null) {
    lines.push(`  WARNING (${agent.label}): ${auth.warning}`);
  }
  return lines;
}

export const discoverAgentClisToolParameters = z.object({}).strict();

export const discoverAgentClisToolDescription = `Discover agentic CLIs (claude, codex, cursor, …) available on the server host: --version, models, and chatCapable (has a streaming chat backend). Cached 60s; no arguments. Each agent reports \`authState\` (authenticated | unauthenticated | unknown) and chat \`capabilities\` (resume, approvals, editApprovals, steering, imageInput, mcpInjection, replaysFullHistory); read capabilities instead of branching on backend names. claude's \`auth\` adds account, plan and active credential from \`claude auth status\`; relay \`auth.warning\` (ANTHROPIC_API_KEY overriding the subscription) to the user. No credential contents are read. Reflects the server's host, not this MCP process's.`;

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
        auth: toAgentCliAuth(agent.auth),
        authState: {
          detail: agent.authState.detail ?? null,
          status: agent.authState.status,
        },
        backend: agent.backend,
        capabilities: {
          approvals: agent.capabilities.approvals,
          editApprovals: agent.capabilities.editApprovals,
          imageInput: agent.capabilities.imageInput,
          mcpInjection: agent.capabilities.mcpInjection,
          replaysFullHistory: agent.capabilities.replaysFullHistory,
          resume: agent.capabilities.resume,
          steering: agent.capabilities.steering,
        },
        chatCapable: agent.chatCapable,
        label: agent.label,
        models: [...agent.models],
        version: agent.version ?? null,
      }));

      const emptyText = `No agent CLIs found (scanned at ${discovered.scannedAt}).`;
      const listText = [
        `Discovered ${discovered.totalCount} agent CLI(s) at ${discovered.scannedAt}:`,
        ...agents.map(
          (agent) =>
            `  ${agent.label} [${agent.backend}]${agent.chatCapable ? '' : ' (plan-run only)'} ${
              agent.version ?? '(version unknown)'
            } — ${agent.models.length} model(s): ${agent.models.join(', ') || '(none)'}`,
        ),
        ...agents.flatMap((agent) => describeAuth(agent)),
      ].join('\n');
      const text = agents.length === 0 ? emptyText : listText;

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
