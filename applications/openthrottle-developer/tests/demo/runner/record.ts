/**
 * @description Capture. A CDP screencast to PNG frames, plus an ffmpeg `concat`
 * list carrying each frame's real duration.
 *
 * Why not Playwright's `recordVideo`: it is locked to 25fps VP8 with no knob, and
 * it cannot hold a frame. The task-3 spike measured both
 * (`../spike/README.md`).
 *
 * The timestamps are the whole point. CDP emits a frame only when the page
 * changes, so assembling the frames at a fixed rate would play idle stretches fast
 * and busy stretches slow. Recording each frame's wall-clock timestamp and writing
 * per-frame durations makes the result real time — and makes an intentional dwell
 * one long-duration frame rather than a dropped one.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CDPSession } from 'playwright';

export interface Capture {
  readonly concatPath: string;
  readonly frameCount: () => number;
  readonly framesDir: string;
  readonly start: () => Promise<void>;
  /**
   * @param endedAt Epoch seconds (`Date.now() / 1000`) at which the FLOW ended.
   *
   * Passed in rather than read here, because by the time `stop()` runs the handler
   * may still be flushing queued frames to disk — several seconds of it on a long
   * take — and that teardown is not part of the recording. CDP frame timestamps are
   * epoch seconds too (verified), so the two are directly comparable.
   */
  readonly stop: (endedAt: number) => Promise<void>;
}

export const createCapture = async (
  session: CDPSession,
  outputDir: string,
  size: { readonly height: number; readonly width: number },
): Promise<Capture> => {
  const framesDir = join(outputDir, 'frames');
  rmSync(framesDir, { force: true, recursive: true });
  mkdirSync(framesDir, { recursive: true });

  const frames: { file: string; timestamp: number }[] = [];

  /**
   * Epoch seconds at which the screencast started.
   *
   * The first frame CDP delivers carries the swap time of whatever was ALREADY
   * composited, which is from before the screencast began — on a real take that put
   * three seconds of the login and hydration that precede capture into the opening
   * frame's duration. Every frame timestamp is floored to this.
   */
  let startedAt = 0;

  session.on('Page.screencastFrame', (frame) => {
    const file = `f${String(frames.length + 1).padStart(6, '0')}.png`;
    frames.push({ file, timestamp: frame.metadata.timestamp ?? 0 });
    writeFileSync(join(framesDir, file), Buffer.from(frame.data, 'base64'));
    void session
      .send('Page.screencastFrameAck', { sessionId: frame.sessionId })
      .catch(() => undefined);
  });

  const concatPath = join(outputDir, 'frames.concat');

  return {
    concatPath,
    frameCount: () => frames.length,
    framesDir,
    start: async () => {
      // maxWidth/maxHeight cap the emitted frame at the target resolution. With a
      // deviceScaleFactor of 2 the page renders at twice this size and the frame
      // is downsampled, which is what keeps small UI text crisp at 1080p.
      startedAt = Date.now() / 1_000;
      await session.send('Page.startScreencast', {
        everyNthFrame: 1,
        format: 'png',
        maxHeight: size.height,
        maxWidth: size.width,
      });
    },
    stop: async (endedAt: number) => {
      await session.send('Page.stopScreencast').catch(() => undefined);

      if (frames.length < 2) {
        throw new Error(
          `capture produced ${String(frames.length)} frame(s) — nothing to assemble`,
        );
      }

      const lines: string[] = [];

      const at = (index: number): number =>
        Math.max(frames[index]?.timestamp ?? 0, startedAt);

      for (const [index, frame] of frames.entries()) {
        // The last frame is held until capture stopped, not for a nominal 40ms. A
        // closing `dwell` changes nothing on screen, so CDP emits no frame for it —
        // its whole length lives in the final frame's duration, and defaulting that
        // to one frame time silently threw the last beat's hold away. On a flow that
        // ends by holding on its payoff, that is the most important second in it.
        const next = index + 1 < frames.length ? at(index + 1) : endedAt;
        lines.push(`file 'frames/${frame.file}'`);
        // No minimum: frames arrive as fast as ~16ms during cursor movement, and
        // rounding those up to a frame time inflated a 53s take by three and a half
        // seconds. `at()` already keeps this non-negative.
        lines.push(`duration ${Math.max(next - at(index), 0).toFixed(4)}`);
      }

      // The concat demuxer ignores the FINAL entry's duration and gives that entry the
      // PREVIOUS entry's duration instead. So a single repeated tail frame does not
      // cost one frame time, it costs another whole copy of the closing hold — a
      // three-second hold on the payoff became six, and the picture ran that much
      // longer than the manifest says it does. Since narration is placed at manifest
      // seconds, every second of that is audio drifting ahead of the picture.
      //
      // Repeating twice with a single frame time between them means the ignored final
      // entry inherits 0.04s rather than the hold. Measured: a 2s + 3s list assembles
      // to 5.07s this way, against 8.00s with one repeat.
      const lastFile = frames[frames.length - 1]?.file ?? '';
      lines.push(`file 'frames/${lastFile}'`);
      lines.push('duration 0.0400');
      lines.push(`file 'frames/${lastFile}'`);
      writeFileSync(concatPath, `${lines.join('\n')}\n`, 'utf8');
    },
  };
};
