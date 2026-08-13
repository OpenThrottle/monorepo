/**
 * @description GraphQL resolver for agent-CLI discovery. discoverAgentClis returns
 * the available allowlisted agent backends from the cached AgentDiscoveryService
 * (60s TTL). Only AVAILABLE agents are surfaced as selectable options.
 */

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type AuthPrincipal } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { AgentCliPreferencesService } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { DiscoverAgentClisResult } from './agent-discovery.object';
import { AgentDiscoveryService } from './agent-discovery.service';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class AgentDiscoveryResolver {
  constructor(
    private readonly agentDiscovery: AgentDiscoveryService,
    private readonly preferences: AgentCliPreferencesService,
  ) {}

  @Query(() => DiscoverAgentClisResult, {
    description: `Discover allowlisted agentic CLI backends (e.g. cursor-agent) detected on the server host. Returns a cached snapshot (60s TTL); does not probe per request. Each agent's \`enabled\` reflects the current user's per-user preference, overlaid per request on top of the shared discovery cache.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoverAgentClis(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<DiscoverAgentClisResult> {
    const result = await this.agentDiscovery.discover();

    // Per-user enablement is overlaid AFTER the shared 60s discovery cache: the
    // cache holds only host-level availability; `enabled` is resolved per request
    // from the caller's disabled-backend set (empty → all enabled).
    const disabled =
      principal != null
        ? await this.preferences.getDisabledBackends(principal.sub)
        : new Set<string>();

    const agents = result.agents
      .filter((agent) => agent.available)
      .map((agent) => ({
        backend: agent.backend,
        chatCapable: agent.chatCapable,
        enabled: !disabled.has(agent.backend),
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
