import { describe, expect, it } from 'vitest';

import { createWindowStateStore } from './create-window-state-store.ts';

const memoryFs = (initial: string | undefined) => {
  const files = new Map<string, string>();

  if (initial !== undefined) {
    files.set('/ud/window-state.json', initial);
  }

  return {
    files,
    fs: {
      mkdir: () => {},
      readFile: (path: string) => {
        const contents = files.get(path);

        if (contents === undefined) {
          throw new Error('ENOENT');
        }

        return contents;
      },
      rename: (from: string, to: string) => {
        files.set(to, files.get(from) ?? '');
        files.delete(from);
      },
      writeFile: (path: string, contents: string) => {
        files.set(path, contents);
      },
    },
  };
};

const build = (initial?: string) => {
  const disk = memoryFs(initial);
  const store = createWindowStateStore({
    filePath: '/ud/window-state.json',
    fs: disk.fs,
    tempSuffix: '1',
  });

  return { disk, store };
};

describe('createWindowStateStore', () => {
  it('reads undefined when the file is missing', () => {
    expect(build().store.read()).toBeUndefined();
  });

  it('round-trips a state and leaves no temp file', () => {
    const { disk, store } = build();
    const state = {
      bounds: { height: 700, width: 900, x: 10, y: 20 },
      isMaximized: true,
    };

    expect(store.write(state)).toBe(true);
    expect(store.read()).toEqual(state);
    expect([...disk.files.keys()]).toEqual(['/ud/window-state.json']);
  });

  it.each([
    ['not json', '{nope'],
    ['an array', '[]'],
    ['the wrong version', '{"version":2,"x":0,"y":0,"width":1,"height":1}'],
    ['a zero width', '{"version":1,"x":0,"y":0,"width":0,"height":5}'],
    ['a missing y', '{"version":1,"x":0,"width":5,"height":5}'],
    ['a string x', '{"version":1,"x":"0","y":0,"width":5,"height":5}'],
  ])('reads undefined for %s', (_label, raw) => {
    expect(build(raw).store.read()).toBeUndefined();
  });

  it('reports a failed write', () => {
    const store = createWindowStateStore({
      filePath: '/ud/window-state.json',
      fs: {
        mkdir: () => {},
        readFile: () => '',
        rename: () => {},
        writeFile: () => {
          throw new Error('EROFS');
        },
      },
      tempSuffix: '1',
    });

    expect(
      store.write({
        bounds: { height: 1, width: 1, x: 0, y: 0 },
        isMaximized: false,
      }),
    ).toBe(false);
  });
});
