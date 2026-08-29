import { describe, expect, test } from 'vitest';

import { loadFormat } from '../format';

/**
 * The app's mobile breakpoint, mirrored from `MOBILE_BREAKPOINT` in
 * `packages/react-router-shadcn/src/hooks/useIsMobile.tsx`. Duplicated rather than
 * imported on purpose: the point of this test is to catch the two drifting apart,
 * and importing the constant would make the assertion vacuous.
 */
const APP_MOBILE_BREAKPOINT = 768;

describe('loadFormat', () => {
  test('exposes a portrait viewport BELOW the app mobile breakpoint', () => {
    const { recording } = loadFormat();

    // Recording the portrait pass at the Short's own 1080 CSS px put the app above
    // this breakpoint: it rendered its desktop layout, sidebar and all, and roughly
    // 60% of the 9:16 frame was empty background. A future edit to format.json that
    // reintroduces a desktop-width portrait capture should fail here rather than in
    // a finished master nobody re-watches.
    expect(recording.portraitViewport.width).toBeLessThan(
      APP_MOBILE_BREAKPOINT,
    );
  });

  test('renders the portrait pass at exactly the Short frame size, so nothing is upscaled', () => {
    const { formats, recording } = loadFormat();

    expect(recording.portraitViewport.width * recording.deviceScaleFactor).toBe(
      formats.short.width,
    );
    expect(
      recording.portraitViewport.height * recording.deviceScaleFactor,
    ).toBe(formats.short.height);
  });

  test('keeps the portrait viewport at the Short aspect ratio', () => {
    const { formats, recording } = loadFormat();

    expect(
      recording.portraitViewport.width / recording.portraitViewport.height,
    ).toBeCloseTo(formats.short.width / formats.short.height);
  });

  test('keeps the landscape viewport equal to the long-form frame, where capture and layout coincide', () => {
    const { formats, recording } = loadFormat();

    expect(recording.viewport).toStrictEqual({
      height: formats.longform.height,
      width: formats.longform.width,
    });
  });
});
