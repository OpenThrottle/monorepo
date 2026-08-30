/**
 * @description Hold one demo plan run open for the length of a take.
 *
 * Three episodes need a run that reads as live: 15-kill-runaway-run is entirely
 * about killing one, 12-watch-run-live needs a stream that is genuinely current,
 * and 11-ralph-one-task opens on a task in progress. The seed deliberately gives
 * them the opposite — every imported run is coerced to `COMPLETED`, because an
 * `IN_PROGRESS` run with no heartbeat is swept stale within two minutes, the
 * plan reconciles back to `PENDING`, and take 1 and take 7 disagree on the
 * status badge. That rule is right and this script does not weaken it.
 *
 * Instead it does what a real agent run does: it stamps a heartbeat.
 * `STALE_CUTOFF_MS` is 120s and the sweep runs every minute, so a heartbeat
 * every 15s keeps exactly one designated run alive and leaves every other run,
 * and the seeding rule itself, untouched. Nothing in the app changes, no
 * demo-only flag is threaded through the sweep, and nothing on camera is faked:
 * the run really is in progress and the toolbar really is reacting to it.
 *
 * Rejected alternatives, for the record. Exempting a hero run from the sweep
 * behind a demo flag is cheaper but changes app behaviour for a video, which is
 * the one thing this pipeline has consistently refused to do. A typeset surface
 * is wrong here because the subject IS the app's toolbar and its disabled state.
 *
 * On exit it settles the run back to `COMPLETED`, so a take leaves the workspace
 * in the state the seed rule describes rather than with a live run nobody owns.
 * If the flow itself killed the run — which is the whole of 15 — the loop sees a
 * terminal status, stops heartbeating and leaves the terminal status alone.
 *
 * Usage (the runner does this for you when a flow sets `liveRun`):
 *
 *   pnpm exec tsx src/scripts/demo-live-run.ts --run <uuid> [--task <uuid>]
 */

import { getOpenThrottleTypeOrmOptions } from '@openthrottle/nestjs-repositories';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { DataSource } from 'typeorm';

/**
 * Comfortably inside the server's 120s stale cutoff, and often enough that a
 * take which overruns by a minute is still safe. Cheap: one UPDATE by primary
 * key.
 */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/** The hero run from `../fixtures/demo-content.ts`. */
export const DEMO_LIVE_RUN_ID = 'd0d0d0d0-0000-4000-8000-00000000ff01';

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);

  return index === -1 ? undefined : process.argv[index + 1];
};

/**
 * Same guard as the seeder, and for the same reason: `POSTGRES_DB` is silently
 * ignored when the server's `.env` sets `POSTGRES_URL`, so the resolved
 * connection is the only thing worth checking. This script writes run and plan
 * status, which is not something to do to the dev database by accident.
 */
const assertDemoDatabase = (): string => {
  const name = new URL(getPostgresUrl()).pathname.replace(/^\//, '');

  if (!name.includes('demo')) {
    console.error(
      `demo-live-run: refusing to run against database '${name}' — the name must contain 'demo'.`,
    );
    process.exit(1);
  }

  return name;
};

const TERMINAL = ['COMPLETED', 'FAILED', 'CANCELED', 'STALE'];

/** @public Is this run still one the heartbeat should keep alive? */
export const isLive = (status: string | undefined): boolean =>
  status !== undefined && !TERMINAL.includes(status);

const main = async (): Promise<void> => {
  const database = assertDemoDatabase();
  const runId = argValue('run') ?? DEMO_LIVE_RUN_ID;
  const taskId = argValue('task');
  const dataSource = new DataSource(getOpenThrottleTypeOrmOptions());

  await dataSource.initialize();

  const stop = async (settle: boolean): Promise<void> => {
    if (settle) {
      // Back to the seeded rule. Status-guarded so a run the flow already killed
      // keeps the terminal status the video just showed.
      await dataSource.query(
        `UPDATE plan_runs SET status = 'COMPLETED', last_heartbeat_at = NULL
         WHERE id = $1 AND status NOT IN ('COMPLETED', 'FAILED', 'CANCELED', 'STALE')`,
        [runId],
      );
    }

    await dataSource.destroy();
  };

  try {
    const [run]: readonly { plan_id: string }[] = await dataSource.query(
      `SELECT plan_id FROM plan_runs WHERE id = $1`,
      [runId],
    );

    if (run === undefined) {
      console.error(
        `demo-live-run: no plan run '${runId}' in '${database}'. Seed first: sh src/scripts/seed-demo.sh --reset`,
      );
      await stop(false);
      process.exit(1);
    }

    await dataSource.query(
      `UPDATE plan_runs SET status = 'IN_PROGRESS', last_heartbeat_at = now() WHERE id = $1`,
      [runId],
    );
    await dataSource.query(
      `UPDATE plans SET status = 'IN_PROGRESS' WHERE id = $1`,
      [run.plan_id],
    );

    if (taskId !== undefined) {
      await dataSource.query(
        `UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = $1`,
        [taskId],
      );
    }

    console.log(
      `demo-live-run: holding run ${runId} open (heartbeat every ${String(HEARTBEAT_INTERVAL_MS / 1_000)}s). Ctrl-C to settle it back to COMPLETED.`,
    );

    let settleOnExit = true;

    const shutdown = (): void => {
      clearInterval(timer);
      void stop(settleOnExit).then(() => process.exit(0));
    };

    /**
     * A timer rather than an await-in-a-loop: the tick is genuinely periodic and
     * genuinely fire-and-forget, and expressing it as a loop meant the process
     * could only be stopped between beats of that loop. With an interval, SIGINT
     * clears it and settles immediately.
     */
    const tick = async (): Promise<void> => {
      const [current]: readonly { status: string }[] = await dataSource.query(
        `SELECT status FROM plan_runs WHERE id = $1`,
        [runId],
      );

      if (!isLive(current?.status)) {
        // The take killed it. That is the video working, not a failure — stop
        // heartbeating and leave the status the frame just showed.
        console.log(
          `demo-live-run: run ${runId} is ${current?.status ?? 'gone'}; the take ended it. Leaving it alone.`,
        );
        settleOnExit = false;
        clearInterval(timer);
        await stop(false);

        return;
      }

      await dataSource.query(
        `UPDATE plan_runs SET last_heartbeat_at = now() WHERE id = $1`,
        [runId],
      );
    };

    const timer = setInterval(() => {
      void tick().catch((error: unknown) => {
        console.error(error);
        shutdown();
      });
    }, HEARTBEAT_INTERVAL_MS);

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    await stop(true);
    throw error;
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
