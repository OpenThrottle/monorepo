import { Injectable } from '@nestjs/common';
import { pruneKeyedRunOutputDirectory } from '@openthrottle/nestjs-logging';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getBullMqRunOutputRetentionConfig,
  type BullMqRunOutputRetentionConfig,
} from '../config/bullmq-run-output-retention';

/**
 * @description Throttled post-job disk retention for keyed BullMQ run transcripts (see `OT_BULLMQ_RUN_OUTPUT_*` env vars).
 */
@Injectable()
export class BullMqRunOutputRetentionService {
  private lastPruneAtMs = 0;

  constructor(private readonly logger: LoggerService) {}

  /**
   * @description Fire-and-forget prune when retention env is enabled and the min-interval gate passes.
   */
  maybePruneAfterJobClose(): void {
    const cfg = getBullMqRunOutputRetentionConfig();

    if (cfg === undefined) {
      return;
    }

    const now = Date.now();

    if (now - this.lastPruneAtMs < cfg.minIntervalMs) {
      return;
    }

    this.lastPruneAtMs = now;
    void this.runPrune(cfg);
  }

  private async runPrune(cfg: BullMqRunOutputRetentionConfig): Promise<void> {
    try {
      const result = await pruneKeyedRunOutputDirectory({
        baseDirectory: cfg.baseDirectory,
        maxAgeMs: cfg.maxAgeMs,
        maxTotalBytes: cfg.maxTotalBytes,
      });

      if (result.deletedFileCount > 0 || result.skippedUnlinkErrors > 0) {
        this.logger.info(
          `BullMQ run output retention: deletedFiles=${result.deletedFileCount} freedBytes=${result.freedBytes} remainingBytes=${result.remainingTotalBytes} unlinkErrors=${result.skippedUnlinkErrors}`,
          BullMqRunOutputRetentionService.name,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `BullMQ run output retention prune failed: ${message}`,
        BullMqRunOutputRetentionService.name,
      );
    }
  }
}
