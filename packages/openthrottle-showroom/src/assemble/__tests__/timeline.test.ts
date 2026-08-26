/**
 * @description Cue-to-beat mapping, which is the part of the assembly stage that
 * can be wrong without anything failing.
 *
 * The old rule was positional: Nth narration beat to Nth flow beat. A flow beat
 * the script had no line for consumed the slot, and every beat after it inherited
 * the previous beat's line. Video 05 shipped a take where "and there it is, in the
 * dashboard" played five seconds before the dashboard appeared — nothing errored,
 * the video was just wrong.
 *
 * These tests exist so that class of failure has to get past an assertion.
 */

import { describe, expect, test } from 'vitest';

import { beatIndexForCue, beatSeconds, planTimeline } from '../timeline';
import type { NarrationTimings, SegmentTiming } from '../../narrate/types';
import type { ManifestStep, RecordingManifest } from '../../runner/types';

const BEATS = ['0:00', '0:09', '0:15', '0:24'];

const step = (beat: string, tStart: number, tEnd: number): ManifestStep => ({
  beat,
  kind: 'dwell',
  narrationCue: '',
  tEnd,
  tStart,
});

const manifest = (steps: readonly ManifestStep[]): RecordingManifest => ({
  flowId: 'fixture',
  fps: 30,
  frames: 0,
  height: 1080,
  portraitStrategy: 'crop',
  regionOfInterest: {},
  regions: [],
  steps,
  wallSeconds: 0,
  width: 1920,
});

const segment = (beat: string, durationSeconds: number): SegmentTiming => ({
  beat,
  durationSeconds,
  endSeconds: 0,
  file: 'x.wav',
  index: 0,
  startSeconds: 0,
  written: 'words',
});

const timings = (segments: readonly SegmentTiming[]): NarrationTimings => ({
  backend: 'fixture',
  integratedLufsTarget: -14,
  segments,
  slug: 'fixture',
  totalSeconds: 0,
  variant: 'only',
  voice: 'fixture',
});

describe('beatSeconds', () => {
  test('reads mm:ss', () => {
    expect(beatSeconds('0:00')).toBe(0);
    expect(beatSeconds('0:44')).toBe(44);
    expect(beatSeconds('10:05')).toBe(605);
  });
});

describe('beatIndexForCue', () => {
  test('a cue exactly on a beat belongs to that beat', () => {
    expect(beatIndexForCue(BEATS, '0:09')).toBe(1);
  });

  test('a cue between beats belongs to the one that has started', () => {
    // This is the whole point: a variant may speak at 0:11 even though no beat
    // starts there, because a variant owns its own timings.
    expect(beatIndexForCue(BEATS, '0:11')).toBe(1);
    // 0:23 is past the 0:15 beat, so it belongs to that one — index 2, not 1.
    expect(beatIndexForCue(BEATS, '0:23')).toBe(2);
    expect(beatIndexForCue(BEATS, '0:24')).toBe(3);
  });

  test('a cue after the last beat belongs to the last beat', () => {
    expect(beatIndexForCue(BEATS, '9:99')).toBe(3);
  });

  test('a cue before the first beat is rejected rather than absorbed', () => {
    expect(beatIndexForCue(['0:05', '0:10'], '0:01')).toBe(-1);
  });
});

describe('planTimeline', () => {
  test('holds a beat whose narration outruns its picture', () => {
    const plans = planTimeline(
      manifest([step('a', 0, 2), step('b', 2, 4)]),
      timings([segment('0:00', 1), segment('0:09', 6)]),
      ['0:00', '0:09'],
    );

    expect(plans[0]?.extendSeconds).toBe(0);
    expect(plans[1]?.extendSeconds).toBe(4);
  });

  test('a silent beat is silent — it does not inherit the next beat’s line', () => {
    // The exact failure the positional rule produced. Beat 'b' has no cue; under
    // positional matching it took the 0:15 line and everything shifted early.
    const plans = planTimeline(
      manifest([step('a', 0, 2), step('b', 2, 4), step('c', 4, 6)]),
      timings([segment('0:00', 1), segment('0:15', 5)]),
      ['0:00', '0:09', '0:15'],
    );

    expect(plans[0]?.audioSeconds).toBe(1);
    expect(plans[1]?.audioSeconds).toBe(0);
    expect(plans[2]?.audioSeconds).toBe(5);
  });

  test('several cues inside one beat accumulate onto that beat', () => {
    const plans = planTimeline(
      manifest([step('a', 0, 2), step('b', 2, 4)]),
      timings([segment('0:09', 2), segment('0:11', 3)]),
      ['0:00', '0:09'],
    );

    expect(plans[0]?.audioSeconds).toBe(0);
    expect(plans[1]?.audioSeconds).toBe(5);
  });

  test('each hold pushes every later beat later', () => {
    const plans = planTimeline(
      manifest([step('a', 0, 1), step('b', 1, 2), step('c', 2, 3)]),
      timings([segment('0:00', 4), segment('0:09', 1)]),
      ['0:00', '0:09', '0:15'],
    );

    expect(plans[0]?.narrationStart).toBe(0);
    // Beat a held 3 extra seconds, so b starts 3 later than its captured 1s.
    expect(plans[1]?.narrationStart).toBe(4);
    expect(plans[2]?.narrationStart).toBe(5);
  });

  test('a beat with no captured span contributes nothing rather than throwing', () => {
    const plans = planTimeline(manifest([]), timings([segment('0:00', 3)]), [
      '0:00',
    ]);

    expect(plans).toEqual([]);
  });
});
