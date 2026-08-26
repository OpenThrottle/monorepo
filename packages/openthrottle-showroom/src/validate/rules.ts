/**
 * @description The rules that used to be prose, plus the ones `scripts/validate-video-scripts.ts`
 * enforced before it was deleted.
 *
 * Two things it deliberately does NOT do:
 *
 * 1. **Rewrite source.** The old validator counted the narration words and wrote
 *    `spokenWords` back into the markdown it had just read, with a `--check` mode
 *    whose only job was to notice the file and its own field had diverged. Word
 *    counts are computed now, so there is nothing to sync.
 *
 * 2. **Fail everything.** `youtube-format.md` documents a five-tag baseline that
 *    **22 of 24 episodes do not carry**, and long-form chapter lists that neither
 *    L1 nor L2 has. A gate that is red on arrival gets switched off, and then
 *    nothing is enforced at all.
 *
 * So severity is the design. A rule is either:
 *
 * - `error` — structurally wrong for any episode, draft or not. Over budget,
 *   non-monotonic beats, a duplicate release slot, a `selectedVariant` naming
 *   nothing. These fail the gate today.
 * - `publish` — a documented convention that binds when the episode actually
 *   ships. On a `draft` it reports as a warning; on `ready` or `published` it is
 *   an error.
 *
 * That makes the tag baseline enforceable without blocking work on drafts: an
 * episode cannot be marked `ready` until it carries the five tags, which is
 * exactly when the rule matters. The drift stays visible in the meantime rather
 * than being quietly dropped.
 */

import {
  budgetWords,
  estimatedSpokenSeconds,
  spokenWords,
} from '../episodes/derived';
import { loadFormat } from '../runner/format';
import { PLAYLISTS } from '../episodes/types';
import type { VideoEpisode } from '../episodes/types';

/** Grace over the budget before a script fails rather than warns. */
const OVER_BUDGET_TOLERANCE_WORDS = 5;

/**
 * A long-form script whose narration covers less than this fraction of its
 * shortest permitted runtime is an outline, not a script.
 */
const LONGFORM_MIN_NARRATION_COVERAGE = 0.4;

/** Every video carries these, per `youtube-format.md`. */
export const BASELINE_TAGS = [
  'ai agents',
  'coding agents',
  'developer tools',
  'open source',
  'openthrottle',
] as const;

const BEAT_TIME = /^\d{1,2}:\d{2}$/;

/** Clickbait constructions the format explicitly rules out. */
const CLICKBAIT = [
  "you won't believe",
  'you wont believe',
  'shocking',
  'this one trick',
  'nobody talks about',
];

export type Severity = 'error' | 'publish';

export interface Finding {
  readonly episodeId: string;
  readonly message: string;
  readonly rule: string;
  readonly severity: Severity;
  readonly variantId?: string;
}

const seconds = (label: string): number => {
  const [minutes = '0', rest = '0'] = label.split(':');

  return Number(minutes) * 60 + Number(rest);
};

const checkBeats = (episode: VideoEpisode): readonly Finding[] => {
  const findings: Finding[] = [];
  const times = episode.beats.map((beat) => beat.t);

  for (const beat of episode.beats) {
    if (!BEAT_TIME.test(beat.t)) {
      findings.push({
        episodeId: episode.id,
        message: `beat time '${beat.t}' is not mm:ss`,
        rule: 'beat-format',
        severity: 'error',
      });
    }

    if (beat.action.trim().length === 0) {
      findings.push({
        episodeId: episode.id,
        message: `beat ${beat.t} has no action — if you cannot write it as a step, the beat is not yet designed`,
        rule: 'beat-action',
        severity: 'error',
      });
    }
  }

  // Compared as seconds, not as a string: the long-form scripts write `00:00`
  // and the shorts write `0:00`. Both are mm:ss and both mean the start.
  if (times.length > 0 && seconds(times[0] ?? '') !== 0) {
    findings.push({
      episodeId: episode.id,
      message: `first beat is at ${String(times[0])}, not 0:00 — front-load, the payoff is on screen at t=0`,
      rule: 'beat-start',
      severity: 'error',
    });
  }

  const ordered = times.map(seconds);

  for (const [index, value] of ordered.entries()) {
    const previous = ordered[index - 1];

    if (previous !== undefined && value <= previous) {
      findings.push({
        episodeId: episode.id,
        message: `beat times are not monotonic: ${String(times[index - 1])} then ${String(times[index])}`,
        rule: 'beat-order',
        severity: 'error',
      });
    }
  }

  return findings;
};

const checkVariants = (episode: VideoEpisode): readonly Finding[] => {
  const findings: Finding[] = [];
  const budget = budgetWords(episode.format);
  const spec = loadFormat();

  if (
    !episode.variants.some((variant) => variant.id === episode.selectedVariant)
  ) {
    findings.push({
      episodeId: episode.id,
      message: `selectedVariant '${episode.selectedVariant}' names no variant`,
      rule: 'selected-variant',
      severity: 'error',
    });
  }

  // Every variant, not just the one that ships. A variant nobody can use is worth
  // catching while it is being written rather than when it is chosen.
  for (const variant of episode.variants) {
    const words = spokenWords(variant);

    if (words > budget + OVER_BUDGET_TOLERANCE_WORDS) {
      findings.push({
        episodeId: episode.id,
        message: `${String(words)} spoken words over the ${String(budget)}-word budget for a ${episode.format} — cut words, do not speed up the TTS`,
        rule: 'word-budget',
        severity: 'error',
        variantId: variant.id,
      });
    }

    if (episode.variants.length > 1 && !variant.thesis) {
      findings.push({
        episodeId: episode.id,
        message:
          'a variant among several must say why it exists, or nobody can choose between them',
        rule: 'variant-thesis',
        severity: 'error',
        variantId: variant.id,
      });
    }

    const cueTimes = variant.narration.map(([t]) => t);

    for (const [index, cue] of cueTimes.entries()) {
      const previous = cueTimes[index - 1];

      if (previous !== undefined && seconds(cue) < seconds(previous)) {
        findings.push({
          episodeId: episode.id,
          message: `narration cues run backwards: ${previous} then ${cue}`,
          rule: 'cue-order',
          severity: 'error',
          variantId: variant.id,
        });
      }
    }

    if (episode.format === 'longform') {
      const floor =
        (spec.formats.longform.minDurationSeconds ??
          spec.formats.longform.maxDurationSeconds) *
        LONGFORM_MIN_NARRATION_COVERAGE;

      if (estimatedSpokenSeconds(variant) < floor) {
        findings.push({
          episodeId: episode.id,
          message: `~${String(estimatedSpokenSeconds(variant))}s of narration for a ${String(spec.formats.longform.minDurationSeconds ?? 0)}s-minimum video — still an outline; flesh out the narration before recording`,
          rule: 'longform-coverage',
          severity: 'publish',
          variantId: variant.id,
        });
      }
    }
  }

  return findings;
};

const checkYouTube = (episode: VideoEpisode): readonly Finding[] => {
  const findings: Finding[] = [];
  const { chapters, tags, thumbnail, title } = episode.youtube;

  if (title.length > 0 && title === title.toUpperCase()) {
    findings.push({
      episodeId: episode.id,
      message: 'title is all-caps',
      rule: 'title-style',
      severity: 'publish',
    });
  }

  if (/^\p{Extended_Pictographic}/u.test(title)) {
    findings.push({
      episodeId: episode.id,
      message: 'title starts with an emoji',
      rule: 'title-style',
      severity: 'publish',
    });
  }

  for (const pattern of CLICKBAIT) {
    if (title.toLowerCase().includes(pattern)) {
      findings.push({
        episodeId: episode.id,
        message: `title uses the clickbait construction '${pattern}'`,
        rule: 'title-style',
        severity: 'publish',
      });
    }
  }

  const missing = BASELINE_TAGS.filter((tag) => !tags.includes(tag));

  if (missing.length > 0) {
    findings.push({
      episodeId: episode.id,
      message: `missing baseline tag(s): ${missing.join(', ')}`,
      rule: 'tag-baseline',
      severity: 'publish',
    });
  }

  if (tags.length < 6 || tags.length > 10) {
    findings.push({
      episodeId: episode.id,
      message: `${String(tags.length)} tags — the format asks for 6 to 10`,
      rule: 'tag-count',
      severity: 'publish',
    });
  }

  if (!Object.values(PLAYLISTS).includes(episode.release.playlist)) {
    findings.push({
      episodeId: episode.id,
      message: `playlist '${episode.release.playlist}' is not one of the four`,
      rule: 'playlist',
      severity: 'error',
    });
  }

  if (episode.format === 'short' && (chapters?.length ?? 0) > 0) {
    findings.push({
      episodeId: episode.id,
      message: 'a short has chapters — chapters are long-form only',
      rule: 'chapters',
      severity: 'error',
    });
  }

  if (episode.format === 'longform') {
    if ((chapters?.length ?? 0) === 0) {
      findings.push({
        episodeId: episode.id,
        message: 'long-form has no chapter list',
        rule: 'chapters',
        severity: 'publish',
      });
    } else if (chapters?.[0]?.t !== '00:00') {
      findings.push({
        episodeId: episode.id,
        message: `first chapter is at ${String(chapters?.[0]?.t)}, not 00:00`,
        rule: 'chapters',
        severity: 'error',
      });
    }
  }

  if (thumbnail) {
    if (episode.format === 'short') {
      findings.push({
        episodeId: episode.id,
        message:
          'a short has a designed thumbnail — Shorts use a frame from the video, a card reads as an ad',
        rule: 'thumbnail',
        severity: 'error',
      });
    }

    if (thumbnail.words.length > 4) {
      findings.push({
        episodeId: episode.id,
        message: `thumbnail has ${String(thumbnail.words.length)} words — at most four survive the mobile render`,
        rule: 'thumbnail',
        severity: 'error',
      });
    }
  }

  return findings;
};

const checkRelease = (episode: VideoEpisode): readonly Finding[] => {
  const findings: Finding[] = [];
  const shipping =
    episode.release.status === 'ready' ||
    episode.release.status === 'published';

  if (shipping && episode.production.blockedOn.length > 0) {
    findings.push({
      episodeId: episode.id,
      message: `marked '${episode.release.status}' while blocked on: ${episode.production.blockedOn.join('; ')} — a video showing a feature that does not exist is the one mistake the publish checklist cannot catch after upload`,
      rule: 'publish-gate',
      severity: 'error',
    });
  }

  return findings;
};

/**
 * @public Validate one episode in isolation.
 */
export const validateEpisode = (episode: VideoEpisode): readonly Finding[] => [
  ...checkBeats(episode),
  ...checkVariants(episode),
  ...checkYouTube(episode),
  ...checkRelease(episode),
];

/**
 * @public Validate the whole season, including the rules that are only visible
 * across episodes.
 */
export const validateSeason = (
  episodes: readonly VideoEpisode[],
): readonly Finding[] => {
  const findings = episodes.flatMap((episode) => validateEpisode(episode));
  const byOrder = new Map<number, string[]>();

  for (const episode of episodes) {
    byOrder.set(episode.release.order, [
      ...(byOrder.get(episode.release.order) ?? []),
      episode.id,
    ]);
  }

  for (const [order, ids] of byOrder) {
    if (ids.length > 1) {
      findings.push({
        episodeId: ids.sort().join(', '),
        message: `release slot ${String(order)} is claimed by ${String(ids.length)} episodes`,
        rule: 'release-order',
        severity: 'error',
      });
    }
  }

  return findings;
};

/**
 * @public Whether a finding fails the gate for the episode it belongs to.
 *
 * `error` always fails. `publish` fails only once the episode claims to be
 * shippable — which is the moment the documented conventions stop being advice.
 */
export const isBlocking = (
  finding: Finding,
  episode: VideoEpisode | undefined,
): boolean => {
  if (finding.severity === 'error') {
    return true;
  }

  return (
    episode?.release.status === 'ready' ||
    episode?.release.status === 'published'
  );
};
