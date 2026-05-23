import { describe, expect, it } from 'vitest';

import {
  createVitestConfig,
  createVitestConfigJsdom,
  createVitestConfigNode,
  getDirname,
} from '@tools/dotfiles/vitest-config';

import {
  createVitestConfigHappyDom,
  createVitestConfig as createVitestConfigFromMain,
  getDirname as getDirnameFromMain,
} from '@tools/dotfiles';

describe('@tools/dotfiles vitest-config package resolution', () => {
  it('imports vitest helpers from the vitest-config subpath', () => {
    expect(typeof createVitestConfig).toBe('function');
    expect(typeof createVitestConfigJsdom).toBe('function');
    expect(typeof createVitestConfigNode).toBe('function');
    expect(typeof getDirname).toBe('function');
  });

  it('imports vitest helpers from the package root entry', () => {
    expect(typeof createVitestConfigFromMain).toBe('function');
    expect(typeof createVitestConfigHappyDom).toBe('function');
    expect(typeof getDirnameFromMain).toBe('function');
  });

  it('loads a default export from createVitestConfigNode without throwing', async () => {
    const config = createVitestConfigNode({
      packagePath: getDirname(import.meta.url),
    });

    const resolved =
      typeof config === 'function'
        ? await config({ command: 'serve', isSsrBuild: false, mode: 'test' })
        : config;

    expect(resolved).toBeDefined();
    // expect(resolved.test?.environment).toBe('node');
  });
});
