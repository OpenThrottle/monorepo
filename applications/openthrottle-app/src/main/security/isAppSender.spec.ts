import { describe, expect, it } from 'vitest';

import { isAppSender } from './isAppSender.ts';

const ORIGIN = 'http://127.0.0.1:5000';

describe('isAppSender', () => {
  it('accepts the top frame on the app origin', () => {
    expect(
      isAppSender({
        appOrigin: ORIGIN,
        frameUrl: `${ORIGIN}/plans/x`,
        isMainFrame: true,
      }),
    ).toBe(true);
  });

  it('rejects subframes', () => {
    expect(
      isAppSender({ appOrigin: ORIGIN, frameUrl: ORIGIN, isMainFrame: false }),
    ).toBe(false);
  });

  it.each([
    'http://127.0.0.1:5001/',
    'https://127.0.0.1:5000/',
    'http://127.0.0.1:5000.evil.test/',
    'file:///app/out/renderer/index.html',
    'data:text/html,hi',
    undefined,
  ])('rejects the frame %s', (frameUrl) => {
    expect(
      isAppSender({ appOrigin: ORIGIN, frameUrl, isMainFrame: true }),
    ).toBe(false);
  });

  it('rejects everything while no app origin is set', () => {
    expect(
      isAppSender({
        appOrigin: undefined,
        frameUrl: ORIGIN,
        isMainFrame: true,
      }),
    ).toBe(false);
  });
});
