import { describe, expect, test } from 'vitest';

import { toFramePixels, toRegionSample } from '../regions';

/**
 * The bug these guard: `assemble/timeline.ts` `cropPath` clamps region centres
 * against `manifest.width`/`manifest.height`, which are FRAME dimensions, while
 * Playwright reports bounding boxes in CSS pixels. Those two spaces were only ever
 * equal by accident — the landscape viewport happens to match its frame size — and
 * the portrait pass breaks that accident on purpose.
 */
describe('toFramePixels', () => {
  test('is the identity when the capture matches the viewport, so landscape manifests are unchanged', () => {
    const viewport = { height: 1080, width: 1920 };
    const box = { height: 240, width: 640, x: 100, y: 200 };

    expect(toFramePixels(box, viewport, viewport)).toStrictEqual(box);
  });

  test('doubles a box captured at 1080x1920 from the 540x960 portrait viewport', () => {
    expect(
      toFramePixels(
        { height: 300, width: 500, x: 20, y: 40 },
        { height: 960, width: 540 },
        { height: 1920, width: 1080 },
      ),
    ).toStrictEqual({ height: 600, width: 1000, x: 40, y: 80 });
  });

  test('scales each axis independently, so a non-uniform capture is not silently squared off', () => {
    expect(
      toFramePixels(
        { height: 100, width: 100, x: 10, y: 10 },
        { height: 500, width: 1000 },
        { height: 2000, width: 1000 },
      ),
    ).toStrictEqual({ height: 400, width: 100, x: 10, y: 40 });
  });

  test('keeps a region centre proportional, which is what the crop path actually reads', () => {
    const viewport = { height: 960, width: 540 };
    const capture = { height: 1920, width: 1080 };
    const box = { height: 200, width: 200, x: 170, y: 380 };

    const scaled = toFramePixels(box, viewport, capture);

    expect((scaled.x + scaled.width / 2) / capture.width).toBeCloseTo(
      (box.x + box.width / 2) / viewport.width,
    );
    expect((scaled.y + scaled.height / 2) / capture.height).toBeCloseTo(
      (box.y + box.height / 2) / viewport.height,
    );
  });
});

describe('toRegionSample', () => {
  test('carries the beat and timestamp through unscaled alongside the converted box', () => {
    expect(
      toRegionSample(
        { height: 300, width: 500, x: 20, y: 40 },
        { atSeconds: 12.5, beat: 'plan-detail' },
        { height: 960, width: 540 },
        { height: 1920, width: 1080 },
      ),
    ).toStrictEqual({
      atSeconds: 12.5,
      beat: 'plan-detail',
      height: 600,
      width: 1000,
      x: 40,
      y: 80,
    });
  });
});
