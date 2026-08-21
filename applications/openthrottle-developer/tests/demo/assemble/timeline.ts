/**
 * @description Align narration to picture, and compute the 9:16 crop path.
 *
 * The rule from the format spec: where a beat's narration runs longer than its
 * on-screen action, **extend the dwell on the last frame of that beat** rather than
 * speeding the picture up. Sped-up picture is the loudest "this was automated" tell
 * there is, and it makes UI unreadable exactly when the narration is explaining it.
 */

import type { NarrationTimings } from '../narrate/types';
import type { RecordingManifest } from '../runner/types';
import type { SafeArea } from '../runner/format';

export interface BeatPlan {
  readonly audioSeconds: number;
  readonly beat: string;
  /** Extra seconds held on the beat's last frame so narration fits. */
  readonly extendSeconds: number;
  readonly narrationStart: number;
  readonly videoEnd: number;
  readonly videoSeconds: number;
  readonly videoStart: number;
}

export interface CropKeyframe {
  readonly atSeconds: number;
  readonly x: number;
  readonly y: number;
}

/** Beats in recording order, with their video span taken from the step manifest. */
const beatSpans = (manifest: RecordingManifest): readonly BeatPlan[] => {
  const order: string[] = [];
  const spans = new Map<string, { end: number; start: number }>();

  for (const step of manifest.steps) {
    const existing = spans.get(step.beat);

    if (existing) {
      spans.set(step.beat, {
        end: Math.max(existing.end, step.tEnd),
        start: existing.start,
      });
      continue;
    }

    order.push(step.beat);
    spans.set(step.beat, { end: step.tEnd, start: step.tStart });
  }

  return order.map((beat) => {
    const span = spans.get(beat) ?? { end: 0, start: 0 };

    return {
      audioSeconds: 0,
      beat,
      extendSeconds: 0,
      narrationStart: span.start,
      videoEnd: span.end,
      videoSeconds: span.end - span.start,
      videoStart: span.start,
    };
  });
};

/**
 * Match narration to beats and work out how much each beat has to be held.
 *
 * Narration beats are the script's `mm:ss` labels; recording beats are the flow's
 * labels. A flow beat with no narration simply gets none — the picture plays at its
 * recorded pace, which is correct for a beat whose job is to show something.
 */
export const planTimeline = (
  manifest: RecordingManifest,
  timings: NarrationTimings,
): readonly BeatPlan[] => {
  const audioByBeat = new Map<string, number>();

  for (const segment of timings.segments) {
    audioByBeat.set(
      segment.beat,
      (audioByBeat.get(segment.beat) ?? 0) + segment.durationSeconds,
    );
  }

  // Narration beats are matched to flow beats in order: the Nth narration beat
  // belongs to the Nth flow beat that has any narration to carry.
  const narrationBeats = [...audioByBeat.keys()];
  const spans = beatSpans(manifest);
  const planned: BeatPlan[] = [];
  let offset = 0;

  for (const [index, span] of spans.entries()) {
    const narrationBeat = narrationBeats[index];
    const audioSeconds =
      narrationBeat === undefined ? 0 : (audioByBeat.get(narrationBeat) ?? 0);
    const extendSeconds = Math.max(0, audioSeconds - span.videoSeconds);

    planned.push({
      audioSeconds,
      beat: span.beat,
      extendSeconds,
      narrationStart: span.videoStart + offset,
      videoEnd: span.videoEnd,
      videoSeconds: span.videoSeconds,
      videoStart: span.videoStart,
    });

    offset += extendSeconds;
  }

  return planned;
};

/**
 * Crop keyframes for the portrait export: the centre of each beat's region of
 * interest, clamped so the crop window stays inside the frame.
 *
 * Y is biased upward by half the bottom safe area, because the Shorts player draws
 * its own UI over the bottom of the frame — content centred vertically ends up
 * partly under the title and action rail.
 */
export const cropPath = (
  manifest: RecordingManifest,
  plans: readonly BeatPlan[],
  cropWidth: number,
  cropHeight: number,
  safeArea: SafeArea,
): readonly CropKeyframe[] => {
  const offsetByBeat = new Map<string, number>();
  let offset = 0;

  for (const plan of plans) {
    offsetByBeat.set(plan.beat, offset);
    offset += plan.extendSeconds;
  }

  const bias = (safeArea.bottom * cropHeight) / 2;
  const maxX = manifest.width - cropWidth;
  const maxY = Math.max(0, manifest.height - cropHeight);

  const keyframes = manifest.regions.map((region) => {
    const centreX = region.x + region.width / 2;
    const centreY = region.y + region.height / 2;

    return {
      atSeconds: region.atSeconds + (offsetByBeat.get(region.beat) ?? 0),
      x: Math.min(Math.max(0, centreX - cropWidth / 2), Math.max(0, maxX)),
      y: Math.min(Math.max(0, centreY - cropHeight / 2 - bias), maxY),
    };
  });

  // Always start from a keyframe at t=0 so the expression is defined everywhere.
  if (keyframes.length === 0 || (keyframes[0]?.atSeconds ?? 0) > 0) {
    const first = keyframes[0];

    keyframes.unshift({
      atSeconds: 0,
      x: first?.x ?? Math.max(0, maxX / 2),
      y: first?.y ?? 0,
    });
  }

  return keyframes;
};

/**
 * Build a piecewise-constant ffmpeg expression from crop keyframes.
 *
 * Constant per beat rather than interpolated on purpose: a crop that slides
 * continuously while the viewer is reading text is nauseating. The crop holds still
 * for a beat and cuts to the next position.
 */
export const cropExpression = (
  keyframes: readonly CropKeyframe[],
  axis: 'x' | 'y',
): string => {
  const first = keyframes[0];

  if (!first) {
    return '0';
  }

  let expression = String(Math.round(first[axis]));

  for (const keyframe of keyframes.slice(1)) {
    expression = `if(gte(t,${keyframe.atSeconds.toFixed(3)}),${String(Math.round(keyframe[axis]))},${expression})`;
  }

  return expression;
};
