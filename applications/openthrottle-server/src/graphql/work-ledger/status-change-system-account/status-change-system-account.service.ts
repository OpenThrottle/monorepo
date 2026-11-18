/**
 * @description Resolves the seeded 'status-change-system' service account id (databases/openthrottle/migrations/127)
 * for background writers that call {@link WorkLedgerCaptureService.recordStatusChange} with no
 * request principal — the stale sweeper, `plans.processor`, and any other BullMQ worker that
 * transitions plan/task status on its own initiative rather than on behalf of a request.
 *
 * The lookup-by-name is memoised per process: every background writer needing an actorSub would
 * otherwise repeat the same `ServiceAccountsRepository.findByName` round trip, one call site at a
 * time, the same pattern `WorkLedgerHarvestProcessor.resolveActorServiceAccountId` already has —
 * this centralizes it so nobody hand-types the name again.
 */
import { Injectable } from '@nestjs/common';
import { ServiceAccountsRepository } from '@openthrottle/nestjs-repositories-server';

import { STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME } from './status-change-system-account.constants.ts';

@Injectable()
export class StatusChangeSystemAccountService {
  private resolved: Promise<string | null> | null = null;

  constructor(
    private readonly serviceAccountsRepository: ServiceAccountsRepository,
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
    const account = await this.serviceAccountsRepository.findByName(
      STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
    );

    return account?.id ?? null;
  }
}
