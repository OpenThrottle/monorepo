/**
 * @description GraphQL ObjectType for the aggregate view of scheduled-agent-job runs: how much is in
 * flight right now, plus terminal outcomes inside a rolling window. Counts only — the runs themselves
 * come from `scheduledAgentJobRunsInFlight` / `scheduledAgentJobRuns`.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Aggregate run counts across all scheduled agent jobs: live in-flight totals plus terminal outcomes since a window boundary.`,
})
export class ScheduledAgentJobRunStatsObject {
  @Field(() => Int, {
    description: `Runs cancelled inside the window.`,
  })
  cancelledCount!: number;

  @Field(() => Int, {
    description: `Runs that failed inside the window — non-zero exit, timeout, or spawn failure. Does NOT include no_op.`,
  })
  failedCount!: number;

  @Field(() => Int, {
    description: `Runs not yet terminal right now — queuedCount + runningCount. Not windowed.`,
  })
  inFlightCount!: number;

  @Field(() => Int, {
    description: `Runs that exited cleanly but reported they did not do the work, inside the window. Terminal and NOT a failure.`,
  })
  noOpCount!: number;

  @Field(() => Int, {
    description: `Runs enqueued but not yet claimed by a processor right now. Not windowed.`,
  })
  queuedCount!: number;

  @Field(() => Int, {
    description: `Runs currently executing right now. Not windowed.`,
  })
  runningCount!: number;

  @Field(() => Date, {
    description: `Inclusive lower bound of the window the terminal counts cover; defaults to 24h ago.`,
  })
  since!: Date;

  @Field(() => Int, {
    description: `Runs that completed successfully inside the window.`,
  })
  succeededCount!: number;

  @Field(() => Int, {
    description: `Every run created inside the window, whatever its status — the "ran today" total.`,
  })
  windowTotalCount!: number;
}
