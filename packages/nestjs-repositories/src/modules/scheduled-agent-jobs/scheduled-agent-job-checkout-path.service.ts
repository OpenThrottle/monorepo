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
import { RepositoryCheckoutsService } from '../repositories/repository-checkouts.service';

/** A checkout to resolve, scoped to the schedule's owner. */
export interface ResolveScheduledAgentJobCheckoutPathInput {
  readonly checkoutId: string;
  /**
   * Owner of the schedule referencing the checkout. Null for system-seeded rows, which have no
   * owning user to scope by; the referencing row is then treated as authoritative (the documented
   * use of `findById`).
   */
  readonly ownerUserId: string | null;
}

/**
 * Either the resolved directory, or `not-found` when the checkout does not exist or is not the
 * owner's. Deliberately a result union rather than a throw: the write path turns it into a
 * BadRequestException, while the worker degrades to the payload fallback.
 */
export type ResolveScheduledAgentJobCheckoutPathResult =
  { readonly error: 'not-found' } | { readonly path: string };

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
    const checkout =
      input.ownerUserId === null
        ? await this.checkouts.findById(input.checkoutId)
        : await this.checkouts.findByIdForUser(
            input.checkoutId,
            input.ownerUserId,
          );

    if (checkout === null) return { error: 'not-found' };

    return { path: toContainerPath(checkout.filesystemPath) };
  }
}
