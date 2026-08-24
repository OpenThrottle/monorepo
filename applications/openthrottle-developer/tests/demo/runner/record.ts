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
  readonly stop: () => Promise<void>;
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
      await session.send('Page.startScreencast', {
        everyNthFrame: 1,
        format: 'png',
        maxHeight: size.height,
        maxWidth: size.width,
      });
    },
    stop: async () => {
      await session.send('Page.stopScreencast').catch(() => undefined);

      if (frames.length < 2) {
        throw new Error(
          `capture produced ${String(frames.length)} frame(s) — nothing to assemble`,
        );
      }

      const lines: string[] = [];

      for (const [index, frame] of frames.entries()) {
        const next = frames[index + 1]?.timestamp ?? frame.timestamp + 0.04;
        lines.push(`file 'frames/${frame.file}'`);
        lines.push(`duration ${(next - frame.timestamp).toFixed(4)}`);
      }

      // The concat demuxer ignores the final entry's duration, so repeat the last
      // frame or the closing dwell is dropped.
      lines.push(`file 'frames/${frames[frames.length - 1]?.file ?? ''}'`);
      writeFileSync(concatPath, `${lines.join('\n')}\n`, 'utf8');
    },
  };
};
