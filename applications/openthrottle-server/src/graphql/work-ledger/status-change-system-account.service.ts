/**
 * @description Resolves the seeded 'status-change-system' service account id (databases/migrations/127)
 * for background writers that call {@link WorkLedgerCaptureService.recordStatusChange} with no
 * request principal — the stale sweeper, `plans.processor`, and any other BullMQ worker that
 * transitions plan/task status on its own initiative rather than on behalf of a request.
 *
 * The lookup-by-name is memoised per process: every background writer needing an actorSub would
 * otherwise repeat the same `ServiceAccountsService.findByName` round trip, one call site at a
 * time, the same pattern `WorkLedgerHarvestProcessor.resolveActorServiceAccountId` already has —
 * this centralizes it so nobody hand-types the name again.
 */

import { Injectable } from '@nestjs/common';
import { ServiceAccountsService } from '@openthrottle/nestjs-repositories';

/** Name of the seeded service account background status-change writers act as (migration 127). */
export const STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME = 'status-change-system';

@Injectable()
export class StatusChangeSystemAccountService {
  private resolved: Promise<string | null> | null = null;

  constructor(
    private readonly serviceAccountsService: ServiceAccountsService,
  ) {}

  /**
   * @description The seeded account's id, looked up by name once per process and cached
   * thereafter. Null when the migration has not run (e.g. a fresh/unmigrated database) —
   * callers must treat that as "cannot attribute this write" rather than retry it.
   */
  async resolveId(): Promise<string | null> {
    this.resolved ??= this.lookup();

    const id = await this.resolved;

    // A null is not cached: it means the seed migration had not run when this was first
    // asked, and a process that booted ahead of its migrations would otherwise never
    // attribute a background write again for its whole lifetime.
    if (id == null) this.resolved = null;

    return id;
  }

  private async lookup(): Promise<string | null> {
    const account = await this.serviceAccountsService.findByName(
      STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
    );

    return account?.id ?? null;
  }
}
