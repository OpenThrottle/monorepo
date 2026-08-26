#!/usr/bin/env node

/**
 * @description Validate every episode against the format spec.
 *
 *   pnpm nx run openthrottle-showroom:video-validate
 *
 * Replaces `scripts/validate-video-scripts.ts`, which parsed markdown front
 * matter and **rewrote `spokenWords` back into the file it had just read**. There
 * is nothing to rewrite now: word counts, spoken seconds and budget headroom are
 * computed from the episode, so there is also no `--check` mode to maintain.
 *
 * Prints the same per-episode table the old validator did — word count, estimated
 * speech, budget — computed fresh rather than read from a field that could be
 * stale.
 *
 * Exit code is 1 when any finding is blocking: an `error`, or a `publish`-severity
 * finding on an episode that claims to be `ready` or `published`. Drift on a draft
 * is reported and does not fail, which is what keeps the gate switched on.
 */

import {
  budgetWords,
  estimatedSpokenSeconds,
  spokenWords,
} from '../episodes/derived';
import { episodesInReleaseOrder } from '../episodes/registry';
import { isBlocking, validateSeason } from './rules';

const run = (): void => {
  const episodes = episodesInReleaseOrder();

  if (episodes.length === 0) {
    console.error('validate: no episodes registered');
    process.exit(1);
  }

  for (const episode of episodes) {
    const variant =
      episode.variants.find(
        (candidate) => candidate.id === episode.selectedVariant,
      ) ?? episode.variants[0];

    if (!variant) {
      continue;
    }

    const words = spokenWords(variant);
    const extra =
      episode.variants.length > 1
        ? ` (+${String(episode.variants.length - 1)} variant(s))`
        : '';

    console.log(
      `  ${episode.id.padEnd(30)} ${String(words).padStart(4)} words  ~${String(estimatedSpokenSeconds(variant)).padStart(3)}s  (budget ${String(budgetWords(episode.format))})${extra}`,
    );
  }

  const findings = validateSeason(episodes);
  const blocking: string[] = [];
  const advisory: string[] = [];

  for (const finding of findings) {
    const episode = episodes.find(
      (candidate) => candidate.id === finding.episodeId,
    );
    const where =
      finding.variantId === undefined
        ? finding.episodeId
        : `${finding.episodeId}/${finding.variantId}`;
    const line = `${where}: [${finding.rule}] ${finding.message}`;

    if (isBlocking(finding, episode)) {
      blocking.push(line);
      continue;
    }

    advisory.push(line);
  }

  if (advisory.length > 0) {
    console.warn(
      `\nvalidate: ${String(advisory.length)} convention issue(s) on drafts — these become errors when the episode is marked ready:`,
    );

    for (const line of advisory) {
      console.warn(`  ${line}`);
    }
  }

  if (blocking.length > 0) {
    console.error(`\nvalidate: ${String(blocking.length)} error(s):`);

    for (const line of blocking) {
      console.error(`  ${line}`);
    }

    process.exit(1);
  }

  console.log(
    `\nvalidate: OK (${String(episodes.length)} episode(s), ${String(advisory.length)} advisory)`,
  );
};

run();
