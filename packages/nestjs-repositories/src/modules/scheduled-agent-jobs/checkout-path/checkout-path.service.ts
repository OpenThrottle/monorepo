/**
 * @description The single place a scheduled job's `repositoryCheckoutId` is translated into a
 * spawnable directory. Both the write path (GraphQL create/update validation) and the worker
 * (per-run re-resolution) go through this, so ownership checking and container-path translation
 * cannot drift apart. The streaming chat resolver (conversation-stream.resolver.ts) is the
 * reference implementation of the same two steps.
 */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';

import { RepositoryCheckoutsService } from '../../repositories/repository-checkouts/repository-checkouts.service.ts';
import type {
  ResolveScheduledAgentJobCheckoutPathInput,
  ResolveScheduledAgentJobCheckoutPathResult,
} from './checkout-path.types.ts';

@Injectable()
export class ScheduledAgentJobCheckoutPathService {
  constructor(
    private readonly checkouts: RepositoryCheckoutsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.debug('🧩 scheduled-agent-job-checkout-path 🧩');
  }

  /**
   * @description Resolve a checkout id to the directory an agent CLI should be spawned in:
   * ownership-check the checkout, then translate its host-truthful `filesystemPath` to the
   * in-container mount via `toContainerPath` (identity on host-run flows, mount-aware under a
   * containerized server).
   */
  async resolve(
    input: ResolveScheduledAgentJobCheckoutPathInput,
  ): Promise<ResolveScheduledAgentJobCheckoutPathResult> {
    const { checkoutId, ownerUserId } = input;
    const checkout = await this.findCheckout(checkoutId, ownerUserId);

    if (checkout === null) return { error: 'not-found' };

    return { path: toContainerPath(checkout.filesystemPath) };
  }

  private findCheckout(checkoutId: string, ownerUserId: string | null) {
    if (ownerUserId === null) {
      return this.checkouts.findById(checkoutId);
    }
    return this.checkouts.findByIdForUser(checkoutId, ownerUserId);
  }
}
