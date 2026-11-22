/**
 * @description The single place a checkout reference is translated into the directory an agent
 * CLI runs in. Every launcher goes through it — scheduled agent jobs (write path and worker), plan
 * enqueue, and chat turns — so the ownership check, the repositoryId → single-checkout rule and
 * the host-vs-container path decision cannot drift apart.
 */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories-server';
import { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';

import type {
  ResolveCheckoutPathInput,
  ResolveCheckoutPathResult,
  ResolveRunWorkspaceInput,
  ResolveRunWorkspaceResult,
} from './checkout-path.types.ts';

@Injectable()
export class CheckoutPathService {
  constructor(
    private readonly checkouts: RepositoryCheckoutsRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.debug('🧩 checkout-path 🧩');
  }

  /**
   * @description Resolve a checkout id to the directory an agent CLI should be spawned in:
   * ownership-check the checkout, then translate its host-truthful `filesystemPath` to the
   * in-container mount via `toContainerPath` (identity on host-run flows, mount-aware under a
   * containerized server).
   */
  async resolve(
    input: ResolveCheckoutPathInput,
  ): Promise<ResolveCheckoutPathResult> {
    const { checkoutId, ownerUserId } = input;
    const checkout = await this.findCheckout(checkoutId, ownerUserId);

    if (checkout === null) return { error: 'not-found' };

    return { path: toContainerPath(checkout.filesystemPath) };
  }

  /**
   * @description Resolve a run's workspace reference, in the locked run_config precedence order:
   * an explicit `checkoutId`, else a portable `repositoryId` (resolved to the actor's single
   * checkout of it). Both are scoped to `actorUserId`, and an unauthenticated actor may use
   * neither. Returns both path forms, because job payloads store the host form while an
   * in-process spawn needs the process form. `no-reference` leaves the raw-path escape hatch to
   * the caller.
   */
  async resolveRunWorkspace(
    input: ResolveRunWorkspaceInput,
  ): Promise<ResolveRunWorkspaceResult> {
    const { actorUserId } = input;
    const checkoutId = input.checkoutId?.trim() ?? '';
    const repositoryId = input.repositoryId?.trim() ?? '';

    if (checkoutId !== '') {
      if (!actorUserId) {
        return {
          kind: 'rejected',
          message: 'checkoutId can only be resolved for an authenticated user',
          reason: 'unauthenticated',
        };
      }
      const checkout = await this.checkouts.findByIdForUser(
        checkoutId,
        actorUserId,
      );
      if (!checkout) {
        return {
          kind: 'rejected',
          message: `Checkout not found for this user: ${checkoutId}`,
          reason: 'checkout-not-found',
        };
      }
      return this.toResolved(checkout, checkout.repositoryId);
    }

    if (repositoryId !== '') {
      if (!actorUserId) {
        return {
          kind: 'rejected',
          message: `repositoryId can only be resolved for an authenticated user`,
          reason: 'unauthenticated',
        };
      }
      const checkouts = await this.checkouts.findByRepositoryIdForUser(
        repositoryId,
        actorUserId,
      );
      const [only] = checkouts;
      if (!only) {
        return {
          kind: 'rejected',
          message: `No checkout for repository ${repositoryId}; add a folder for it first`,
          reason: 'no-checkout',
        };
      }
      if (checkouts.length > 1) {
        return {
          kind: 'rejected',
          message: `Repository ${repositoryId} has multiple checkouts; specify a checkoutId`,
          reason: 'multiple-checkouts',
        };
      }
      return this.toResolved(only, repositoryId);
    }

    return { kind: 'no-reference' };
  }

  private findCheckout(checkoutId: string, ownerUserId: string | null) {
    if (ownerUserId === null) {
      return this.checkouts.findCheckoutById(checkoutId);
    }
    return this.checkouts.findByIdForUser(checkoutId, ownerUserId);
  }

  private toResolved(
    checkout: RepositoryCheckout,
    repositoryId: string,
  ): ResolveRunWorkspaceResult {
    return {
      checkoutId: checkout.id,
      hostPath: checkout.filesystemPath,
      kind: 'resolved',
      processPath: toContainerPath(checkout.filesystemPath),
      repositoryId,
    };
  }
}
