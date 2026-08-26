/**
 * @description The episode registry — one place that knows what episodes exist.
 *
 * Explicit imports, not a filesystem glob. A glob is not typecheckable, resolves
 * at runtime rather than at build, and turns "that episode does not exist" into a
 * surprise at record time. The index costs one line per episode.
 *
 * This replaces four separate "missing front matter" error paths: the validator,
 * the TTS stage and the assembler each had their own way of failing on a script
 * they could not read, and none of them told you what they *could* read.
 */

import { episode as ep01WhatIsOpenthrottle } from './01-what-is-openthrottle/episode';
import { episode as ep02OneCommandBoot } from './02-one-command-boot/episode';
import { episode as ep03FirstPlan } from './03-first-plan/episode';
import { episode as ep04MentalModel } from './04-mental-model/episode';
import { episode as ep05ConnectOtMcp } from './05-connect-ot-mcp/episode';
import { episode as ep06PrdToPlan } from './06-prd-to-plan/episode';
import { episode as ep07SemanticSearch } from './07-semantic-search/episode';
import { episode as ep08PromoteTask } from './08-promote-task/episode';
import { episode as ep09TagsAndRules } from './09-tags-and-rules/episode';
import { episode as ep10Notes } from './10-notes/episode';
import { episode as ep11RalphOneTask } from './11-ralph-one-task/episode';
import { episode as ep12WatchRunLive } from './12-watch-run-live/episode';
import { episode as ep13PlanIdTraceability } from './13-plan-id-traceability/episode';
import { episode as ep14ScheduledRuns } from './14-scheduled-runs/episode';
import { episode as ep15KillRunawayRun } from './15-kill-runaway-run/episode';
import { episode as ep16Worktrees } from './16-worktrees/episode';
import { episode as ep17ChatAnyCli } from './17-chat-any-cli/episode';
import { episode as ep18OllamaLocalModels } from './18-ollama-local-models/episode';
import { episode as ep19Skills } from './19-skills/episode';
import { episode as ep20Generators } from './20-generators/episode';
import { episode as ep21DashboardTour } from './21-dashboard-tour/episode';
import { episode as ep22SelfHostDockerCompose } from './22-self-host-docker-compose/episode';
import { episode as epL1IdeaToShippedCommit } from './L1-idea-to-shipped-commit/episode';
import { episode as epL2SetupFromScratch } from './L2-setup-from-scratch/episode';
import type { VideoEpisode, Variant } from './types';

/**
 * Every episode, keyed by id — the whole of Season 1.
 */
export const EPISODES: Readonly<Record<string, VideoEpisode>> = {
  [ep01WhatIsOpenthrottle.id]: ep01WhatIsOpenthrottle,
  [ep02OneCommandBoot.id]: ep02OneCommandBoot,
  [ep03FirstPlan.id]: ep03FirstPlan,
  [ep04MentalModel.id]: ep04MentalModel,
  [ep05ConnectOtMcp.id]: ep05ConnectOtMcp,
  [ep06PrdToPlan.id]: ep06PrdToPlan,
  [ep07SemanticSearch.id]: ep07SemanticSearch,
  [ep08PromoteTask.id]: ep08PromoteTask,
  [ep09TagsAndRules.id]: ep09TagsAndRules,
  [ep10Notes.id]: ep10Notes,
  [ep11RalphOneTask.id]: ep11RalphOneTask,
  [ep12WatchRunLive.id]: ep12WatchRunLive,
  [ep13PlanIdTraceability.id]: ep13PlanIdTraceability,
  [ep14ScheduledRuns.id]: ep14ScheduledRuns,
  [ep15KillRunawayRun.id]: ep15KillRunawayRun,
  [ep16Worktrees.id]: ep16Worktrees,
  [ep17ChatAnyCli.id]: ep17ChatAnyCli,
  [ep18OllamaLocalModels.id]: ep18OllamaLocalModels,
  [ep19Skills.id]: ep19Skills,
  [ep20Generators.id]: ep20Generators,
  [ep21DashboardTour.id]: ep21DashboardTour,
  [ep22SelfHostDockerCompose.id]: ep22SelfHostDockerCompose,
  [epL1IdeaToShippedCommit.id]: epL1IdeaToShippedCommit,
  [epL2SetupFromScratch.id]: epL2SetupFromScratch,
};

const knownIds = (): string => {
  const ids = Object.keys(EPISODES).sort();

  return ids.length === 0 ? '(none registered yet)' : ids.join(', ');
};

/**
 * @public Look up an episode, or fail naming what does exist.
 */
export const getEpisode = (id: string): VideoEpisode => {
  const episode = EPISODES[id];

  if (episode === undefined) {
    throw new Error(`unknown episode '${id}'. Known episodes: ${knownIds()}`);
  }

  return episode;
};

/**
 * @public Resolve a variant against an episode you already hold.
 *
 * Split out from `getVariant` so the selection rule is testable without a
 * populated registry. A test that reimplements the rule in order to check it
 * proves nothing about the rule.
 *
 * Omitting `variantId` is the normal path: an episode names its `selectedVariant`
 * and every stage follows it unless a `--variant` flag says otherwise.
 */
export const resolveVariant = (
  episode: VideoEpisode,
  variantId?: string,
): Variant => {
  const wanted = variantId ?? episode.selectedVariant;
  const variant = episode.variants.find((candidate) => candidate.id === wanted);

  if (variant === undefined) {
    const available = episode.variants
      .map((candidate) => candidate.id)
      .sort()
      .join(', ');

    throw new Error(
      `episode '${episode.id}' has no variant '${wanted}'. Available: ${available}`,
    );
  }

  return variant;
};

/**
 * @public Resolve a variant by episode id, defaulting to the one that ships.
 */
export const getVariant = (id: string, variantId?: string): Variant =>
  resolveVariant(getEpisode(id), variantId);

/**
 * @public Episodes in release order — the order the season ships in.
 *
 * `release.order` is the authority; any human-readable list of the running order
 * is a copy of this and can be wrong.
 */
export const episodesInReleaseOrder = (): readonly VideoEpisode[] =>
  Object.values(EPISODES).sort(
    (left, right) => left.release.order - right.release.order,
  );
