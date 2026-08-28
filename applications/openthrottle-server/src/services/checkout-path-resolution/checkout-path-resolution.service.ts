/**
 * @description Answers one question: which of THIS user's registered checkouts contains this path?
 *
 * It exists so a client-supplied path (the MCP caller's cwd) can be turned into a workspace without
 * ever being trusted. The path is a hint; the answer is always one of the caller's own registered
 * checkouts, mirroring how `code-search.resolver.ts` resolves `repositoryId → filesystemPath`
 * user-scoped and never accepts a filesystem path from the client.
 *
 * Total by construction: a relative path, an unregistered path, a user with no checkouts and a
 * failing database read all return `null`. Nothing here throws, because every caller treats a
 * miss as "fall back to the existing default" rather than as an error.
 */

import { isAbsolute } from 'node:path';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories';
import { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';
import { isPathWithin, pathDepth } from '../paths/path-containment';
import { realPath } from '../paths/real-path';

/** Matches the ceiling `workspaceRepositories` and worktree discovery already use. */
const CHECKOUT_LIST_LIMIT = 200;

export interface ResolveCheckoutForPathInput {
  readonly path: string;
  readonly userId: string;
}

export interface ResolvedCheckoutForPath {
  readonly checkoutId: string;
  readonly repositoryId: string;
}

@Injectable()
export class CheckoutPathResolutionService {
  private readonly name = 'checkout-path-resolution';

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description The registered checkout containing `path`, or `null`. When a registered worktree is
   * nested inside a registered primary checkout, the DEEPEST match wins — that worktree is the
   * workspace the caller is actually in.
   */
  async resolveCheckoutForPath({
    path,
    userId,
  }: ResolveCheckoutForPathInput): Promise<ResolvedCheckoutForPath | null> {
    const trimmed = path.trim();
    if (trimmed === '' || !isAbsolute(trimmed)) return null;

    const checkouts = await this.listCheckouts(userId);
    if (checkouts.length === 0) return null;

    const target = realPath(trimmed);

    let best: RepositoryCheckout | null = null;
    let bestDepth = -1;

    for (const checkout of checkouts) {
      const filesystemPath = checkout.filesystemPath?.trim() ?? '';
      if (filesystemPath === '' || !isAbsolute(filesystemPath)) continue;

      const candidate = realPath(filesystemPath);
      if (!isPathWithin(candidate, target)) continue;

      const depth = pathDepth(candidate);
      if (depth <= bestDepth) continue;

      best = checkout;
      bestDepth = depth;
    }

    if (best === null) return null;

    return { checkoutId: best.id, repositoryId: best.repositoryId };
  }

  /** A database failure is a miss, not an error — callers degrade to their existing default. */
  private async listCheckouts(userId: string): Promise<RepositoryCheckout[]> {
    try {
      return await this.checkoutsService.listByUserId(userId, {
        limit: CHECKOUT_LIST_LIMIT,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.name}: could not list checkouts for ${userId}: ${message}`,
      );
      return [];
    }
  }
}
