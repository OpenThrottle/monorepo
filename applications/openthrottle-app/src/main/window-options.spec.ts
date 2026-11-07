import { describe, expect, it } from 'vitest';

import { buildWindowOptions } from './window-options.ts';

describe('buildWindowOptions', () => {
  const options = buildWindowOptions(
    '/app/out/preload/preload.cjs',
    undefined,
    undefined,
  );

  it('sandboxes the renderer', () => {
    expect(options.webPreferences).toMatchObject({
      allowRunningInsecureContent: false,
      contextIsolation: true,
      experimentalFeatures: false,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    });
  });

  it('points the preload at the given path', () => {
    expect(options.webPreferences?.preload).toBe(
      '/app/out/preload/preload.cjs',
    );
  });

  it('uses the default session without a partition', () => {
    expect(options.webPreferences).not.toHaveProperty('partition');
  });

  it('puts the app window on the given partition', () => {
    const partitioned = buildWindowOptions(
      '/p.cjs',
      'persist:ot-abc',
      undefined,
    );

    expect(partitioned.webPreferences?.partition).toBe('persist:ot-abc');
  });

  it('overrides the default size and position with restored bounds', () => {
    const restored = buildWindowOptions('/p.cjs', undefined, {
      height: 500,
      width: 700,
      x: 30,
      y: 40,
    });

    expect(restored).toMatchObject({ height: 500, width: 700, x: 30, y: 40 });
  });

  it('keeps the default size when there are no bounds', () => {
    expect(options).toMatchObject({ height: 800, width: 1280 });
    expect(options).not.toHaveProperty('x');
  });
});
