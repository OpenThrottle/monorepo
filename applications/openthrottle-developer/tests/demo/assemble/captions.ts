/**
 * @description Captions from the narration timings.
 *
 * Shorts autoplay silently, so burned-in captions are not an accessibility extra —
 * they are how most of the audience receives the narration at all. The `.srt`
 * sidecar goes up with the video for the players that want their own.
 *
 * Cues use the WRITTEN text, not the spoken text: the viewer should read "MCP",
 * not "M C P".
 */

import type { BeatPlan } from './timeline';
import type { NarrationTimings } from '../narrate/types';

export interface Cue {
  readonly endSeconds: number;
  readonly startSeconds: number;
  readonly text: string;
}

/**
 * Place each narration segment on the assembled timeline: segments run back to back
 * inside their beat, and each beat starts where the plan says it does.
 */
export const buildCues = (
  timings: NarrationTimings,
  plans: readonly BeatPlan[],
): readonly Cue[] => {
  const narrationBeats: string[] = [];

  for (const segment of timings.segments) {
    if (!narrationBeats.includes(segment.beat)) {
      narrationBeats.push(segment.beat);
    }
  }

  const startByBeat = new Map<string, number>();
  let fallback = 0;

  for (const [index, beat] of narrationBeats.entries()) {
    const plan = plans[index];

    if (plan) {
      startByBeat.set(beat, plan.narrationStart);
      fallback = plan.narrationStart;
      continue;
    }

    // More narration beats than flow beats: the script and the flow disagree. Do NOT
    // default to 0 — that stacks the tail of the narration on top of the opening,
    // which sounds like two people talking and sums into a clipped mix. Queue it
    // after the last matched beat instead, and say so, because the real fix is in the
    // flow.
    console.warn(
      `captions: warning: narration beat '${beat}' (#${String(index + 1)}) has no matching flow beat — the flow has ${String(plans.length)}. Appending it; add the beat to the flow.`,
    );
    fallback += 1;
    startByBeat.set(beat, fallback);
  }

  const cursorByBeat = new Map<string, number>();
  const cues: Cue[] = [];

  for (const segment of timings.segments) {
    const base = startByBeat.get(segment.beat) ?? 0;
    const cursor = cursorByBeat.get(segment.beat) ?? 0;
    const startSeconds = base + cursor;

    cues.push({
      endSeconds: startSeconds + segment.durationSeconds,
      startSeconds,
      text: segment.written,
    });

    cursorByBeat.set(segment.beat, cursor + segment.durationSeconds);
  }

  return cues;
};

const srtTime = (seconds: number): string => {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  const millis = Math.round((total - Math.floor(total)) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

export const toSrt = (cues: readonly Cue[]): string =>
  `${cues
    .map(
      (cue, index) =>
        `${String(index + 1)}\n${srtTime(cue.startSeconds)} --> ${srtTime(cue.endSeconds)}\n${cue.text}`,
    )
    .join('\n\n')}\n`;
