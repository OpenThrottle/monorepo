/**
 * @description GraphQL resolver for agent-CLI discovery. discoverAgentClis returns
 * the available allowlisted agent backends from the cached AgentDiscoveryService
 * (60s TTL). Only AVAILABLE agents are surfaced as selectable options.
 */

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { DiscoverAgentClisResult } from './agent-discovery.object';
import { AgentDiscoveryService } from './agent-discovery.service';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class AgentDiscoveryResolver {
  constructor(private readonly agentDiscovery: AgentDiscoveryService) {}

  @Query(() => DiscoverAgentClisResult, {
    description: `Discover allowlisted agentic CLI backends (e.g. cursor-agent) detected on the server host. Returns a cached snapshot (60s TTL); does not probe per request.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoverAgentClis(): Promise<DiscoverAgentClisResult> {
    const result = await this.agentDiscovery.discover();
    const agents = result.agents
      .filter((agent) => agent.available)
      .map((agent) => ({
        backend: agent.backend,
        chatCapable: agent.chatCapable,
        label: agent.label,
        models: [...agent.models],
        supportsCustomBaseUrl: agent.supportsCustomBaseUrl,
        version: agent.version,
      }));

    return {
      agents,
      scannedAt: result.scannedAt,
      totalCount: agents.length,
    };
  }
}
