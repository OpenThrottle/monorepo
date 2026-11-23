/**
 * @description The flow registry — one place that knows what can be recorded.
 *
 * Explicit imports, for the same reason `registry.ts` uses them: a filesystem
 * glob is not typecheckable, resolves at runtime rather than at build, and turns
 * "that flow does not exist" into a surprise at record time. `run.ts` resolves
 * `../episodes/<id>/flow.ts` and exits when it is absent, which is exactly the
 * discovery-by-failure this file removes.
 *
 * Twelve of the twenty-four episodes have no registered flow. That is not a bug to be
 * hidden — it is the state of the season, and `flows.test.ts` holds it to the
 * rule that an episode without a flow must say in `production.blockedOn` what
 * stops it. See `../../RECORDABILITY.md` for the per-beat evidence behind each
 * of those entries.
 */

import type { DemoFlow } from '../runner/types.ts';
import { flow as flow01WhatIsOpenthrottle } from './01-what-is-openthrottle/flow.ts';
import { flow as flow02OneCommandBoot } from './02-one-command-boot/flow.ts';
import { flow as flow03FirstPlan } from './03-first-plan/flow.ts';
import { flow as flow04MentalModel } from './04-mental-model/flow.ts';
import { flow as flow05ConnectOtMcp } from './05-connect-ot-mcp/flow.ts';
import { flow as flow07SemanticSearch } from './07-semantic-search/flow.ts';
import { flow as flow11PlanRunOneTask } from './11-plan-run-one-task/flow.ts';
import { flow as flow12WatchRunLive } from './12-watch-run-live/flow.ts';
import { flow as flow13PlanIdTraceability } from './13-plan-id-traceability/flow.ts';
import { flow as flow21DashboardTour } from './21-dashboard-tour/flow.ts';
import { flow as flow22SelfHostDockerCompose } from './22-self-host-docker-compose/flow.ts';
import { flow as flowL2SetupFromScratch } from './L2-setup-from-scratch/flow.ts';

/**
 * Every flow that exists, keyed by the episode id it records.
 */
export const FLOWS: Readonly<Record<string, DemoFlow>> = {
  [flow01WhatIsOpenthrottle.id]: flow01WhatIsOpenthrottle,
  [flow02OneCommandBoot.id]: flow02OneCommandBoot,
  [flow03FirstPlan.id]: flow03FirstPlan,
  [flow04MentalModel.id]: flow04MentalModel,
  [flow05ConnectOtMcp.id]: flow05ConnectOtMcp,
  [flow07SemanticSearch.id]: flow07SemanticSearch,
  [flow11PlanRunOneTask.id]: flow11PlanRunOneTask,
  [flow12WatchRunLive.id]: flow12WatchRunLive,
  [flow13PlanIdTraceability.id]: flow13PlanIdTraceability,
  [flow21DashboardTour.id]: flow21DashboardTour,
  [flow22SelfHostDockerCompose.id]: flow22SelfHostDockerCompose,
  [flowL2SetupFromScratch.id]: flowL2SetupFromScratch,
};

/**
 * The beat `run.ts` is in before any step has named one.
 *
 * A flow whose first step carries no `beat` records its opening steps under this
 * label, which then counts as a beat the episode never declared. Naming it here
 * rather than repeating the literal keeps the two in step.
 */
export const IMPLICIT_FIRST_BEAT = 'open';

/**
 * @public Look up a flow, or fail naming what can actually be recorded.
 */
export const getFlow = (id: string): DemoFlow => {
  const flow = FLOWS[id];

  if (flow === undefined) {
    const known = Object.keys(FLOWS).sort().join(', ');

    throw new Error(
      `episode '${id}' has no flow. Recordable episodes: ${known || '(none)'}`,
    );
  }

  return flow;
};

/**
 * @public The flow's beats, in the order the recording enters them.
 *
 * This is the recorder's own rule, not a reimplementation of it: `run.ts` holds
 * one `beat` variable, starts it at `'open'` and updates it with
 * `beat = step.beat ?? beat`, so a step without a `beat` continues the previous
 * one and a repeated label does not open a second beat.
 *
 * It matters because `assemble/timeline.ts` aligns narration to picture by
 * INDEX against this list — `planTimeline` warns when the captured beat count
 * and the episode's beat count disagree, and then maps cues past the mismatch
 * anyway, which is guesswork. A test over this function turns that
 * after-the-take warning into a red build.
 */
export const flowBeats = (flow: DemoFlow): readonly string[] => {
  const seen = new Set<string>();
  const order: string[] = [];
  // Starting here rather than at the first step's label is what makes the
  // implicit beat visible: a flow whose opening step carries no `beat` records
  // under `open`, and `open` then shows up in this list as the extra beat it is.
  let current = IMPLICIT_FIRST_BEAT;

  for (const step of flow.steps) {
    current = step.beat ?? current;

    if (!seen.has(current)) {
      seen.add(current);
      order.push(current);
    }
  }

  return order;
};
