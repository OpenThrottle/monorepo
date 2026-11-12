import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';

/**
 * @description Real-Redis probe of what BullMQ does with a cron fire that came due while no worker
 * was running (the server was down). Opt-in, because it needs a live Redis and ~25s of wall clock:
 *
 *   OT_BULLMQ_REDIS_INTEGRATION=true pnpm nx run openthrottle-server:test \
 *     --testFile=src/queues/scheduled-agent-jobs/misfire/misfire.utils.integration.test.ts
 *
 * It mirrors production: the scheduler is registered with `upsertJobScheduler` (pattern + tz, the
 * shape `ScheduledAgentJobSchedulerService.upsertScheduler` writes) and the boot reconcile is a
 * second `upsertJobScheduler` for the same id. Each scenario uses its own key prefix on Redis db 15
 * and obliterates it afterwards.
 */

const ENABLED = process.env.OT_BULLMQ_REDIS_INTEGRATION === 'true';
const CONNECTION = {
  db: 15,
  host: process.env.REDIS_HOST ?? 'localhost',
  maxRetriesPerRequest: null,
  port: Number(process.env.REDIS_PORT ?? 6011),
};
const DOWN_MS = 12_000;
const OBSERVE_MS = 8_000;
const PATTERN = '*/5 * * * * *';
const SCHEDULER_ID = 'scheduled-job:misfire-probe';
const LATE_THRESHOLD_MS = 1_000;

const BOOT_ORDER = {
  noReupsert: 'noReupsert',
  reupsertChangedData: 'reupsertChangedData',
  reupsertThenWorker: 'reupsertThenWorker',
  workerThenReupsert: 'workerThenReupsert',
} as const;

type BootOrder = (typeof BOOT_ORDER)[keyof typeof BOOT_ORDER];

interface ProbeData {
  readonly version: number;
}

interface ProcessedFire {
  readonly data: ProbeData;
  readonly lateByMs: number;
  readonly slotMs: number;
}

interface ScenarioResult {
  readonly delayedIdsWhileDown: readonly string[];
  readonly lateFires: readonly ProcessedFire[];
  readonly missedSlots: number;
  readonly processed: readonly ProcessedFire[];
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const slotOf = (jobId: string | undefined): number => {
  return Number((jobId ?? '').split(':').at(-1) ?? Number.NaN);
};

const runScenario = async (bootOrder: BootOrder): Promise<ScenarioResult> => {
  const prefix = `misfire-probe-${bootOrder}-${Date.now()}`;
  const queue = new Queue<ProbeData, void>('scheduled-agent-jobs', {
    connection: CONNECTION,
    prefix,
  });
  const processed: ProcessedFire[] = [];

  const upsert = async (version: number): Promise<void> => {
    await queue.upsertJobScheduler(
      SCHEDULER_ID,
      { pattern: PATTERN, tz: 'UTC' },
      {
        data: { version },
        name: 'scheduled-agent-job',
        opts: { attempts: 1, removeOnComplete: 100, removeOnFail: 100 },
      },
    );
  };

  const startWorker = (): Worker<ProbeData, void> => {
    return new Worker<ProbeData, void>(
      'scheduled-agent-jobs',
      async (job: Job<ProbeData, void>) => {
        const slotMs = slotOf(job.id);
        processed.push({
          data: job.data,
          lateByMs: Date.now() - slotMs,
          slotMs,
        });
      },
      { connection: CONNECTION, prefix },
    );
  };

  await upsert(1);
  const downAt = Date.now();
  // The "server down" window: no worker exists, so every slot in here comes due unprocessed.
  await sleep(DOWN_MS);
  const bootAt = Date.now();
  const delayedIdsWhileDown = (await queue.getDelayed()).map(
    (job) => job.id ?? '',
  );

  const worker = await bootServer(bootOrder, upsert, startWorker);
  await sleep(OBSERVE_MS);
  await worker.close();
  await queue.obliterate({ force: true });
  await queue.close();

  const missedSlots = Math.floor(bootAt / 5_000) - Math.floor(downAt / 5_000);
  return {
    delayedIdsWhileDown,
    lateFires: processed.filter((fire) => fire.lateByMs > LATE_THRESHOLD_MS),
    missedSlots,
    processed,
  };
};

const bootServer = async (
  bootOrder: BootOrder,
  upsert: (version: number) => Promise<void>,
  startWorker: () => Worker<ProbeData, void>,
): Promise<Worker<ProbeData, void>> => {
  switch (bootOrder) {
    case BOOT_ORDER.noReupsert:
      return startWorker();
    case BOOT_ORDER.reupsertThenWorker:
      await upsert(1);
      return startWorker();
    case BOOT_ORDER.reupsertChangedData:
      await upsert(2);
      return startWorker();
    case BOOT_ORDER.workerThenReupsert: {
      // Production order: BullRegistrar.onModuleInit starts the worker while the reconcile's
      // onModuleInit is still awaiting its DB read, so the worker can win the race.
      const worker = startWorker();
      await sleep(50);
      await upsert(1);
      return worker;
    }
  }
};

describe.runIf(ENABLED)('BullMQ cron fire missed while no worker ran', () => {
  const results = new Map<BootOrder, ScenarioResult>();

  beforeAll(async () => {
    const entries = await Promise.all(
      Object.values(BOOT_ORDER).map(
        async (bootOrder) => [bootOrder, await runScenario(bootOrder)] as const,
      ),
    );
    entries.forEach(([bootOrder, result]) => {
      results.set(bootOrder, result);
      console.info(bootOrder, JSON.stringify(result));
    });
  }, 60_000);

  it('keeps exactly one delayed job for the scheduler however many slots pass', () => {
    const result = results.get(BOOT_ORDER.noReupsert);
    expect(result?.missedSlots).toBeGreaterThanOrEqual(2);
    expect(result?.delayedIdsWhileDown).toHaveLength(1);
  });

  it('runs one late catch-up and drops the rest when nothing re-upserts', () => {
    const result = results.get(BOOT_ORDER.noReupsert);
    expect(result?.lateFires).toHaveLength(1);
    expect(result?.lateFires[0]?.data).toEqual({ version: 1 });
  });

  it('drops every missed fire, silently, when the boot reconcile re-upserts first', () => {
    expect(results.get(BOOT_ORDER.reupsertThenWorker)?.lateFires).toHaveLength(
      0,
    );
    expect(results.get(BOOT_ORDER.reupsertChangedData)?.lateFires).toHaveLength(
      0,
    );
  });

  it('still fires on schedule after the reconcile re-upserts', () => {
    expect(
      results.get(BOOT_ORDER.reupsertThenWorker)?.processed.length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('runs at most one late catch-up when the worker races the reconcile', () => {
    expect(
      results.get(BOOT_ORDER.workerThenReupsert)?.lateFires.length,
    ).toBeLessThanOrEqual(1);
  });
});
