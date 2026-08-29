/**
 * @description Region-of-interest coordinate space.
 *
 * Playwright reports `boundingBox()` in CSS pixels of the page's own viewport.
 * The assembler, however, crops FRAMES: `assemble/timeline.ts` `cropPath` clamps
 * region centres against `manifest.width`/`manifest.height`, which are the frame
 * dimensions. The two spaces coincided only by accident — the landscape viewport
 * (1920x1080) happens to equal its captured frame size.
 *
 * The portrait pass breaks that accident on purpose: it lays out at 540x960 CSS
 * pixels and captures 1080x1920. So sampled regions are converted to frame pixels
 * here, at the point of measurement, and the manifest records frame dimensions.
 * Everything downstream then works in one space.
 */

import type { Viewport } from './format';
import type { RegionSample } from './types';

export interface BoundingBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Scale a CSS-pixel bounding box into the captured frame's pixel space.
 *
 * Identity when the capture matches the viewport (every landscape recording), so
 * existing manifests are unchanged.
 */
export const toFramePixels = (
  box: BoundingBox,
  viewport: Viewport,
  capture: Viewport,
): BoundingBox => {
  const scaleX = capture.width / viewport.width;
  const scaleY = capture.height / viewport.height;

  return {
    height: box.height * scaleY,
    width: box.width * scaleX,
    x: box.x * scaleX,
    y: box.y * scaleY,
  };
};

/** `toFramePixels`, carrying the sample's beat and timestamp through. */
export const toRegionSample = (
  box: BoundingBox,
  meta: { readonly atSeconds: number; readonly beat: string },
  viewport: Viewport,
  capture: Viewport,
): RegionSample => {
  const scaled = toFramePixels(box, viewport, capture);

  return {
    atSeconds: meta.atSeconds,
    beat: meta.beat,
    height: scaled.height,
    width: scaled.width,
    x: scaled.x,
    y: scaled.y,
  };
};
