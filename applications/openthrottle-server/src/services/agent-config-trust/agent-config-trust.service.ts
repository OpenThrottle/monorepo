/**
 * @description Resolves whether an agent run may load a directory's own repo-local agent config
 * (`.claude/settings.json` hooks, `.mcp.json` servers), for launchers that spawn in a checkout
 * directly rather than through a plan run. See docs/monorepo/agent-config-trust.md.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories-server';
import { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import type { AgentConfigTrust } from '@openthrottle/openthrottle-agentic-utils';
import {
  AGENT_CONFIG_POSTURE,
  isOpenThrottleCheckout,
  resolveAgentConfigTrust,
  resolveForeignWorkspaceContext,
} from '@openthrottle/openthrottle-agentic-utils';
import type { DriverRepoAgentConfig } from '@openthrottle/openthrottle-drivers';

import type { ResolveAgentConfigTrustParams } from './agent-config-trust.types.ts';

@Injectable()
export class AgentConfigTrustService {
  constructor(
    private readonly logger: LoggerService,
    private readonly checkouts: RepositoryCheckoutsRepository,
  ) {}

  /**
   * @description Resolves a run's posture. The OpenThrottle checkout is always trusted; any other
   * directory needs its checkout row's explicit trust. Fails closed: no row, or a failed read,
   * leaves it isolated.
   */
  async resolve(
    params: ResolveAgentConfigTrustParams,
  ): Promise<AgentConfigTrust> {
    const { directory } = params;
    // The OpenThrottle checkout is trusted whatever its row says, so it needs no lookup at all.
    const isOpenThrottle = isOpenThrottleCheckout(
      resolveForeignWorkspaceContext(directory, process.env),
    );
    if (isOpenThrottle) {
      return resolveAgentConfigTrust({
        checkout: null,
        isOpenThrottleCheckout: true,
      });
    }

    try {
      const checkout = await this.findCheckout(params);

      return resolveAgentConfigTrust({
        checkout,
        isOpenThrottleCheckout: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not read checkout trust for ${directory}; treating it as untrusted: ${message}`,
        AgentConfigTrustService.name,
      );

      return resolveAgentConfigTrust({
        checkout: null,
        isOpenThrottleCheckout: false,
      });
    }
  }

  /**
   * @description Turns a posture into the driver's input. An isolated run gets no MCP servers: the
   * checkout's own are suppressed, and a headless run supplies none of OpenThrottle's.
   */
  toRepoAgentConfig(trust: AgentConfigTrust): DriverRepoAgentConfig {
    if (trust.posture === AGENT_CONFIG_POSTURE.TRUSTED) {
      return { kind: 'trusted' };
    }

    return { kind: 'isolated', mcpServers: {} };
  }

  private async findCheckout(
    params: ResolveAgentConfigTrustParams,
  ): Promise<RepositoryCheckout | null> {
    const { checkoutId, directory, loadOwnerUserId } = params;
    const ownerUserId = await loadOwnerUserId();
    if (checkoutId !== null) {
      if (ownerUserId === null) {
        return this.checkouts.findCheckoutById(checkoutId);
      }

      return this.checkouts.findByIdForUser(checkoutId, ownerUserId);
    }

    if (ownerUserId === null) {
      return null;
    }

    return this.checkouts.findByUserAndPath(ownerUserId, directory);
  }
}
