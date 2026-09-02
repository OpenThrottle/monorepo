/**
 * @description Turn three record-time surprises into build-time failures.
 *
 * Each of these is today discovered by a person, after work:
 *
 * - **A flowless episode** is invisible until someone runs `run.ts --flow <id>`
 *   and it exits saying the module does not exist.
 * - **A flow with more or fewer beats than its episode** is invisible until
 *   assembly, where `planTimeline` prints a warning and then maps narration cues
 *   past the mismatch anyway. That is a whole-video defect found after a take.
 * - **A region of interest keyed to a beat nobody labels** is invisible until
 *   `run.ts` reports it unresolved at the end of a recording, and the portrait
 *   crop silently falls back to centre framing.
 *
 * A note on the beat rule, because the package's own docs are behind here.
 * `AGENTS.md` still says narration beats match flow beats POSITIONALLY, and that
 * an extra flow beat shifts every later beat's narration one beat early. That
 * stopped being true when `beatIndexForCue` landed — cues now find their beat by
 * their own time, precisely so a stray beat cannot shift the track. What survives
 * is the weaker but still load-bearing invariant this file tests: the captured
 * beats and the declared beats are index-aligned, because `planTimeline` looks up
 * a beat's audio budget BY INDEX. Get the count wrong and every beat after the
 * divergence is held for the wrong duration.
 */

import { describe, expect, test } from 'vitest';

import { EPISODES } from '../registry';
import { FLOWS, flowBeats, getFlow } from '../flows';

const episodes = Object.values(EPISODES);

describe('the flow registry', () => {
  test('every registered flow records a registered episode', () => {
    for (const [key, flow] of Object.entries(FLOWS)) {
      expect(
        EPISODES[key],
        `flow '${key}' records no registered episode`,
      ).toBeDefined();
      expect(
        flow.id,
        `flow registered under '${key}' calls itself '${flow.id}'. One slug names the module directory, the flow and the output directory; two names means the recorder writes somewhere nobody looks.`,
      ).toBe(key);
    }
  });

  test('getFlow names what can be recorded when the flow is missing', () => {
    expect(() => getFlow('06-prd-to-plan')).toThrow(
      /episode '06-prd-to-plan' has no flow/,
    );
    expect(() => getFlow('06-prd-to-plan')).toThrow(/Recordable episodes:/);
  });
});

/**
 * Episodes the recordability audit cleared to film, whose flow is not written
 * yet. Every one of these is `recordable` in RECORDABILITY.md — none is waiting
 * on the app, so none has an honest `blockedOn` to offer, and blocking them to
 * make this file green would be a lie told to a test.
 *
 * This is a RATCHET, not a config. An id leaves when its flow lands and may
 * never be added: a NEW episode with neither a flow nor a stated blocker fails
 * immediately, which is the whole point of the gate. The second test below is
 * what makes that true — it fails if an entry here has already been satisfied,
 * so the list cannot quietly outlive the work.
 */
const AWAITING_FLOW: readonly string[] = [
  '02-one-command-boot',
  '04-mental-model',
  '11-ralph-one-task',
  '12-watch-run-live',
  '13-plan-id-traceability',
  '22-self-host-docker-compose',
  'L2-setup-from-scratch',
];

describe('every episode is either recordable or honestly blocked', () => {
  /**
   * The plan's definition of done, as a test. An episode with neither a flow nor
   * a stated blocker is the one state nobody can act on: it looks ready and is
   * not, and the reason it is not lives only in whoever last tried to film it.
   */
  test.each(episodes.map((episode) => episode.id))('%s', (id) => {
    const episode = EPISODES[id];
    const hasFlow = FLOWS[id] !== undefined;
    const blockers = episode?.production.blockedOn ?? [];
    const excused = AWAITING_FLOW.includes(id);

    expect(
      hasFlow || blockers.length > 0 || excused,
      `'${id}' has no flow.ts and an empty production.blockedOn. Either author the flow, or say what in the app stops you — see RECORDABILITY.md for how the existing blockers were established. An episode in neither state is a video nobody can either make or explain.`,
    ).toBe(true);
  });

  test('the awaiting-flow list only holds episodes that are still waiting', () => {
    const stale = AWAITING_FLOW.filter(
      (id) =>
        FLOWS[id] !== undefined ||
        (EPISODES[id]?.production.blockedOn.length ?? 0) > 0,
    );

    expect(
      stale,
      `AWAITING_FLOW still excuses episode(s) that no longer need excusing: ${stale.join(', ')}. Delete them — an excuse that outlives the work is how a ratchet turns back into a config file.`,
    ).toEqual([]);

    const unknown = AWAITING_FLOW.filter((id) => EPISODES[id] === undefined);

    expect(
      unknown,
      `AWAITING_FLOW names unregistered episode(s): ${unknown.join(', ')}`,
    ).toEqual([]);
  });
});

describe('a flow transcribes its episode beat for beat', () => {
  const recordable = Object.values(FLOWS);

  test('there is at least one flow to check', () => {
    expect(recordable.length).toBeGreaterThan(0);
  });

  /**
   * The outro card is the one beat a flow never records. `assemble/master.ts`
   * appends it — "identical on every video, appended rather than composited" —
   * so it is picture the recorder never sees, and every episode ends with it.
   */
  test.each(episodes.map((episode) => episode.id))(
    '%s ends on the outro card the assembler appends',
    (id) => {
      const beats = EPISODES[id]?.beats ?? [];

      expect(beats[beats.length - 1]?.action, id).toBe('Outro card.');
    },
  );

  test.each(recordable.map((flow) => flow.id))(
    '%s captures as many beats as its episode declares',
    (id) => {
      const declared = (EPISODES[id]?.beats.length ?? 0) - 1;
      const beats = flowBeats(getFlow(id));

      expect(
        beats.length,
        `'${id}' records ${String(beats.length)} beat(s) — ${beats.join(', ')} — but its episode declares ${String(declared)} before the outro. ` +
          "planTimeline resolves each beat's narration budget BY INDEX against the episode beat list, so a count mismatch mis-holds every beat after the divergence. " +
          'If the flow needs a step the episode does not describe, the episode is what is wrong (AGENTS.md).',
      ).toBe(declared);
    },
  );

  test.each(recordable.map((flow) => flow.id))(
    '%s labels every beat it declares a region for',
    (id) => {
      const flow = getFlow(id);
      const labelled = new Set(flowBeats(flow));
      const regions = Object.keys(flow.regionOfInterest ?? {});
      const orphaned = regions.filter((beat) => !labelled.has(beat));

      expect(
        orphaned,
        `'${id}' declares a region of interest for beat(s) no step labels: ${orphaned.join(', ')}. ` +
          'run.ts only samples a region when it enters that beat, so these are never measured and the portrait crop falls back to centre framing — which is the framing the region existed to avoid.',
      ).toEqual([]);
    },
  );
});
