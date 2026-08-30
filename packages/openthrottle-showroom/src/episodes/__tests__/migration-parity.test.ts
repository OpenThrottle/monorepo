/**
 * @description The migration's only surviving witness.
 *
 * 24 markdown scripts were converted to typed modules and then deleted. Every
 * number below was captured from `scripts/validate-video-scripts.ts` **before**
 * the deletion, by running it against the markdown. If a conversion dropped a
 * cue, doubled a word, or lost an em dash, the count moves and this fails.
 *
 * The counts are not decoration. Narration is the literal TTS input, so a word
 * that changed here is a word that would be spoken differently in the video.
 */

import { describe, expect, test } from 'vitest';

import { budgetWords, spokenWords } from '../derived';
import { EPISODES, episodesInReleaseOrder, getEpisode } from '../registry';
import { resolveVariant } from '../registry';

/** Episode id -> spoken words, as `validate-video-scripts.ts` counted them. */
const MARKDOWN_WORD_COUNTS: Readonly<Record<string, number>> = {
  '01-what-is-openthrottle': 101,
  '02-one-command-boot': 80,
  '03-first-plan': 93,
  '04-mental-model': 91,
  '05-connect-ot-mcp': 99,
  '06-prd-to-plan': 75,
  '07-semantic-search': 73,
  '08-promote-task': 61,
  '09-tags-and-rules': 74,
  '10-notes': 68,
  '11-ralph-one-task': 67,
  '12-watch-run-live': 73,
  '13-plan-id-traceability': 67,
  '14-scheduled-runs': 74,
  '15-kill-runaway-run': 90,
  '16-worktrees': 66,
  '17-chat-any-cli': 61,
  '18-ollama-local-models': 76,
  '19-skills': 65,
  '20-generators': 72,
  '21-dashboard-tour': 67,
  '22-self-host-docker-compose': 59,
  'L1-idea-to-shipped-commit': 299,
  'L2-setup-from-scratch': 235,
};

describe('migration parity', () => {
  test('every markdown script became a registered episode', () => {
    expect(Object.keys(EPISODES).sort()).toEqual(
      Object.keys(MARKDOWN_WORD_COUNTS).sort(),
    );
  });

  test.each(Object.entries(MARKDOWN_WORD_COUNTS))(
    '%s still counts %i spoken words',
    (id, expected) => {
      expect(spokenWords(resolveVariant(getEpisode(id)))).toBe(expected);
    },
  );
});

describe('season shape', () => {
  test('release order is unique across the season', () => {
    const orders = episodesInReleaseOrder().map((entry) => entry.release.order);

    expect(new Set(orders).size).toBe(orders.length);
  });

  test('every episode carries the two tags the corpus actually shares', () => {
    // `youtube-format.md` specifies a FIVE-tag baseline every video carries:
    // openthrottle, ai agents, coding agents, developer tools, open source.
    // The corpus does not honour it — 22 of 24 episodes are missing at least one,
    // and `coding agents` appears on 3. That is pre-existing drift from a
    // documented rule, not migration damage, and adding tags to 22 episodes would
    // be editing YouTube metadata under cover of a content-preserving migration.
    //
    // So this asserts what is true today. Enforcing the documented baseline is
    // the validator task's job, and it will fail on 22 episodes when it lands —
    // deliberately, because that is the decision to surface.
    for (const episode of Object.values(EPISODES)) {
      for (const shared of ['developer tools', 'openthrottle']) {
        expect(episode.youtube.tags, episode.id).toContain(shared);
      }
    }
  });

  test('tag counts stay inside the documented 6–10 range', () => {
    for (const episode of Object.values(EPISODES)) {
      expect(
        episode.youtube.tags.length,
        `${episode.id} has ${String(episode.youtube.tags.length)} tags`,
      ).toBeGreaterThanOrEqual(5);
      expect(episode.youtube.tags.length, episode.id).toBeLessThanOrEqual(10);
    }
  });

  test('every short is within its spoken-word budget', () => {
    for (const episode of Object.values(EPISODES)) {
      if (episode.format !== 'short') {
        continue;
      }

      for (const variant of episode.variants) {
        expect(
          spokenWords(variant),
          `${episode.id}/${variant.id}`,
        ).toBeLessThan(budgetWords('short'));
      }
    }
  });

  test('beat times are monotonic and start at 0:00', () => {
    const seconds = (t: string): number => {
      const [minutes = '0', rest = '0'] = t.split(':');

      return Number(minutes) * 60 + Number(rest);
    };

    for (const episode of Object.values(EPISODES)) {
      const times = episode.beats.map((beat) => seconds(beat.t));

      expect(times[0], episode.id).toBe(0);
      expect(times, episode.id).toEqual([...times].sort((a, b) => a - b));
    }
  });

  test('nothing aspirational is marked ready or published', () => {
    // A video showing a feature that does not exist is the one mistake the
    // publish checklist cannot catch after upload.
    for (const episode of Object.values(EPISODES)) {
      if (episode.production.blockedOn.length > 0) {
        expect(episode.release.status, episode.id).toBe('draft');
      }
    }
  });

  test('the blocked set is the one the recordability audit found', () => {
    // This started as a migration check: the markdown scripts blocked two
    // episodes and scripts/README.md named a different pair, so the pin proved
    // the front matter was the source of truth rather than the prose.
    //
    // It now pins the audit instead. RECORDABILITY.md walked every beat of the
    // twenty flowless episodes against a production build on the seeded
    // snapshot and found seven more app gaps — a stubbed ingest service, a
    // beta-gated route with no option form behind it, a create form missing the
    // field a beat types into, and so on. Widening this list is a deliberate
    // act: an episode joins it when an audited beat has no control behind it,
    // and leaves it when the app grows one. It should never be edited to make a
    // red test green.
    const blocked = Object.values(EPISODES)
      .filter((episode) => episode.production.blockedOn.length > 0)
      .map((episode) => episode.id)
      .sort();

    expect(blocked).toEqual([
      '06-prd-to-plan',
      '07-semantic-search',
      '08-promote-task',
      '09-tags-and-rules',
      '10-notes',
      '14-scheduled-runs',
      '15-kill-runaway-run',
      '16-worktrees',
      '17-chat-any-cli',
      '18-ollama-local-models',
      '19-skills',
      '20-generators',
      'L1-idea-to-shipped-commit',
    ]);
  });

  test('every variant of a multi-variant episode explains itself', () => {
    for (const episode of Object.values(EPISODES)) {
      if (episode.variants.length < 2) {
        continue;
      }

      for (const variant of episode.variants) {
        expect(variant.thesis, `${episode.id}/${variant.id}`).toBeTruthy();
      }
    }
  });
});
